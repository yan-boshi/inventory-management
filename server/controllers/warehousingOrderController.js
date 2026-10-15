import WarehousingOrder from '../models/WarehousingOrder.js'
import PurchaseOrder from '../models/PurchaseOrder.js'
import Payable from '../models/Payable.js'
import InboundPlan from '../models/InboundPlan.js'
import pool from '../config/database.js'
import { handleDbError } from '../utils/errorHandler.js'
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
import { INBOUND_PLAN_KEYS, restoreQuantitiesToPlans } from '../utils/planRestore.js'

// 按采购合同编号加载全部采购订单及其明细（同一合同编号可能对应多张采购订单）
const loadContractPurchaseOrders = (contractNumber) =>
  loadContractOrders(PurchaseOrder, contractNumber, PURCHASE_ORDER_KEYS)

// 在该合同下的多张采购订单中查找包含指定商品的明细行
// 优先匹配剩余可入库数量大于 0 的订单，避免把入库数量同步到已全部入库的订单上
const findPoItemByProduct = (orders, itemsMap, productCode, preferPurchaseOrderId) => {
  const match = findItemByProduct(orders, itemsMap, productCode, PURCHASE_ORDER_KEYS, preferPurchaseOrderId)
  if (!match) return null
  return { purchaseOrder: match.order, purchaseItems: match.items, targetItem: match.targetItem }
}

// 删除入库单回退入库数量时，优先回退到入库数量大于 0 的订单（即真正收过货的订单）
const findPoItemForRollback = (orders, itemsMap, productCode) => {
  const match = findItemForRollback(orders, itemsMap, productCode, PURCHASE_ORDER_KEYS)
  if (!match) return null
  return { purchaseOrder: match.order, purchaseItems: match.items, targetItem: match.targetItem }
}

