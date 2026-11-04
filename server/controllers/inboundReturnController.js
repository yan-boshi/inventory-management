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
import { escapeLike } from '../utils/sql.js'

// 解析明细 JSON（兼容数组/字符串/坏数据）
const parseReturnItems = (returnItems) => {
  try {
    const arr = typeof returnItems === 'string' ? JSON.parse(returnItems) : returnItems
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// 退货明细含税金额：优先明细单价，缺失时回退原入库单单价
const calcReturnAmount = (items, sourceItems = []) => {
  let amount = 0
  for (const it of items) {
    const qty = parseFloat(it.quantity) || 0
    const source = sourceItems.find(si => si.product_code === it.product_code)
    const price = parseFloat(it.unit_price ?? it.tax_included_price ?? source?.tax_included_price ?? 0) || 0
    amount += qty * price
  }
  return round4(amount)
}

// 应付状态：0 未结算 / 1 部分结算 / 2 全部结算
const calcPayableStatus = (received, total) => {
  if (received <= 0) return 0
  if (received >= total - 0.00001) return 2
  return 1
}

// 累计退货校验：历史退货 + 本次 ≤ 原入库数量（编辑时 excludeId 排除自身）
const validateCumulativeReturns = async (sourceOrderId, items, excludeId, conn) => {
  const sourceOrder = await WarehousingOrder.findById(sourceOrderId, conn)
  if (!sourceOrder) return { error: '原入库单不存在' }
  const warehousingItems = parseReturnItems(sourceOrder.warehousing_items)

  const history = await InboundReturnOrder.findAll({
    where: excludeId ? 'source_order_id = ? AND inbound_return_id != ?' : 'source_order_id = ?',
    params: excludeId ? [sourceOrderId, excludeId] : [sourceOrderId]
  }, conn)
  const returnedMap = new Map()
  for (const h of history) {
    for (const it of parseReturnItems(h.return_items)) {
      if (!it.product_code) continue
      returnedMap.set(it.product_code, (returnedMap.get(it.product_code) || 0) + (parseFloat(it.quantity) || 0))
    }
  }

  const thisMap = new Map()
  for (const it of items) {
    if (!it.product_code) return { error: '退货明细缺少商品编码' }
    const qty = parseFloat(it.quantity)
    if (!(qty > 0)) return { error: `商品 ${it.product_name || it.product_code} 退货数量必须大于0` }
    thisMap.set(it.product_code, (thisMap.get(it.product_code) || 0) + qty)
    if (!warehousingItems.some(wi => wi.product_code === it.product_code)) {
      return { error: `商品 ${it.product_code} 不在原入库单中` }
    }
  }

  for (const [code, qty] of thisMap) {
    const sourceItem = warehousingItems.find(wi => wi.product_code === code)
    const already = returnedMap.get(code) || 0
    const maxQty = parseFloat(sourceItem.quantity) || 0
    if (qty + already > maxQty + 1e-6) {
      return {
        error: `商品 ${sourceItem.product_name || code} 累计退货超量：历史已退 ${already} + 本次 ${qty} > 原入库 ${maxQty}`
      }
    }
  }

  return { sourceOrder, warehousingItems }
}

// 退货冲减应付账款：按退货金额减少应付，全退且未付款才删除；不减破已付金额
const reducePayableForReturn = async (sourceOrderNumber, returnAmount, conn) => {
  if (!sourceOrderNumber || returnAmount <= 0) return
  const payable = await Payable.findOne('source_bill_id = ?', [sourceOrderNumber], conn)
  if (!payable) return

  const received = parseFloat(payable.received_amount || 0)
  const handlingFee = parseFloat(payable.handling_fee || 0)
  const newAmount = Math.max(received, round4(parseFloat(payable.amount || 0) - returnAmount))

  if (newAmount <= 0 && received <= 0 && handlingFee <= 0) {
    // 全额退货、无付款、无手续费才允许删除应付（带手续费删除会让手续费凭空消失）
    await Payable.delete(payable.payable_id, conn)
    return
  }

  await Payable.update(payable.payable_id, {
    amount: newAmount,
    balance_amount: round4(newAmount + handlingFee - received),
    status: calcPayableStatus(received, newAmount + handlingFee)
  }, conn)
}

// 删除退货单时恢复应付账款（与冲减对称；原应付已删则重建）
const restorePayableForReturn = async (returnOrder, returnAmount, conn) => {
  const sourceOrderNumber = returnOrder.source_order_number
  if (!sourceOrderNumber || returnAmount <= 0) return

  const payable = await Payable.findOne('source_bill_id = ?', [sourceOrderNumber], conn)
  if (payable) {
    const received = parseFloat(payable.received_amount || 0)
    const handlingFee = parseFloat(payable.handling_fee || 0)
    const newAmount = round4(parseFloat(payable.amount || 0) + returnAmount)
    await Payable.update(payable.payable_id, {
      amount: newAmount,
      balance_amount: round4(newAmount + handlingFee - received),
      status: calcPayableStatus(received, newAmount + handlingFee)
    }, conn)
  } else {
    // 原应付曾因全额退货被删除，重建最小应付记录
    await Payable.create({
      supplier_id: returnOrder.supplier_code || null,
      supplier_name: returnOrder.supplier_name || null,
      source_bill_type: 1, // 入库单
      source_bill_id: sourceOrderNumber,
      amount: returnAmount,
      received_amount: 0,
      balance_amount: returnAmount,
      status: 0,
      warehousing_time: null
    }, conn)
  }
}

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
      params.push(`%${escapeLike(orderNumber)}%`)
    }

    if (contractNumber) {
      where.push('contract_number LIKE ?')
      params.push(`%${escapeLike(contractNumber)}%`)
    }

    if (supplierName) {
      where.push('supplier_name LIKE ?')
      params.push(`%${escapeLike(supplierName)}%`)
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
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
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
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const createInboundReturn = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

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
      await connection.rollback()
      return res.status(400).json({ success: false, message: '退货商品不能为空' })
    }

    const parsedItems = parseReturnItems(return_items)

    // 校验退货数量：正数校验 + 累计退货不超过原入库数量（历史退货 + 本次 ≤ 原入库）
    let warehousingItems = []
    if (source_order_id) {
      const check = await validateCumulativeReturns(source_order_id, parsedItems, null, connection)
      if (check.error) {
        await connection.rollback()
        return res.status(400).json({ success: false, message: check.error })
      }
      warehousingItems = check.warehousingItems
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
    }, connection)

    // 扣减产品库存并调整单价（退货给供应商，库存减少，使用移动平均法反向计算）
    for (const item of parsedItems) {
      if (!item.product_code || !item.quantity) continue
      const [productResult] = await connection.query(
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
          await connection.query(
            'UPDATE products SET stock = ?, tax_included_price = ?, tax_excluded_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), round4(newTaxIncludedPrice), round4(newTaxExcludedPrice), item.product_code]
          )
        } else {
          await connection.query(
            'UPDATE products SET stock = ?, tax_included_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), round4(newTaxIncludedPrice), item.product_code]
          )
        }
      }
    }

    // 回退采购单入库数量
    // 同一采购合同编号可能对应多张采购订单，回退到实际收过货（入库数量 > 0）的订单
    if (contract_number) {
      const { orders, itemsMap } = await loadContractOrders(PurchaseOrder, contract_number, PURCHASE_ORDER_KEYS, connection)

      if (orders.length > 0) {
        const touchedOrders = new Map()

        for (const returnItem of parsedItems) {
          const match = findItemForRollback(orders, itemsMap, returnItem.product_code, PURCHASE_ORDER_KEYS)
          if (!match) continue

          const currentInbound = match.targetItem.inbound_quantity || 0
          match.targetItem.inbound_quantity = Math.max(0, currentInbound - returnItem.quantity)

          // 更新行状态（浮点容差比较）
          if (Math.abs(match.targetItem.inbound_quantity) < 1e-6) {
            match.targetItem.status = 1 // 未入库
          } else if (match.targetItem.inbound_quantity < match.targetItem.quantity) {
            match.targetItem.status = 3 // 已部分入库
          } else if (Math.abs(match.targetItem.inbound_quantity - match.targetItem.quantity) < 1e-6) {
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
          }, connection)
        }
      }
    }

    // 按退货金额冲减应付账款（全退且未付款才删除，已付款的不减破实付金额）
    const returnAmount = calcReturnAmount(parsedItems, warehousingItems)
    await reducePayableForReturn(source_order_number || order.source_order_number, returnAmount, connection)

    await connection.commit()
    res.status(201).json({ success: true, data: order })
  } catch (error) {
    try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  } finally {
    connection.release()
  }
}

