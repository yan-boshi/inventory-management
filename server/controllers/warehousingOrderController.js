import WarehousingOrder from '../models/WarehousingOrder.js'
import PurchaseOrder from '../models/PurchaseOrder.js'
import Payable from '../models/Payable.js'
import InboundPlan from '../models/InboundPlan.js'
import InboundReturnOrder from '../models/InboundReturnOrder.js'
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
import {
  INBOUND_PLAN_KEYS,
  applyPlanDeductions,
  restorePlanDeductions,
  restoreQuantitiesToPlans
} from '../utils/planRestore.js'

// 按采购合同编号加载全部采购订单及其明细（同一合同编号可能对应多张采购订单）
const loadContractPurchaseOrders = (contractNumber, conn) =>
  loadContractOrders(PurchaseOrder, contractNumber, PURCHASE_ORDER_KEYS, conn)

// 在该合同下的多张采购订单中查找包含指定商品的明细行
// 优先匹配剩余可入库数量大于 0 的订单，避免把入库数量同步到已全部入库的订单上
const findPoItemByProduct = (orders, itemsMap, productCode, preferPurchaseOrderId) => {
  const match = findItemByProduct(orders, itemsMap, productCode, PURCHASE_ORDER_KEYS, preferPurchaseOrderId)
  if (!match) return null
  return { purchaseOrder: match.order, purchaseItems: match.items, targetItem: match.targetItem }
}