export const getAllWarehousingOrders = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      productName,
      productCode,
      productModel,
      orderNumber,
      contractNumber,
      customerName,
      warehousingDate,
      trackingNumber
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

    if (customerName) {
      where.push('customer_name LIKE ?')
      params.push(`%${customerName}%`)
    }

    if (productName) {
      where.push('warehousing_items LIKE ?')
      params.push(`%${productName}%`)
    }

    if (productCode) {
      where.push('warehousing_items LIKE ?')
      params.push(`%${productCode}%`)
    }

    if (productModel) {
      where.push('warehousing_items LIKE ?')
      params.push(`%${productModel}%`)
    }

    if (warehousingDate) {
      where.push('DATE(warehousing_time) >= ?')
      params.push(warehousingDate)
    }

    if (trackingNumber) {
      where.push('tracking_number LIKE ?')
      params.push(`%${trackingNumber}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await WarehousingOrder.paginate({
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
    const { statusCode, message } = handleDbError(error, '操作入库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getWarehousingOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await WarehousingOrder.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Warehousing order not found' })
    }
    res.json({ success: true, data: order })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作入库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const createWarehousingOrder = async (req, res) => {
  try {
    const {
      contract_number,
      // 前端选择的具体采购订单（同一合同编号可能对应多张采购订单，仅用于定位明细，不入库）
      purchase_order_id,
      warehousing_items,
      warehousing_time,
      entry_date,
      tracking_number,
      customer_name,
      customer_address,
      total_amount,
      currency,
      exchange_rate,
      warehousing_person,
      contact_phone,
      remarks,
      expenses
    } = req.body

    // 如果关联了采购订单，先验证入库数量
    if (contract_number) {
      const { orders, itemsMap } = await loadContractPurchaseOrders(contract_number)
      console.log('找到采购订单:', orders.length > 0 ? orders.map(o => o.order_number).join(', ') : '未找到')

      if (orders.length > 0 && warehousing_items) {
        const parsedWarehousingItems = typeof warehousing_items === 'string'
          ? JSON.parse(warehousing_items)
          : warehousing_items

        // 遍历入库项，验证数量（同一合同下有多张采购订单时，商品只要在其中一张中存在即可）
        for (const warehousingItem of parsedWarehousingItems) {
          const match = findPoItemByProduct(orders, itemsMap, warehousingItem.product_code, purchase_order_id)

          if (!match) {
            return res.status(400).json({
              success: false,
              message: `商品 ${warehousingItem.product_code} 不在采购订单中`
            })
          }

          // 超量校验（暂不启用）
          // const currentInbound = match.targetItem.inbound_quantity || 0
          // const newInbound = currentInbound + warehousingItem.quantity
          // if (newInbound > match.targetItem.quantity) {
          //   return res.status(400).json({
          //     success: false,
          //     message: `商品 ${match.targetItem.product_name} 已超出采购数量，订单数量: ${match.targetItem.quantity}，已入库: ${currentInbound}，本次入库: ${warehousingItem.quantity}`
          //   })
          // }
        }
      }
    }

    // 验证通过后，创建入库单
    const order = await WarehousingOrder.create({
      contract_number,
      warehousing_items,
      warehousing_time,
      entry_date,
      tracking_number,
      customer_name,
      customer_address,
      total_amount,
      currency,
      exchange_rate,
      warehousing_person,
      contact_phone,
      remarks,
      expenses
    })

    // 更新产品库存（含移动平均法计算单价）- 使用锁避免并发问题
    if (warehousing_items) {
      const items = typeof warehousing_items === 'string' ? JSON.parse(warehousing_items) : warehousing_items
      for (const item of items) {
        if (!item.product_code) {
          console.warn('跳过无产品代码的商品:', item)
          continue
        }
        const inQty = parseFloat(item.quantity || 0)
        // 使用 SELECT ... FOR UPDATE 获取行锁，避免并发计算错误
        const [productResult] = await pool.query(
          'SELECT stock, tax_included_price FROM products WHERE product_code = ? FOR UPDATE',
          [item.product_code]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const currentPrice = parseFloat(productResult[0].tax_included_price || 0)
          const newStock = currentStock + inQty

          let newTaxIncludedPrice = currentPrice
          let newTaxExcludedPrice = null

          // 移动平均法计算含税单价
          if (item.tax_included_price && newStock > 0) {
            const incomingPrice = parseFloat(item.tax_included_price)
            newTaxIncludedPrice = (currentStock * currentPrice + inQty * incomingPrice) / newStock
            // 计算未税单价
            if (item.tax_rate) {
              newTaxExcludedPrice = newTaxIncludedPrice / (1 + parseFloat(item.tax_rate) / 100)
            }
          }

          // 更新库存和单价（价格四舍五入保留四位小数）
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
        } else {
          console.warn(`未找到产品代码为 ${item.product_code} 的产品`)
        }
      }
    }

    // 如果关联了采购订单，同步入库数量到采购订单
    if (contract_number) {
      const { orders, itemsMap } = await loadContractPurchaseOrders(contract_number)

      if (orders.length > 0 && warehousing_items) {
        const parsedWarehousingItems = typeof warehousing_items === 'string'
          ? JSON.parse(warehousing_items)
          : warehousing_items

        // 同一合同下可能有多张采购订单，按商品所在的具体订单同步
        const touchedOrders = new Map()

        // 遍历入库项，同步数量
        for (const warehousingItem of parsedWarehousingItems) {
          const match = findPoItemByProduct(orders, itemsMap, warehousingItem.product_code, purchase_order_id)
          if (!match) continue

          // 更新入库数量
          match.targetItem.inbound_quantity = (match.targetItem.inbound_quantity || 0) + warehousingItem.quantity

          // 更新行状态
          if (match.targetItem.inbound_quantity === match.targetItem.quantity) {
            match.targetItem.status = 2 // 已全部入库
          } else if (match.targetItem.inbound_quantity > 0) {
            match.targetItem.status = 3 // 已部分入库
          }

          touchedOrders.set(match.purchaseOrder.purchase_order_id, match)
        }

        // 更新采购订单
        for (const match of touchedOrders.values()) {
          const statuses = match.purchaseItems.map(item => item.status || 1)
          let orderStatus = 1
          if (statuses.every(s => s === 2)) {
            orderStatus = 2 // 全部入库
          } else if (statuses.some(s => s === 2 || s === 3)) {
            orderStatus = 3 // 部分入库
          }

          try {
            await PurchaseOrder.update(match.purchaseOrder.purchase_order_id, {
              purchase_items: JSON.stringify(match.purchaseItems),
              status: orderStatus
            })
          } catch (syncErr) {
            console.error('同步采购订单入库数量失败（不影响入库单创建）:', syncErr.message)
          }
        }

        // 创建应付账款记录
        try {
          const totalAmount = parseFloat(order.total_amount) || 0

          // 获取供应商名称（取本次入库商品所在的采购订单）
          const primaryMatch = touchedOrders.values().next().value
          const supplierName = primaryMatch ? primaryMatch.purchaseOrder.supplier_name : undefined

          await Payable.create({
            supplier_id: primaryMatch ? primaryMatch.purchaseOrder.supplier_code : undefined,
            supplier_name: supplierName,
            source_bill_type: 1, // 入库单
            source_bill_id: order.order_number,
            amount: totalAmount,
            received_amount: 0,
            balance_amount: totalAmount,
            due_date: null,
            status: 0, // 未结算
            warehousing_time: warehousing_time || null
          })
        } catch (payableError) {
          // 应付账款创建失败，不影响入库单创建
          console.error('创建应付账款记录失败:', payableError)
        }
      }
    }

    res.status(201).json({ success: true, data: order })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作入库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const updateWarehousingOrder = async (req, res) => {
  try {
    const { id } = req.params
    const {
      order_number,
      contract_number,
      // 编辑时带入的具体采购订单，用于后端精确定位入库数量同步的目标订单
      purchase_order_id,
      warehousing_items,
      warehousing_time,
      entry_date,
      tracking_number,
      customer_name,
      customer_address,
      total_amount,
      currency,
      exchange_rate,
      warehousing_person,
      contact_phone,
      remarks,
      expenses
    } = req.body

    const existing = await WarehousingOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Warehousing order not found' })
    }

    // 如果入库商品发生变化，同步更新库存
    const oldItems = JSON.parse(existing.warehousing_items || '[]')
    const newItems = warehousing_items !== undefined
      ? (typeof warehousing_items === 'string' ? JSON.parse(warehousing_items) : warehousing_items)
      : oldItems
    if (warehousing_items !== undefined) {

      // 计算每个产品的新旧数量差
      const quantityDelta = new Map()
      for (const item of newItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) + parseFloat(item.quantity || 0))
      }
      for (const item of oldItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) - parseFloat(item.quantity || 0))
      }

      // 更新库存和价格
      for (const [productCode, delta] of quantityDelta) {
        if (delta === 0) continue
        const [productResult] = await pool.query(
          'SELECT stock, tax_included_price FROM products WHERE product_code = ?',
          [productCode]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const newStock = Math.max(0, currentStock + delta)

          // 如果数量增加，使用移动平均法更新价格
          const newItem = newItems.find((i) => i.product_code === productCode)
          let newPrice = parseFloat(productResult[0].tax_included_price || 0)
          let newTaxExcludedPrice = null

          if (delta > 0 && newItem && newItem.tax_included_price && newStock > 0) {
            const currentPrice = parseFloat(productResult[0].tax_included_price || 0)
            const incomingPrice = parseFloat(newItem.tax_included_price)
            newPrice = (currentStock * currentPrice + delta * incomingPrice) / newStock
            if (newItem.tax_rate) {
              newTaxExcludedPrice = newPrice / (1 + parseFloat(newItem.tax_rate) / 100)
            }
          }

          if (newTaxExcludedPrice !== null) {
            await pool.query(
              'UPDATE products SET stock = ?, tax_included_price = ?, tax_excluded_price = ? WHERE product_code = ?',
              [newStock.toFixed(2), round4(newPrice), round4(newTaxExcludedPrice), productCode]
            )
          } else {
            await pool.query(
              'UPDATE products SET stock = ?, tax_included_price = ? WHERE product_code = ?',
              [newStock.toFixed(2), round4(newPrice), productCode]
            )
          }
        }
      }
    }

    // 同步入库数量到采购订单：编辑时不回写会导致订单上的入库数量与单据不一致
    const oldContractNumber = existing.contract_number || ''
    const newContractNumber = contract_number !== undefined ? (contract_number || '') : oldContractNumber
    if (warehousing_items !== undefined || contract_number !== undefined) {
      try {
        if (oldContractNumber !== newContractNumber) {
          // 合同变更：旧合同按旧明细全部回退，新合同按新明细全部累加
          await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, oldContractNumber, itemsToDeltaMap(oldItems, -1))
          await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, newContractNumber, itemsToDeltaMap(newItems, 1), purchase_order_id)
        } else {
          // 同一合同：按新旧明细差量调整
          await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, newContractNumber, buildQuantityDeltaMap(oldItems, newItems), purchase_order_id)
        }
      } catch (syncErr) {
        console.error('同步采购订单入库数量失败（不影响入库单更新）:', syncErr.message)
      }
    }

    const updateData = {}
    if (order_number !== undefined) updateData.order_number = order_number
    if (contract_number !== undefined) updateData.contract_number = contract_number
    if (warehousing_items !== undefined) updateData.warehousing_items = warehousing_items
    if (warehousing_time !== undefined) updateData.warehousing_time = warehousing_time
    if (entry_date !== undefined) updateData.entry_date = entry_date
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number
    if (customer_name !== undefined) updateData.customer_name = customer_name
    if (customer_address !== undefined) updateData.customer_address = customer_address
    if (total_amount !== undefined) updateData.total_amount = total_amount
    if (currency !== undefined) updateData.currency = currency
    if (exchange_rate !== undefined) updateData.exchange_rate = exchange_rate
    if (warehousing_person !== undefined) updateData.warehousing_person = warehousing_person
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone
    if (remarks !== undefined) updateData.remarks = remarks
    if (expenses !== undefined) updateData.expenses = expenses

    const order = await WarehousingOrder.update(id, updateData)

    // 更新对应的应付账款记录
    if (total_amount !== undefined || warehousing_items !== undefined) {
      try {
        const payable = await Payable.findOne('source_bill_id = ?', [existing.order_number])
        if (payable) {
          const newTotalAmount = total_amount !== undefined
            ? parseFloat(total_amount) || 0
            : parseFloat(existing.total_amount) || 0
          const receivedAmount = parseFloat(payable.received_amount) || 0
          const newBalanceAmount = Math.max(0, newTotalAmount - receivedAmount)

          await Payable.update(payable.payable_id, {
            amount: newTotalAmount,
            balance_amount: newBalanceAmount,
            warehousing_time: warehousing_time || existing.warehousing_time || null
          })
        }
      } catch (payableError) {
        console.error('更新应付账款记录失败:', payableError)
      }
    }

    res.json({ success: true, data: order })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作入库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const deleteWarehousingOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await WarehousingOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '入库单不存在' })
    }

    // 可选：把单据商品数量回补到入库计划（按采购合同编号匹配）。
    // 回补失败会阻断删除，此时库中数据未被改动，可原样重试
    let planRestore = null
    const restorePlan = req.query.restorePlan === '1' || req.query.restorePlan === 'true'
    if (restorePlan && existing.contract_number) {
      const docItems = JSON.parse(existing.warehousing_items || '[]')
      planRestore = await restoreQuantitiesToPlans(
        InboundPlan,
        INBOUND_PLAN_KEYS,
        existing.contract_number,
        docItems
      )
    }

    // 如果关联了采购订单，回退出库数量
    if (existing.contract_number) {
      const { orders, itemsMap } = await loadContractPurchaseOrders(existing.contract_number)

      if (orders.length > 0) {
        const warehousingItems = JSON.parse(existing.warehousing_items || '[]')

        // 同一合同下可能有多张采购订单，回退到实际收过货（入库数量 > 0）的订单
        const touchedOrders = new Map()

        // 遍历被删除入库单的商品，回退数量
        for (const warehousingItem of warehousingItems) {
          const match = findPoItemForRollback(orders, itemsMap, warehousingItem.product_code)
          if (!match) continue

          const currentInbound = match.targetItem.inbound_quantity || 0
          const newInbound = Math.max(0, currentInbound - warehousingItem.quantity)

          // 更新入库数量
          match.targetItem.inbound_quantity = newInbound

          // 更新行状态
          if (newInbound === 0) {
            match.targetItem.status = 1 // 未入库
          } else if (newInbound < match.targetItem.quantity) {
            match.targetItem.status = 3 // 已部分入库
          } else if (newInbound === match.targetItem.quantity) {
            match.targetItem.status = 2 // 已全部入库
          }

          touchedOrders.set(match.purchaseOrder.purchase_order_id, match)
        }

        // 更新采购订单
        for (const match of touchedOrders.values()) {
          // 重新计算订单整体状态
          const statuses = match.purchaseItems.map(item => item.status || 1)
          let orderStatus = 1
          if (statuses.every(s => s === 2)) {
            orderStatus = 2 // 全部入库
          } else if (statuses.some(s => s === 2 || s === 3)) {
            orderStatus = 3 // 部分入库
          }

          await PurchaseOrder.update(match.purchaseOrder.purchase_order_id, {
            purchase_items: JSON.stringify(match.purchaseItems),
            status: orderStatus
          })
        }
      }
    }

    // 扣减库存
    if (existing.warehousing_items) {
      try {
        const items = JSON.parse(existing.warehousing_items || '[]')
        for (const item of items) {
          const [productResult] = await pool.query(
            'SELECT stock FROM products WHERE product_code = ?',
            [item.product_code]
          )
          if (productResult.length > 0) {
            const currentStock = parseFloat(productResult[0].stock || 0)
            const newStock = Math.max(0, currentStock - parseFloat(item.quantity || 0))
            await pool.query(
              'UPDATE products SET stock = ? WHERE product_code = ?',
              [newStock.toFixed(2), item.product_code]
            )
          }
        }
      } catch (stockError) {
        // 库存扣减失败，继续执行
      }
    }

    // 删除对应的应付账款记录
    try {
      const payable = await Payable.findOne('source_bill_id = ?', [existing.order_number])
      if (payable) {
        await Payable.delete(payable.payable_id)
      }
    } catch (payableError) {
      // 应付账款删除失败，不影响入库单删除
      console.error('删除应付账款记录失败:', payableError)
    }

    await WarehousingOrder.delete(id)
    res.json({ success: true, message: '入库单删除成功', data: planRestore })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作入库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await WarehousingOrder.getNewOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作入库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getPurchaseOrdersForWarehousing = async (req, res) => {
  try {
    // 获取状态为未入库或已部分入库的采购订单（基于存储的状态字段）
    const [orders] = await pool.query(
      `SELECT * FROM purchase_orders
       WHERE status = '1' OR status = '3'
       ORDER BY created_at DESC`
    )
    // 二次校验：排除实际已全部入库的订单（通过 inbound_quantity 判断）
    const filtered = orders.filter(order => {
      try {
        const items = JSON.parse(order.purchase_items || '[]')
        // 只要有任意商品的未入库数 > 0，则认为可选入库
        return items.some(item => {
          const required = item.quantity || 0
          const inbound = item.inbound_quantity || 0
          return inbound < required
        })
      } catch {
        return true
      }
    })
    res.json({ success: true, data: filtered })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作入库单')
    res.status(statusCode).json({ success: false, message })
  }
}
