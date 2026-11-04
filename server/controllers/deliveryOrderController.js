import DeliveryOrder from '../models/DeliveryOrder.js'
import SalesOrder from '../models/SalesOrder.js'
import Receivable from '../models/Receivable.js'
import OutboundPlan from '../models/OutboundPlan.js'
import OutboundReturnOrder from '../models/OutboundReturnOrder.js'
import pool from '../config/database.js'
import { handleDbError } from '../utils/errorHandler.js'
import {
  SALES_ORDER_KEYS,
  loadContractOrders,
  findItemByProduct,
  findItemForRollback,
  itemsToDeltaMap,
  buildQuantityDeltaMap,
  syncQuantityDeltaToOrders
} from '../utils/contractOrderLookup.js'
import {
  OUTBOUND_PLAN_KEYS,
  applyPlanDeductions,
  restorePlanDeductions,
  restoreQuantitiesToPlans
} from '../utils/planRestore.js'
import { escapeLike } from '../utils/sql.js'
import { validateNonNegativeAmounts } from '../utils/amountValidation.js'
import { round4 } from '../utils/round.js'

// 出库明细中需要非负校验的金额字段
const DELIVERY_AMOUNT_FIELDS = ['tax_included_price', 'total_price']

export const getAllDeliveryOrders = async (req, res) => {
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
      deliveryDate,
      endDate,
      trackingNumber
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

    if (customerName) {
      where.push('customer_name LIKE ?')
      params.push(`%${escapeLike(customerName)}%`)
    }

    if (productName) {
      where.push('delivery_items LIKE ?')
      params.push(`%${escapeLike(productName)}%`)
    }

    if (productCode) {
      where.push('delivery_items LIKE ?')
      params.push(`%${escapeLike(productCode)}%`)
    }

    if (productModel) {
      where.push('delivery_items LIKE ?')
      params.push(`%${escapeLike(productModel)}%`)
    }

    if (deliveryDate) {
      where.push('delivery_time >= ?')
      params.push(deliveryDate.length === 10 ? deliveryDate + ' 00:00:00' : deliveryDate)
    }

    // 范围上界（delivery_time 是 DATETIME，日期补 23:59:59，否则末日整天被漏掉）
    if (endDate) {
      where.push('delivery_time <= ?')
      params.push(endDate.length === 10 ? endDate + ' 23:59:59' : endDate)
    }

    if (trackingNumber) {
      where.push('tracking_number LIKE ?')
      params.push(`%${escapeLike(trackingNumber)}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await DeliveryOrder.paginate({
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
    const { statusCode, message } = handleDbError(error, '操作出库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getDeliveryOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await DeliveryOrder.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: '出库单不存在' })
    }
    res.json({ success: true, data: order })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作出库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const createDeliveryOrder = async (req, res) => {
  try {
    const {
      order_number,
      contract_number,
      // 前端选择的具体销售订单（同一合同编号可能对应多张销售订单，用于定位明细并落库，删除时回退到同一张订单）
      sales_order_id,
      customer_name,
      customer_address,
      delivery_items,
      delivery_time,
      delivery_date,
      entry_date,
      currency,
      delivery_person,
      contact_phone,
      remarks,
      expenses,
      tracking_number,
      // 从出库计划生成时的来源计划明细行 [{plan_id, item_index, product_code, quantity}]
      plan_rows
    } = req.body

    if (!customer_name) {
      return res.status(400).json({ success: false, message: '客户名称不能为空' })
    }

    if (!delivery_items || (Array.isArray(delivery_items) && delivery_items.length === 0)) {
      return res.status(400).json({ success: false, message: '出库商品不能为空' })
    }

    const parsedItems = typeof delivery_items === 'string' ? JSON.parse(delivery_items) : delivery_items

    // 数量必须为正数（负数出库会反向加库存）
    for (const item of parsedItems) {
      const qty = parseFloat(item.quantity)
      if (!(qty > 0)) {
        return res.status(400).json({
          success: false,
          message: `商品 ${item.product_name || item.product_code || '未知'} 的出库数量必须大于0`
        })
      }
    }

    // 金额/单价必须非负（缺省不管，传了就必须是有限非负数字）
    const createAmountError = validateNonNegativeAmounts(parsedItems, DELIVERY_AMOUNT_FIELDS)
    if (createAmountError) {
      return res.status(400).json({ success: false, message: createAmountError })
    }

    // 先校验库存是否充足（在创建出库单之前）
    for (const item of parsedItems) {
      if (!item.product_code || !item.quantity) continue
      // 查询当前库存
      const [productResult] = await pool.query(
        'SELECT stock, product_name FROM products WHERE product_code = ?',
        [item.product_code]
      )
      if (productResult.length > 0) {
        const currentStock = parseFloat(productResult[0].stock || 0)
        const outQuantity = parseFloat(item.quantity || 0)
        // 校验库存是否充足
        if (outQuantity > currentStock) {
          return res.status(400).json({
            success: false,
            message: `商品 ${productResult[0].product_name}(${item.product_code}) 库存不足，当前库存: ${currentStock}，出库数量: ${outQuantity}`
          })
        }
      }
    }

    // 校验销售订单出库数量是否超量（在创建出库单之前，多行同商品需累计校验）
    if (contract_number) {
      // 同一销售合同编号可能对应多张销售订单，商品只要在其中一张中存在即可
      const { orders, itemsMap } = await loadContractOrders(SalesOrder, contract_number, SALES_ORDER_KEYS)
      if (orders.length > 0) {
        // 按目标明细行累计本次出库数量，避免多行同商品拆分校验导致超量
        const pendingByItem = new Map()

        for (const deliveryItem of parsedItems) {
          const match = findItemByProduct(orders, itemsMap, deliveryItem.product_code, SALES_ORDER_KEYS, sales_order_id)

          if (!match) {
            return res.status(400).json({
              success: false,
              message: `商品 ${deliveryItem.product_code} 不在销售订单中`
            })
          }

          const itemKey = `${match.order.sales_order_id}:${match.targetItem.product_code}`
          const pendingQty = (pendingByItem.get(itemKey) || 0) + (parseFloat(deliveryItem.quantity) || 0)
          pendingByItem.set(itemKey, pendingQty)

          const currentOutbound = parseFloat(match.targetItem.outbound_quantity || 0)
          const newOutbound = currentOutbound + pendingQty

          if (newOutbound > match.targetItem.quantity) {
            return res.status(400).json({
              success: false,
              message: `商品 ${match.targetItem.product_name} 已超出销售数量，订单数量: ${match.targetItem.quantity}，已出库: ${currentOutbound}，本次出库: ${pendingQty}`
            })
          }
        }
      }
    }

    // 创建出库单并同步库存/计划/销售订单/应收账款，整体走事务，任一步失败全部回滚
    const connection = await pool.getConnection()
    let order
    try {
      await connection.beginTransaction()

      order = await DeliveryOrder.create({
        order_number,
        contract_number,
        sales_order_id,
        customer_name,
        customer_address,
        delivery_items: parsedItems,
        delivery_time,
        delivery_date,
        entry_date,
        currency,
        delivery_person,
        contact_phone,
        remarks,
        expenses,
        tracking_number
      }, connection)

      // 从出库计划生成时，扣减计划明细的待出库数量并记录扣减明细（删除时据此原路回补）
      const planDeductions = await applyPlanDeductions(
        OutboundPlan,
        OUTBOUND_PLAN_KEYS,
        plan_rows,
        parsedItems,
        connection
      )
      if (plan_rows) {
        order = await DeliveryOrder.update(order.delivery_order_id, {
          plan_deductions: planDeductions
        }, connection)
      }

      // 更新产品库存（扣减）- 使用原子操作避免并发问题
      for (const item of parsedItems) {
        if (!item.product_code || !item.quantity) continue
        const outQty = parseFloat(item.quantity || 0)
        // 原子操作：同时检查和扣减库存
        const [result] = await connection.query(
          'UPDATE products SET stock = stock - ? WHERE product_code = ? AND stock >= ?',
          [outQty, item.product_code, outQty]
        )
        // 如果 affectedRows === 0，说明库存不足（被并发抢走了）
        if (result.affectedRows === 0) {
          // 检查是产品不存在还是库存不足
          const [productCheck] = await connection.query(
            'SELECT stock, product_name FROM products WHERE product_code = ?',
            [item.product_code]
          )
          if (productCheck.length > 0) {
            throw new Error(`商品 ${productCheck[0].product_name}(${item.product_code}) 库存不足，当前库存: ${productCheck[0].stock}，出库数量: ${outQty}`)
          }
        }
      }

      // 如果关联了销售订单，同步出库数量到销售订单
      if (contract_number) {
        const { orders, itemsMap } = await loadContractOrders(SalesOrder, contract_number, SALES_ORDER_KEYS, connection)

        if (orders.length > 0) {
          // 同一合同下可能有多张销售订单，按商品所在的具体订单同步
          const touchedOrders = new Map()

          // 遍历出库项，同步数量（校验已在创建前完成）
          for (const deliveryItem of parsedItems) {
            const match = findItemByProduct(orders, itemsMap, deliveryItem.product_code, SALES_ORDER_KEYS, sales_order_id)
            if (!match) continue

            // 更新出库数量
            const currentOutbound = parseFloat(match.targetItem.outbound_quantity || 0)
            const newOutbound = currentOutbound + (parseFloat(deliveryItem.quantity) || 0)
            match.targetItem.outbound_quantity = newOutbound

            // 更新行状态（浮点容差比较，0.1+0.2 之类的累加会卡死"已全部出库"）
            if (Math.abs(newOutbound - match.targetItem.quantity) < 1e-6) {
              match.targetItem.status = 2 // 已全部出库
            } else if (newOutbound > 0) {
              match.targetItem.status = 3 // 已部分出库
            }

            touchedOrders.set(match.order.sales_order_id, match)
          }

          // 更新销售订单
          for (const match of touchedOrders.values()) {
            // 计算订单整体状态
            const orderStatus = SalesOrder.deriveOrderStatus(match.items)

            await SalesOrder.update(match.order.sales_order_id, {
              sales_items: JSON.stringify(match.items),
              status: orderStatus
            }, connection)
          }

          // 创建应收账款记录
          const totalAmount = parseFloat(order.total_amount) || 0

          // 获取客户名称（取本次出库商品所在的销售订单）
          const primaryMatch = touchedOrders.values().next().value
          const salesOrder = primaryMatch ? primaryMatch.order : undefined
          const customerName = customer_name || (salesOrder && salesOrder.customer_name)

          await Receivable.create({
            customer_id: salesOrder ? salesOrder.customer_code : undefined,
            customer_name: customerName,
            source_bill_type: 1, // 出库单
            source_bill_id: order.order_number,
            amount: totalAmount,
            received_amount: 0,
            balance_amount: totalAmount,
            due_date: null,
            status: 0, // 未结算
            payment_method: (salesOrder && salesOrder.payment_method) || null,
            delivery_time: delivery_time || null
          }, connection)
        }
      }

      await connection.commit()
      res.status(201).json({ success: true, data: order })
    } catch (txError) {
      try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
      throw txError
    } finally {
      connection.release()
    }
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作出库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const updateDeliveryOrder = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params
    const {
      order_number,
      contract_number,
      // 编辑时带入的具体销售订单，用于后端精确定位出库数量同步的目标订单
      sales_order_id,
      customer_name,
      customer_address,
      delivery_items,
      delivery_time,
      delivery_date,
      entry_date,
      currency,
      delivery_person,
      contact_phone,
      remarks,
      expenses,
      tracking_number,
      total_amount
    } = req.body

    const existing = await DeliveryOrder.findById(id, connection)
    if (!existing) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: '出库单不存在' })
    }

    // 如果出库商品发生变化，同步更新库存
    const oldItems = JSON.parse(existing.delivery_items || '[]')
    const newItems = delivery_items !== undefined
      ? (typeof delivery_items === 'string' ? JSON.parse(delivery_items) : delivery_items)
      : oldItems

    // 优先定位到单据关联的具体销售订单（本次带入的优先，其次创建时落库的）
    const preferSalesOrderId = sales_order_id || existing.sales_order_id || undefined
    const oldContractNumber = existing.contract_number || ''
    const newContractNumber = contract_number !== undefined ? (contract_number || '') : oldContractNumber

    if (delivery_items !== undefined) {

      // 数量必须为正数（负数出库会反向加库存）
      for (const item of newItems) {
        const qty = parseFloat(item.quantity)
        if (!(qty > 0)) {
          await connection.rollback()
          return res.status(400).json({
            success: false,
            message: `商品 ${item.product_name || item.product_code || '未知'} 的出库数量必须大于0`
          })
        }
      }

      // 金额/单价必须非负（缺省不管，传了就必须是有限非负数字）
      const updateAmountError = validateNonNegativeAmounts(newItems, DELIVERY_AMOUNT_FIELDS)
      if (updateAmountError) {
        await connection.rollback()
        return res.status(400).json({ success: false, message: updateAmountError })
      }

      // 计算每个产品的新旧数量差（正数表示需要多扣库存）
      const quantityDelta = new Map()
      for (const item of newItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) + parseFloat(item.quantity || 0))
      }
      for (const item of oldItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) - parseFloat(item.quantity || 0))
      }

      // 校验库存是否充足（仅针对需要多扣库存的产品）
      for (const [productCode, delta] of quantityDelta) {
        if (delta <= 0) continue
        const [productResult] = await connection.query(
          'SELECT stock, product_name FROM products WHERE product_code = ?',
          [productCode]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          if (delta > currentStock) {
            await connection.rollback()
            return res.status(400).json({
              success: false,
              message: `商品 ${productResult[0].product_name}(${productCode}) 库存不足，当前库存: ${currentStock}，需额外扣减: ${delta}`
            })
          }
        }
      }

      // 超量校验：加量后订单出库数量不得超过销售数量（创建时有校验，编辑同样要有）
      if (newContractNumber) {
        const { orders, itemsMap } = await loadContractOrders(SalesOrder, newContractNumber, SALES_ORDER_KEYS, connection)
        if (orders.length > 0) {
          for (const [productCode, delta] of quantityDelta) {
            if (delta <= 0) continue
            const match = findItemByProduct(orders, itemsMap, productCode, SALES_ORDER_KEYS, preferSalesOrderId)
            if (!match) continue
            const currentOutbound = parseFloat(match.targetItem.outbound_quantity || 0)
            const maxQty = parseFloat(match.targetItem.quantity) || 0
            if (currentOutbound + delta > maxQty + 1e-6) {
              await connection.rollback()
              return res.status(400).json({
                success: false,
                message: `商品 ${productCode} 出库超量：已出库 ${currentOutbound} + 本次增加 ${delta} 超过销售数量 ${maxQty}`
              })
            }
          }
        }
      }

      // 更新库存（使用原子操作）
      for (const [productCode, delta] of quantityDelta) {
        if (delta === 0) continue
        if (delta > 0) {
          // 需要多扣库存，使用原子操作检查并扣减
          const [result] = await connection.query(
            'UPDATE products SET stock = stock - ? WHERE product_code = ? AND stock >= ?',
            [delta, productCode, delta]
          )
          if (result.affectedRows === 0) {
            const [productCheck] = await connection.query(
              'SELECT stock, product_name FROM products WHERE product_code = ?',
              [productCode]
            )
            if (productCheck.length > 0) {
              await connection.rollback()
              return res.status(400).json({
                success: false,
                message: `商品 ${productCheck[0].product_name}(${productCode}) 库存不足，当前库存: ${productCheck[0].stock}，需额外扣减: ${delta}`
              })
            }
          }
        } else {
          // 需要加回库存（delta < 0），直接加
          await connection.query(
            'UPDATE products SET stock = stock + ? WHERE product_code = ?',
            [Math.abs(delta), productCode]
          )
        }
      }
    }

    // 同步出库数量到销售订单：编辑时不回写会导致订单上的出库数量与单据不一致
    // 同步失败直接抛错回滚，不能吞掉（吞掉会造成订单与单据数量不一致且无法察觉）
    if (delivery_items !== undefined || contract_number !== undefined) {
      if (oldContractNumber !== newContractNumber) {
        // 合同变更：旧合同按旧明细全部回退，新合同按新明细全部累加
        await syncQuantityDeltaToOrders(SalesOrder, SALES_ORDER_KEYS, oldContractNumber, itemsToDeltaMap(oldItems, -1), existing.sales_order_id || undefined, connection)
        await syncQuantityDeltaToOrders(SalesOrder, SALES_ORDER_KEYS, newContractNumber, itemsToDeltaMap(newItems, 1), preferSalesOrderId, connection)
      } else {
        // 同一合同：按新旧明细差量调整
        await syncQuantityDeltaToOrders(SalesOrder, SALES_ORDER_KEYS, newContractNumber, buildQuantityDeltaMap(oldItems, newItems), preferSalesOrderId, connection)
      }
    }

    const updateData = {}
    if (order_number !== undefined) updateData.order_number = order_number
    if (contract_number !== undefined) updateData.contract_number = contract_number
    // 落库关联的销售订单，删除时据此回退到同一张订单
    if (sales_order_id !== undefined) updateData.sales_order_id = sales_order_id
    if (customer_name !== undefined) updateData.customer_name = customer_name
    if (customer_address !== undefined) updateData.customer_address = customer_address
    if (delivery_items !== undefined) updateData.delivery_items = delivery_items
    if (delivery_time !== undefined) updateData.delivery_time = delivery_time
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date
    if (entry_date !== undefined) updateData.entry_date = entry_date
    if (currency !== undefined) updateData.currency = currency
    if (delivery_person !== undefined) updateData.delivery_person = delivery_person
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone
    if (remarks !== undefined) updateData.remarks = remarks
    if (expenses !== undefined) updateData.expenses = expenses
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number
    // 明细变化时总额由模型按明细重算；仅改总额时同步落库，保证单据与应收一致
    if (total_amount !== undefined && delivery_items === undefined) {
      updateData.total_amount = parseFloat(total_amount) || 0
    }

    // 联动出库计划扣减（编辑与创建/删除对称）：
    // 按新旧明细差量补扣（正差）或回补（负差）计划待出库数量，并同步更新 plan_deductions 记录，
    // 否则改小不回补、改大不补扣，删单按旧记录回补还会多补
    if (delivery_items !== undefined && existing.plan_deductions != null) {
      let oldDeductionRecords = []
      try {
        const raw = typeof existing.plan_deductions === 'string' ? JSON.parse(existing.plan_deductions) : existing.plan_deductions
        oldDeductionRecords = Array.isArray(raw) ? raw : []
      } catch {
        oldDeductionRecords = []
      }

      const planDelta = new Map()
      for (const item of newItems) {
        if (!item.product_code) continue
        planDelta.set(item.product_code, (planDelta.get(item.product_code) || 0) + (parseFloat(item.quantity) || 0))
      }
      for (const item of oldItems) {
        if (!item.product_code) continue
        planDelta.set(item.product_code, (planDelta.get(item.product_code) || 0) - (parseFloat(item.quantity) || 0))
      }

      // 正差：按原扣减记录的计划行补扣
      const deductItems = []
      for (const [code, delta] of planDelta) {
        if (delta > 1e-6) deductItems.push({ product_code: code, quantity: delta })
      }
      if (deductItems.length > 0 && oldDeductionRecords.length > 0) {
        const added = await applyPlanDeductions(
          OutboundPlan,
          OUTBOUND_PLAN_KEYS,
          oldDeductionRecords,
          deductItems,
          connection
        )
        oldDeductionRecords.push(...added)
      }

      // 负差：按原扣减记录自后向前冲减并回补计划
      for (const [code, delta] of planDelta) {
        let left = -delta
        if (left <= 1e-6) continue
        const refunds = []
        for (let i = oldDeductionRecords.length - 1; i >= 0 && left > 1e-6; i--) {
          const rec = oldDeductionRecords[i]
          if (!rec || rec.product_code !== code) continue
          const recQty = parseFloat(rec.quantity) || 0
          const take = Math.min(left, recQty)
          if (take <= 0) continue
          refunds.push({ plan_id: rec.plan_id, item_index: rec.item_index, product_code: code, quantity: take })
          rec.quantity = recQty - take
          left -= take
        }
        if (refunds.length > 0) {
          await restorePlanDeductions(OutboundPlan, OUTBOUND_PLAN_KEYS, refunds, connection)
        }
      }

      // 记录清零的条目移除，其余落库
      updateData.plan_deductions = oldDeductionRecords.filter(r => (parseFloat(r.quantity) || 0) > 1e-6)
    }

    const order = await DeliveryOrder.update(id, updateData, connection)

    // 更新对应的应收账款记录（金额统一以服务端落库的单据总额为准；单号变更同步 source_bill_id）
    if (total_amount !== undefined || delivery_items !== undefined || (order_number !== undefined && order_number !== existing.order_number)) {
      const receivable = await Receivable.findOne('source_bill_id = ?', [existing.order_number], connection)
      if (receivable) {
        const newTotalAmount = parseFloat(order.total_amount) || 0
        const receivedAmount = parseFloat(receivable.received_amount) || 0
        const handlingFee = parseFloat(receivable.handling_fee) || 0
        // amount 不低于已收金额；余额按权威口径 amount + handling_fee - received（漏手续费会让余额对不上）
        const amount = Math.max(newTotalAmount, receivedAmount)
        const newBalanceAmount = round4(amount + handlingFee - receivedAmount)
        const status = receivedAmount <= 0 ? 0 : (receivedAmount >= amount + handlingFee - 0.00001 ? 2 : 1)

        await Receivable.update(receivable.receivable_id, {
          source_bill_id: order_number !== undefined ? order_number : existing.order_number,
          amount,
          balance_amount: newBalanceAmount,
          status,
          delivery_time: delivery_time || existing.delivery_time || null
        }, connection)
      }
    }

    await connection.commit()
    res.json({ success: true, data: order })
  } catch (error) {
    try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
    const { statusCode, message } = handleDbError(error, '操作出库单')
    res.status(statusCode).json({ success: false, message })
  } finally {
    connection.release()
  }
}

export const deleteDeliveryOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await DeliveryOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '出库单不存在' })
    }

    // 已关联退货单的出库单不允许删除：
    // 退货单已经回补过库存并回退过订单数量，再删除出库单会二次回补导致数据错乱
    const [relatedReturns] = await pool.query(
      'SELECT outbound_return_id FROM outbound_return_orders WHERE source_order_id = ? OR source_order_number = ? LIMIT 1',
      [id, existing.order_number]
    )
    if (relatedReturns.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该出库单已关联退货单，不能删除；请先删除对应的退货单'
      })
    }

    // 已有收款/核销记录的出库单不允许删除：
    // 连带删应收会让核销明细悬挂、已收金额凭空消失
    const guardReceivable = await Receivable.findOne('source_bill_id = ?', [existing.order_number])
    if (guardReceivable && parseFloat(guardReceivable.received_amount || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: '该出库单的应收账款已有收款/核销记录，不能删除；请先作废相关核销单'
      })
    }
    if (guardReceivable) {
      const [writeOffRefs] = await pool.query(
        'SELECT COUNT(*) AS c FROM write_off_items WHERE source_id = ?',
        [guardReceivable.receivable_id]
      )
      if ((writeOffRefs[0]?.c || 0) > 0) {
        return res.status(400).json({
          success: false,
          message: '该出库单的应收账款已被核销单引用，不能删除；请先作废相关核销单'
        })
      }
    }

    // 删除出库单并回补计划/订单/库存/应收账款，整体走事务，任一步失败全部回滚
    const connection = await pool.getConnection()
    let planRestore = null
    try {
      await connection.beginTransaction()

      const deliveryItems = JSON.parse(existing.delivery_items || '[]')

      // 回补出库计划的待出库数量：
      // 有 plan_deductions 记录的按记录原路回补（创建时扣了多少就补多少）；
      // 历史单据没有记录，退化为按合同编号猜行的旧逻辑
      if (existing.plan_deductions === null || existing.plan_deductions === undefined) {
        if (existing.contract_number) {
          planRestore = await restoreQuantitiesToPlans(
            OutboundPlan,
            OUTBOUND_PLAN_KEYS,
            existing.contract_number,
            deliveryItems,
            connection
          )
        }
      } else {
        planRestore = await restorePlanDeductions(
          OutboundPlan,
          OUTBOUND_PLAN_KEYS,
          existing.plan_deductions,
          connection
        )
        // 计划被订单更新删除重建后，扣减记录指向死计划行、回补会静默丢量：
        // unmatchedQty>0 时按合同兜底回补（单行封顶原始数量，不会重复多补）
        if (planRestore.unmatchedQty > 0 && existing.contract_number) {
          const fallback = await restoreQuantitiesToPlans(
            OutboundPlan,
            OUTBOUND_PLAN_KEYS,
            existing.contract_number,
            deliveryItems,
            connection
          )
          planRestore = {
            ...planRestore,
            restoredQty: planRestore.restoredQty + fallback.restoredQty,
            restoredPlans: planRestore.restoredPlans + fallback.restoredPlans
          }
        }
      }

      // 回退出库数量到销售订单（优先回退到创建时关联的那张订单）
      if (existing.contract_number) {
        const { orders, itemsMap } = await loadContractOrders(SalesOrder, existing.contract_number, SALES_ORDER_KEYS, connection)

        if (orders.length > 0) {
          const touchedOrders = new Map()

          // 遍历被删除出库单的商品，回退数量
          for (const deliveryItem of deliveryItems) {
            const match = findItemForRollback(orders, itemsMap, deliveryItem.product_code, SALES_ORDER_KEYS, existing.sales_order_id || undefined)
            if (!match) continue

            const currentOutbound = parseFloat(match.targetItem.outbound_quantity || 0)
            const newOutbound = Math.max(0, currentOutbound - (parseFloat(deliveryItem.quantity) || 0))

            // 更新出库数量
            match.targetItem.outbound_quantity = newOutbound

            // 更新行状态（浮点容差比较）
            if (Math.abs(newOutbound) < 1e-6) {
              match.targetItem.status = 1 // 未出库
            } else if (newOutbound < match.targetItem.quantity) {
              match.targetItem.status = 3 // 已部分出库
            } else if (Math.abs(newOutbound - match.targetItem.quantity) < 1e-6) {
              match.targetItem.status = 2 // 已全部出库
            }

            touchedOrders.set(match.order.sales_order_id, match)
          }

          // 重新计算订单整体状态并更新销售订单
          for (const match of touchedOrders.values()) {
            const orderStatus = SalesOrder.deriveOrderStatus(match.items)

            await SalesOrder.update(match.order.sales_order_id, {
              sales_items: JSON.stringify(match.items),
              status: orderStatus
            }, connection)
          }
        }
      }

      // 恢复产品库存（加回出库数量），失败直接抛错回滚，不能静默吞掉
      for (const item of deliveryItems) {
        if (!item.product_code || !item.quantity) continue
        const addQty = parseFloat(item.quantity) || 0
        const [result] = await connection.query(
          'UPDATE products SET stock = stock + ? WHERE product_code = ?',
          [addQty, item.product_code]
        )
        if (result.affectedRows === 0) {
          throw new Error(`商品 ${item.product_code} 不存在，库存恢复失败`)
        }
      }

      // 删除对应的应收账款记录
      const receivable = await Receivable.findOne('source_bill_id = ?', [existing.order_number], connection)
      if (receivable) {
        await Receivable.delete(receivable.receivable_id, connection)
      }

      await DeliveryOrder.delete(id, connection)

      await connection.commit()
      res.json({ success: true, message: '出库单删除成功', data: planRestore })
    } catch (txError) {
      try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
      throw txError
    } finally {
      connection.release()
    }
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作出库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await DeliveryOrder.getNewOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作出库单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getUndeliveredSalesOrders = async (req, res) => {
  try {
    // 获取状态为未出库或已部分出库的销售订单（基于存储的状态字段）
    const [orders] = await pool.query(
      `SELECT * FROM sales_orders
       WHERE status = '1' OR status = '3'
       ORDER BY created_at DESC`
    )
    // 二次校验：排除实际已全部出库的订单（通过 outbound_quantity 判断）
    const filtered = orders.filter(order => {
      try {
        const items = JSON.parse(order.sales_items || '[]')
        // 只要有任意商品的未出库数 > 0，则认为可选出库
        return items.some(item => {
          const required = item.quantity || 0
          const outbound = item.outbound_quantity || 0
          return outbound < required
        })
      } catch {
        return true
      }
    })
    res.json({ success: true, data: filtered })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作出库单')
    res.status(statusCode).json({ success: false, message })
  }
}