export const updateInboundReturn = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params
    const existing = await InboundReturnOrder.findById(id, connection)
    if (!existing) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: '入库退货单不存在' })
    }

    const updateData = {}
    const fields = ['source_order_id', 'source_order_number', 'contract_number', 'supplier_name', 'supplier_code', 'return_items', 'return_time', 'entry_date', 'currency', 'return_person', 'reason', 'remarks']
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    }

    const oldItems = parseReturnItems(existing.return_items)
    const newItems = updateData.return_items !== undefined ? parseReturnItems(updateData.return_items) : oldItems

    // 退货明细变化时：正数校验 + 累计退货校验（排除本单自身）
    if (updateData.return_items !== undefined) {
      const sourceOrderId = updateData.source_order_id || existing.source_order_id
      if (sourceOrderId) {
        const check = await validateCumulativeReturns(sourceOrderId, newItems, id, connection)
        if (check.error) {
          await connection.rollback()
          return res.status(400).json({ success: false, message: check.error })
        }
      }
    }

    // 如果退货商品发生变化，调整库存（退货给供应商：退货增加 → 库存减少）
    if (updateData.return_items !== undefined) {
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
        const [productResult] = await connection.query(
          'SELECT stock FROM products WHERE product_code = ?',
          [productCode]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const newStock = Math.max(0, currentStock - delta)
          await connection.query(
            'UPDATE products SET stock = ? WHERE product_code = ?',
            [newStock.toFixed(2), productCode]
          )
        }
      }
    }

    // 同步入库数量到采购订单：退货数量增加 → 订单入库数量减少（差量取反）
    if (updateData.return_items !== undefined || updateData.contract_number !== undefined) {
      const oldContractNumber = existing.contract_number || ''
      const newContractNumber = updateData.contract_number !== undefined ? (updateData.contract_number || '') : oldContractNumber

      if (oldContractNumber !== newContractNumber) {
        // 合同变更：旧合同恢复旧退货明细占用的入库数量，新合同扣减新退货明细
        await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, oldContractNumber, itemsToDeltaMap(oldItems, 1), undefined, connection)
        await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, newContractNumber, itemsToDeltaMap(newItems, -1), undefined, connection)
      } else {
        // 同一合同：差量同步（退货增加 → 订单入库减少）
        await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, newContractNumber, buildQuantityDeltaMap(oldItems, newItems, -1), undefined, connection)
      }
    }

    // 应付冲减差量同步：退货金额增加 → 应付减少；减少 → 恢复
    if (updateData.return_items !== undefined) {
      const sourceOrderId = updateData.source_order_id || existing.source_order_id
      let warehousingItems = []
      if (sourceOrderId) {
        const sourceOrder = await WarehousingOrder.findById(sourceOrderId, connection)
        if (sourceOrder) warehousingItems = parseReturnItems(sourceOrder.warehousing_items)
      }
      const deltaAmount = round4(calcReturnAmount(newItems, warehousingItems) - calcReturnAmount(oldItems, warehousingItems))
      const sourceOrderNumber = updateData.source_order_number || existing.source_order_number
      if (deltaAmount > 0) {
        await reducePayableForReturn(sourceOrderNumber, deltaAmount, connection)
      } else if (deltaAmount < 0) {
        await restorePayableForReturn({ ...existing, source_order_number: sourceOrderNumber }, -deltaAmount, connection)
      }
    }

    const order = await InboundReturnOrder.update(id, updateData, connection)
    await connection.commit()
    res.json({ success: true, data: order })
  } catch (error) {
    try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  } finally {
    connection.release()
  }
}

