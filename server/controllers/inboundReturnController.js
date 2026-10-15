import InboundReturnOrder from '../models/InboundReturnOrder.js'
import WarehousingOrder from '../models/WarehousingOrder.js'
import PurchaseOrder from '../models/PurchaseOrder.js'
import Payable from '../models/Payable.js'
import pool from '../config/database.js'
import { round4 } from '../utils/round.js'
import {
  PURCHASE_ORDER_KEYS,
  loadContractOrders,
  findItemByProduct,
  findItemForRollback,
  itemsToDeltaMap,
  buildQuantityDeltaMap,
  syncQuantityDeltaToOrders
} from '../utils/contractOrderLookup.js'

export const getAllInboundReturns = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      orderNumber,
      contractNumber,
      supplierName,
      startDate,
      endDate
    } = req.query

    const where = []
    const params = []

    if (orderNumber) {
      where.push('order_number LIKE ?')
      params.push(`%${orderNumber}%`)
    }

    if (contractNumber) {
      where.push('contract_number LIKE ?')
      params.push(`%${contractNumber}%`)
    }

    if (supplierName) {
      where.push('supplier_name LIKE ?')
      params.push(`%${supplierName}%`)
    }

    if (startDate && endDate) {
      where.push('entry_date BETWEEN ? AND ?')
      params.push(startDate, endDate)
    } else if (startDate) {
      where.push('entry_date >= ?')
      params.push(startDate)
    } else if (endDate) {
      where.push('entry_date <= ?')
      params.push(endDate)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await InboundReturnOrder.paginate({
      where: whereClause,
      orderBy: 'entry_date DESC',
      page,
      pageSize,
      params
    })

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getInboundReturnById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await InboundReturnOrder.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: '入库退货单不存在' })
    }
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createInboundReturn = async (req, res) => {
  try {
    const {
      source_order_id,
      source_order_number,
      contract_number,
      supplier_name,
      supplier_code,
      return_items,
      return_time,
      entry_date,
      currency,
      return_person,
      reason,
      remarks
    } = req.body

    if (!return_items || (Array.isArray(return_items) && return_items.length === 0)) {
      return res.status(400).json({ success: false, message: '退货商品不能为空' })
    }

    // 校验退货数量不超过原入库数量
    if (source_order_id) {
      const sourceOrder = await WarehousingOrder.findById(source_order_id)
      if (sourceOrder) {
        const warehousingItems = JSON.parse(sourceOrder.warehousing_items || '[]')
        const parsedReturnItems = typeof return_items === 'string' ? JSON.parse(return_items) : return_items

        for (const returnItem of parsedReturnItems) {
          const sourceItem = warehousingItems.find(wi => wi.product_code === returnItem.product_code)
          if (!sourceItem) {
            return res.status(400).json({
              success: false,
              message: `商品 ${returnItem.product_code} 不在原入库单中`
            })
          }
          if (returnItem.quantity > sourceItem.quantity) {
            return res.status(400).json({
              success: false,
              message: `商品 ${returnItem.product_name || returnItem.product_code} 退货数量(${returnItem.quantity})超过原入库数量(${sourceItem.quantity})`
            })
          }
        }
      }
    }

    // 创建退货单
    const order = await InboundReturnOrder.create({
      source_order_id,
      source_order_number,
      contract_number,
      supplier_name,
      supplier_code,
      return_items,
      return_time,
      entry_date,
      currency,
      return_person,
      reason,
      remarks
    })

    // 扣减产品库存并调整单价（退货给供应商，库存减少，使用移动平均法反向计算）
    const parsedItems = typeof return_items === 'string' ? JSON.parse(return_items) : return_items
    for (const item of parsedItems) {
      if (!item.product_code || !item.quantity) continue
      const [productResult] = await pool.query(
        'SELECT stock, tax_included_price FROM products WHERE product_code = ?',
        [item.product_code]
      )
      if (productResult.length > 0) {
        const currentStock = parseFloat(productResult[0].stock || 0)
        const currentPrice = parseFloat(productResult[0].tax_included_price || 0)
        const returnQty = parseFloat(item.quantity)
        const returnPrice = parseFloat(item.unit_price || item.tax_included_price || 0)
        const newStock = Math.max(0, currentStock - returnQty)

        let newTaxIncludedPrice = currentPrice
        let newTaxExcludedPrice = null

        // 移动平均法反向计算含税单价（退货时调整平均成本）
        if (returnPrice > 0 && currentStock > 0 && newStock > 0) {
          newTaxIncludedPrice = (currentStock * currentPrice - returnQty * returnPrice) / newStock
          // 确保价格不为负
          newTaxIncludedPrice = Math.max(0, newTaxIncludedPrice)
          // 计算未税单价
          if (item.tax_rate) {
            newTaxExcludedPrice = newTaxIncludedPrice / (1 + parseFloat(item.tax_rate) / 100)
          }
        }

        // 更新库存和单价
        if (newTaxExcludedPrice !== null) {
          await pool.query(
            'UPDATE products SET stock = ?, tax_included_price = ?, tax_excluded_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), round4(newTaxIncludedPrice), round4(newTaxExcludedPrice), item.product_code]
          )
        } else {
          await pool.query(
            'UPDATE products SET stock = ?, tax_included_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), round4(newTaxIncludedPrice), item.product_code]
          )
        }
      }
    }

    // 回退采购单入库数量
    // 同一采购合同编号可能对应多张采购订单，回退到实际收过货（入库数量 > 0）的订单
    if (contract_number) {
      const { orders, itemsMap } = await loadContractOrders(PurchaseOrder, contract_number, PURCHASE_ORDER_KEYS)

      if (orders.length > 0) {
        const touchedOrders = new Map()

        for (const returnItem of parsedItems) {
          const match = findItemForRollback(orders, itemsMap, returnItem.product_code, PURCHASE_ORDER_KEYS)
          if (!match) continue

          const currentInbound = match.targetItem.inbound_quantity || 0
          match.targetItem.inbound_quantity = Math.max(0, currentInbound - returnItem.quantity)

          // 更新行状态
          if (match.targetItem.inbound_quantity === 0) {
            match.targetItem.status = 1 // 未入库
          } else if (match.targetItem.inbound_quantity < match.targetItem.quantity) {
            match.targetItem.status = 3 // 已部分入库
          } else if (match.targetItem.inbound_quantity === match.targetItem.quantity) {
            match.targetItem.status = 2 // 已全部入库
          }

          touchedOrders.set(match.order.purchase_order_id, match)
        }

        // 重新计算订单整体状态并更新采购订单
        for (const match of touchedOrders.values()) {
          const statuses = match.items.map(item => item.status || 1)
          let orderStatus = 1
          if (statuses.every(s => s === 2)) {
            orderStatus = 2
          } else if (statuses.some(s => s === 2 || s === 3)) {
            orderStatus = 3
          }

          await PurchaseOrder.update(match.order.purchase_order_id, {
            purchase_items: JSON.stringify(match.items),
            status: orderStatus
          })
        }
      }
    }

    // 删除关联的应付账款记录
    if (source_order_number) {
      try {
        const payable = await Payable.findOne('source_bill_id = ?', [source_order_number])
        if (payable) {
          await Payable.delete(payable.payable_id)
        }
      } catch (payableError) {
        console.error('删除应付账款记录失败:', payableError)
      }
    }

    res.status(201).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateInboundReturn = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await InboundReturnOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '入库退货单不存在' })
    }

    const updateData = {}
    const fields = ['source_order_id', 'source_order_number', 'contract_number', 'supplier_name', 'supplier_code', 'return_items', 'return_time', 'entry_date', 'currency', 'return_person', 'reason', 'remarks']
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    }

    // 如果退货商品发生变化，调整库存
    if (updateData.return_items !== undefined) {
      const oldItems = JSON.parse(existing.return_items || '[]')
      const newItems = typeof updateData.return_items === 'string' ? JSON.parse(updateData.return_items) : updateData.return_items

      const quantityDelta = new Map()
      for (const item of newItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) + parseFloat(item.quantity || 0))
      }
      for (const item of oldItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) - parseFloat(item.quantity || 0))
      }

      for (const [productCode, delta] of quantityDelta) {
        if (delta === 0) continue
        const [productResult] = await pool.query(
          'SELECT stock FROM products WHERE product_code = ?',
          [productCode]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const newStock = Math.max(0, currentStock - delta)
          await pool.query(
            'UPDATE products SET stock = ? WHERE product_code = ?',
            [newStock.toFixed(2), productCode]
          )
        }
      }
    }

    // 同步入库数量到采购订单：退货数量增加 → 订单入库数量减少（差量取反）
    if (updateData.return_items !== undefined || updateData.contract_number !== undefined) {
      try {
        const oldReturnItems = JSON.parse(existing.return_items || '[]')
        const newReturnItems = updateData.return_items !== undefined
          ? (typeof updateData.return_items === 'string' ? JSON.parse(updateData.return_items) : updateData.return_items)
          : oldReturnItems
        const oldContractNumber = existing.contract_number || ''
        const newContractNumber = updateData.contract_number !== undefined ? (updateData.contract_number || '') : oldContractNumber

        if (oldContractNumber !== newContractNumber) {
          // 合同变更：旧合同恢复旧退货明细占用的入库数量，新合同扣减新退货明细
          await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, oldContractNumber, itemsToDeltaMap(oldReturnItems, 1))
          await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, newContractNumber, itemsToDeltaMap(newReturnItems, -1))
        } else {
          // 同一合同：差量同步（退货增加 → 订单入库减少）
          await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, newContractNumber, buildQuantityDeltaMap(oldReturnItems, newReturnItems, -1))
        }
      } catch (syncErr) {
        console.error('同步采购订单入库数量失败（不影响入库退货单更新）:', syncErr.message)
      }
    }

    const order = await InboundReturnOrder.update(id, updateData)
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteInboundReturn = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await InboundReturnOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '入库退货单不存在' })
    }

    // 恢复产品库存并调整单价（使用移动平均法重新计算）
    const returnItems = JSON.parse(existing.return_items || '[]')
    for (const item of returnItems) {
      if (!item.product_code || !item.quantity) continue
      const [productResult] = await pool.query(
        'SELECT stock, tax_included_price FROM products WHERE product_code = ?',
        [item.product_code]
      )
      if (productResult.length > 0) {
        const currentStock = parseFloat(productResult[0].stock || 0)
        const currentPrice = parseFloat(productResult[0].tax_included_price || 0)
        const returnQty = parseFloat(item.quantity)
        const returnPrice = parseFloat(item.unit_price || item.tax_included_price || 0)
        const newStock = currentStock + returnQty

        let newTaxIncludedPrice = currentPrice
        let newTaxExcludedPrice = null

        // 移动平均法重新计算含税单价（恢复退货时重新计算平均成本）
        if (returnPrice > 0 && newStock > 0) {
          newTaxIncludedPrice = (currentStock * currentPrice + returnQty * returnPrice) / newStock
          // 计算未税单价
          if (item.tax_rate) {
            newTaxExcludedPrice = newTaxIncludedPrice / (1 + parseFloat(item.tax_rate) / 100)
          }
        }

        // 更新库存和单价
        if (newTaxExcludedPrice !== null) {
          await pool.query(
            'UPDATE products SET stock = ?, tax_included_price = ?, tax_excluded_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), round4(newTaxIncludedPrice), round4(newTaxExcludedPrice), item.product_code]
          )
        } else {
          await pool.query(
            'UPDATE products SET stock = ?, tax_included_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), round4(newTaxIncludedPrice), item.product_code]
          )
        }
      }
    }

    // 恢复采购单入库数量
    // 同一采购合同编号可能对应多张采购订单，恢复到剩余可入库数量大于 0 的订单
    if (existing.contract_number) {
      const { orders, itemsMap } = await loadContractOrders(PurchaseOrder, existing.contract_number, PURCHASE_ORDER_KEYS)

      if (orders.length > 0) {
        const touchedOrders = new Map()

        for (const returnItem of returnItems) {
          const match = findItemByProduct(orders, itemsMap, returnItem.product_code, PURCHASE_ORDER_KEYS)
          if (!match) continue

          match.targetItem.inbound_quantity = (match.targetItem.inbound_quantity || 0) + returnItem.quantity

          if (match.targetItem.inbound_quantity >= match.targetItem.quantity) {
            match.targetItem.status = 2
          } else if (match.targetItem.inbound_quantity > 0) {
            match.targetItem.status = 3
          }

          touchedOrders.set(match.order.purchase_order_id, match)
        }

        for (const match of touchedOrders.values()) {
          const statuses = match.items.map(item => item.status || 1)
          let orderStatus = 1
          if (statuses.every(s => s === 2)) {
            orderStatus = 2
          } else if (statuses.some(s => s === 2 || s === 3)) {
            orderStatus = 3
          }

          await PurchaseOrder.update(match.order.purchase_order_id, {
            purchase_items: JSON.stringify(match.items),
            status: orderStatus
          })
        }
      }
    }

    await InboundReturnOrder.delete(id)
    res.json({ success: true, message: '入库退货单删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await InboundReturnOrder.generateOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