// 删除入库单回退入库数量时，优先回退到入库数量大于 0 的订单（即真正收过货的订单），
// preferPurchaseOrderId 为创建单据时定位到的具体订单，优先回退到同一张订单
const findPoItemForRollback = (orders, itemsMap, productCode, preferPurchaseOrderId) => {
  const match = findItemForRollback(orders, itemsMap, productCode, PURCHASE_ORDER_KEYS, preferPurchaseOrderId)
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
      // 前端选择的具体采购订单（同一合同编号可能对应多张采购订单，用于定位明细并落库，删除时回退到同一张订单）
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
      expenses,
      // 从入库计划生成时的来源计划明细行 [{plan_id, item_index, product_code, quantity}]
      plan_rows
    } = req.body

    const parsedItems = warehousing_items
      ? (typeof warehousing_items === 'string' ? JSON.parse(warehousing_items) : warehousing_items)
      : []

    // 如果关联了采购订单，先验证入库数量
    if (contract_number) {
      const { orders, itemsMap } = await loadContractPurchaseOrders(contract_number)

      if (orders.length > 0 && parsedItems.length > 0) {
        // 按目标明细行累计本次入库数量，避免多行同商品拆分校验导致超量
        const pendingByItem = new Map()

        // 遍历入库项，验证数量（同一合同下有多张采购订单时，商品只要在其中一张中存在即可）
        for (const warehousingItem of parsedItems) {
          const match = findPoItemByProduct(orders, itemsMap, warehousingItem.product_code, purchase_order_id)

          if (!match) {
            return res.status(400).json({
              success: false,
              message: `商品 ${warehousingItem.product_code} 不在采购订单中`
            })
          }

          // 超量校验
          const itemKey = `${match.purchaseOrder.purchase_order_id}:${match.targetItem.product_code}`
          const pendingQty = (pendingByItem.get(itemKey) || 0) + (parseFloat(warehousingItem.quantity) || 0)
          pendingByItem.set(itemKey, pendingQty)

          const currentInbound = parseFloat(match.targetItem.inbound_quantity || 0)
          const newInbound = currentInbound + pendingQty
          if (newInbound > match.targetItem.quantity) {
            return res.status(400).json({
              success: false,
              message: `商品 ${match.targetItem.product_name} 已超出采购数量，订单数量: ${match.targetItem.quantity}，已入库: ${currentInbound}，本次入库: ${pendingQty}`
            })
          }
        }
      }
    }

    // 创建入库单并同步库存/计划/采购订单/应付账款，整体走事务，任一步失败全部回滚
    const connection = await pool.getConnection()
    let order
    try {
      await connection.beginTransaction()

      order = await WarehousingOrder.create({
        contract_number,
        purchase_order_id,
        warehousing_items: parsedItems,
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
      }, connection)

      // 从入库计划生成时，扣减计划明细的待入库数量并记录扣减明细（删除时据此原路回补）
      const planDeductions = await applyPlanDeductions(
        InboundPlan,
        INBOUND_PLAN_KEYS,
        plan_rows,
        parsedItems,
        connection
      )
      if (plan_rows) {
        order = await WarehousingOrder.update(order.warehousing_order_id, {
          plan_deductions: planDeductions
        }, connection)
      }

      // 更新产品库存（含移动平均法计算单价）- 使用锁避免并发问题
      for (const item of parsedItems) {
        if (!item.product_code) {
          console.warn('跳过无产品代码的商品:', item)
          continue
        }
        const inQty = parseFloat(item.quantity || 0)
        // 使用 SELECT ... FOR UPDATE 获取行锁，避免并发计算错误
        const [productResult] = await connection.query(
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
        } else {
          throw new Error(`未找到产品代码为 ${item.product_code} 的产品`)
        }
      }

      // 如果关联了采购订单，同步入库数量到采购订单
      if (contract_number) {
        const { orders, itemsMap } = await loadContractPurchaseOrders(contract_number, connection)

        if (orders.length > 0 && parsedItems.length > 0) {
          // 同一合同下可能有多张采购订单，按商品所在的具体订单同步
          const touchedOrders = new Map()

          // 遍历入库项，同步数量
          for (const warehousingItem of parsedItems) {
            const match = findPoItemByProduct(orders, itemsMap, warehousingItem.product_code, purchase_order_id)
            if (!match) continue

            // 更新入库数量
            match.targetItem.inbound_quantity = (parseFloat(match.targetItem.inbound_quantity) || 0) + (parseFloat(warehousingItem.quantity) || 0)

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

            await PurchaseOrder.update(match.purchaseOrder.purchase_order_id, {
              purchase_items: JSON.stringify(match.purchaseItems),
              status: orderStatus
            }, connection)
          }

          // 创建应付账款记录
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
          }, connection)
        }
      }

      await connection.commit()
      res.status(201).json({ success: true, data: order })
    } catch (txError) {
      await connection.rollback()
      throw txError
    } finally {
      connection.release()
    }
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
    // 优先定位到单据关联的具体采购订单（本次带入的优先，其次创建时落库的）
    const preferPurchaseOrderId = purchase_order_id || existing.purchase_order_id || undefined
    const oldContractNumber = existing.contract_number || ''
    const newContractNumber = contract_number !== undefined ? (contract_number || '') : oldContractNumber
    if (warehousing_items !== undefined || contract_number !== undefined) {
      try {
        if (oldContractNumber !== newContractNumber) {
          // 合同变更：旧合同按旧明细全部回退，新合同按新明细全部累加
          await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, oldContractNumber, itemsToDeltaMap(oldItems, -1), existing.purchase_order_id || undefined)
          await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, newContractNumber, itemsToDeltaMap(newItems, 1), preferPurchaseOrderId)
        } else {
          // 同一合同：按新旧明细差量调整
          await syncQuantityDeltaToOrders(PurchaseOrder, PURCHASE_ORDER_KEYS, newContractNumber, buildQuantityDeltaMap(oldItems, newItems), preferPurchaseOrderId)
        }
      } catch (syncErr) {
        console.error('同步采购订单入库数量失败（不影响入库单更新）:', syncErr.message)
      }
    }

    const updateData = {}
    if (order_number !== undefined) updateData.order_number = order_number
    if (contract_number !== undefined) updateData.contract_number = contract_number
    // 落库关联的采购订单，删除时据此回退到同一张订单
    if (purchase_order_id !== undefined) updateData.purchase_order_id = purchase_order_id
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

    // 已关联退货单的入库单不允许删除：
    // 退货单已经扣减过库存并回退过订单数量，再删除入库单会二次扣减导致数据错乱
    const [relatedReturns] = await pool.query(
      'SELECT inbound_return_id FROM inbound_return_orders WHERE source_order_id = ? OR source_order_number = ? LIMIT 1',
      [id, existing.order_number]
    )
    if (relatedReturns.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该入库单已关联退货单，不能删除；请先删除对应的退货单'
      })
    }

    // 删除入库单并回补计划/订单/库存/应付账款，整体走事务，任一步失败全部回滚
    const connection = await pool.getConnection()
    let planRestore = null
    try {
      await connection.beginTransaction()

      const warehousingItems = JSON.parse(existing.warehousing_items || '[]')

      // 回补入库计划的待入库数量：
      // 有 plan_deductions 记录的按记录原路回补（创建时扣了多少就补多少）；
      // 历史单据没有记录，退化为按合同编号猜行的旧逻辑
      if (existing.plan_deductions === null || existing.plan_deductions === undefined) {
        if (existing.contract_number) {
          planRestore = await restoreQuantitiesToPlans(
            InboundPlan,
            INBOUND_PLAN_KEYS,
            existing.contract_number,
            warehousingItems,
            connection
          )
        }
      } else {
        planRestore = await restorePlanDeductions(
          InboundPlan,
          INBOUND_PLAN_KEYS,
          existing.plan_deductions,
          connection
        )
      }

      // 回退入库数量到采购订单（优先回退到创建时关联的那张订单）
      if (existing.contract_number) {
        const { orders, itemsMap } = await loadContractPurchaseOrders(existing.contract_number, connection)

        if (orders.length > 0) {
          // 同一合同下可能有多张采购订单，回退到实际收过货（入库数量 > 0）的订单
          const touchedOrders = new Map()

          // 遍历被删除入库单的商品，回退数量
          for (const warehousingItem of warehousingItems) {
            const match = findPoItemForRollback(orders, itemsMap, warehousingItem.product_code, existing.purchase_order_id || undefined)
            if (!match) continue

            const currentInbound = parseFloat(match.targetItem.inbound_quantity || 0)
            const newInbound = Math.max(0, currentInbound - (parseFloat(warehousingItem.quantity) || 0))

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
            }, connection)
          }
        }
      }

      // 扣减库存（入库单删除相当于撤销入库），失败直接抛错回滚，不能静默吞掉
      for (const item of warehousingItems) {
        if (!item.product_code || !item.quantity) continue
        const outQty = parseFloat(item.quantity) || 0
        const [result] = await connection.query(
          'UPDATE products SET stock = stock - ? WHERE product_code = ? AND stock >= ?',
          [outQty, item.product_code, outQty]
        )
        if (result.affectedRows === 0) {
          const [productCheck] = await connection.query(
            'SELECT stock, product_name FROM products WHERE product_code = ?',
            [item.product_code]
          )
          if (productCheck.length > 0) {
            throw new Error(`商品 ${productCheck[0].product_name}(${item.product_code}) 库存不足，无法扣回入库数量，当前库存: ${productCheck[0].stock}，需扣减: ${outQty}`)
          }
          throw new Error(`商品 ${item.product_code} 不存在，库存扣减失败`)
        }
      }

      // 删除对应的应付账款记录
      const payable = await Payable.findOne('source_bill_id = ?', [existing.order_number], connection)
      if (payable) {
        await Payable.delete(payable.payable_id, connection)
      }

      await WarehousingOrder.delete(id, connection)

      await connection.commit()
      res.json({ success: true, message: '入库单删除成功', data: planRestore })
    } catch (txError) {
      await connection.rollback()
      throw txError
    } finally {
      connection.release()
    }
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