export const deleteInboundReturn = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params
    const existing = await InboundReturnOrder.findById(id, connection)
    if (!existing) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: '入库退货单不存在' })
    }

    const returnItems = parseReturnItems(existing.return_items)

    // 恢复产品库存并调整单价（使用移动平均法重新计算）
    for (const item of returnItems) {
      if (!item.product_code || !item.quantity) continue
      const [productResult] = await connection.query(
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
          await connection.query(
            'UPDATE products SET stock = ?, tax_included_price = ?, tax_excluded_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), round4(newTaxIncludedPrice), round4(newTaxExcludedPrice), item.product_code]
          )
        } else {
          await connection.query(
            'UPDATE products SET stock = ?, tax_included_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), round4(newTaxIncludedPrice), item.product_code]
          )
        }
      }
    }

    // 恢复采购单入库数量
    // 同一采购合同编号可能对应多张采购订单，恢复到剩余可入库数量大于 0 的订单
    if (existing.contract_number) {
      const { orders, itemsMap } = await loadContractOrders(PurchaseOrder, existing.contract_number, PURCHASE_ORDER_KEYS, connection)

      if (orders.length > 0) {
        const touchedOrders = new Map()

        for (const returnItem of returnItems) {
          const match = findItemByProduct(orders, itemsMap, returnItem.product_code, PURCHASE_ORDER_KEYS)
          if (!match) continue

          match.targetItem.inbound_quantity = (parseFloat(match.targetItem.inbound_quantity) || 0) + (parseFloat(returnItem.quantity) || 0)

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
          }, connection)
        }
      }
    }

    // 恢复应付账款（与创建时的冲减对称）
    let warehousingItems = []
    if (existing.source_order_id) {
      const sourceOrder = await WarehousingOrder.findById(existing.source_order_id, connection)
      if (sourceOrder) warehousingItems = parseReturnItems(sourceOrder.warehousing_items)
    }
    await restorePayableForReturn(existing, calcReturnAmount(returnItems, warehousingItems), connection)

    await InboundReturnOrder.delete(id, connection)
    await connection.commit()
    res.json({ success: true, message: '入库退货单删除成功' })
  } catch (error) {
    try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  } finally {
    connection.release()
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await InboundReturnOrder.generateOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}
