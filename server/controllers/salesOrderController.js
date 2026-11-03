import SalesOrder from '../models/SalesOrder.js'
import OutboundPlan from '../models/OutboundPlan.js'
import PurchasePlan from '../models/PurchasePlan.js'
import pool from '../config/database.js'
import { generateFromSalesOrder as generatePurchasePlan } from './purchasePlanController.js'
import { generateFromSalesOrder as generateOutboundPlan } from './outboundPlanController.js'
import { handleDbError } from '../utils/errorHandler.js'
import { escapeLike } from '../utils/sql.js'

// 解析销售明细 JSON（兼容数组/字符串/坏数据）
const parseSalesItems = (salesItems) => {
  try {
    const arr = typeof salesItems === 'string' ? JSON.parse(salesItems) : salesItems
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// 校验销售明细数量为正数
const validatePositiveQuantities = (items) => {
  for (const item of items) {
    const qty = parseFloat(item.quantity)
    if (!(qty > 0)) {
      return `商品 ${item.product_name || item.product_code || '未知'} 的数量必须大于0`
    }
  }
  return null
}

export const getAllSalesOrders = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      customerName,
      customerCode,
      contractNumber,
      orderNumber,
      productName,
      productCode,
      productModel,
      startDate,
      endDate
    } = req.query

    const where = []
    const params = []

    if (orderNumber) {
      where.push('order_number LIKE ?')
      params.push(`%${escapeLike(orderNumber)}%`)
    }

    if (customerName) {
      where.push('customer_name LIKE ?')
      params.push(`%${escapeLike(customerName)}%`)
    }

    if (customerCode) {
      where.push('customer_code LIKE ?')
      params.push(`%${escapeLike(customerCode)}%`)
    }

    if (contractNumber) {
      where.push('contract_number LIKE ?')
      params.push(`%${escapeLike(contractNumber)}%`)
    }

    if (productName) {
      where.push('sales_items LIKE ?')
      params.push(`%${escapeLike(productName)}%`)
    }

    if (productCode) {
      where.push('sales_items LIKE ?')
      params.push(`%${escapeLike(productCode)}%`)
    }

    if (productModel) {
      where.push('sales_items LIKE ?')
      params.push(`%${escapeLike(productModel)}%`)
    }

    if (startDate && endDate) {
      where.push('sales_date BETWEEN ? AND ?')
      params.push(startDate, endDate)
    } else if (startDate) {
      where.push('sales_date >= ?')
      params.push(startDate)
    } else if (endDate) {
      where.push('sales_date <= ?')
      params.push(endDate)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await SalesOrder.paginateWithStatus({
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
    const { statusCode, message } = handleDbError(error, '操作销售订单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await SalesOrder.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found' })
    }
    // 计算动态状态
    const status = await SalesOrder.calculateStatus(id)
    res.json({ success: true, data: { ...order, status } })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作销售订单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const createSalesOrder = async (req, res) => {
  try {
    const {
      contract_number,
      customer_name,
      customer_code,
      payment_method,
      sales_items,
      currency,
      exchange_rate,
      entry_date,
      remarks,
      tax_included_amount,
      expenses,
      sales_person
    } = req.body

    if (!customer_name || !customer_code) {
      return res.status(400).json({ success: false, message: 'Customer name and code are required' })
    }

    // 校验销售明细数量为正数
    const createQtyError = validatePositiveQuantities(parseSalesItems(sales_items))
    if (createQtyError) {
      return res.status(400).json({ success: false, message: createQtyError })
    }

    // 创建订单并生成采购/出库计划，整体走事务：
    // 计划生成完成后才返回（fire-and-forget 会静默丢计划，并发时还会交错出重复计划）
    const connection = await pool.getConnection()
    let order
    try {
      await connection.beginTransaction()

      order = await SalesOrder.create({
        contract_number,
        customer_name,
        customer_code,
        payment_method,
        sales_items,
        currency,
        exchange_rate,
        entry_date,
        remarks,
        tax_included_amount,
        expenses,
        sales_person
      }, connection)

      // 自动生成采购计划
      await generatePurchasePlan(order, connection)

      // 自动生成出库计划
      await generateOutboundPlan(order, connection)

      await connection.commit()
    } catch (txError) {
      await connection.rollback()
      throw txError
    } finally {
      connection.release()
    }

    res.status(201).json({ success: true, data: order })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作销售订单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const updateSalesOrder = async (req, res) => {
  try {
    const { id } = req.params
    const {
      order_number,
      contract_number,
      customer_name,
      customer_code,
      payment_method,
      sales_items,
      currency,
      exchange_rate,
      entry_date,
      remarks,
      status,
      tax_included_amount,
      expenses,
      sales_person
    } = req.body

    const existing = await SalesOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sales order not found' })
    }

    // 校验销售明细：数量必须为正数，且修改后数量不得低于已出库数量
    if (sales_items !== undefined) {
      const newItems = parseSalesItems(sales_items)
      const qtyError = validatePositiveQuantities(newItems)
      if (qtyError) {
        return res.status(400).json({ success: false, message: qtyError })
      }
      const oldOutboundByProduct = new Map()
      for (const it of parseSalesItems(existing.sales_items)) {
        if (!it.product_code) continue
        oldOutboundByProduct.set(it.product_code, (oldOutboundByProduct.get(it.product_code) || 0) + (parseFloat(it.outbound_quantity) || 0))
      }
      const newQtyByProduct = new Map()
      for (const it of newItems) {
        if (!it.product_code) continue
        newQtyByProduct.set(it.product_code, (newQtyByProduct.get(it.product_code) || 0) + (parseFloat(it.quantity) || 0))
      }
      for (const [code, newQty] of newQtyByProduct) {
        const out = oldOutboundByProduct.get(code) || 0
        if (newQty < out - 1e-6) {
          return res.status(400).json({
            success: false,
            message: `商品 ${code} 修改后的数量(${newQty})低于已出库数量(${out})，不能保存`
          })
        }
      }
    }

    const updateData = {}
    if (order_number !== undefined) updateData.order_number = order_number
    if (contract_number !== undefined) updateData.contract_number = contract_number
    if (customer_name !== undefined) updateData.customer_name = customer_name
    if (customer_code !== undefined) updateData.customer_code = customer_code
    if (payment_method !== undefined) updateData.payment_method = payment_method
    if (sales_items !== undefined) updateData.sales_items = sales_items
    if (currency !== undefined) updateData.currency = currency
    if (exchange_rate !== undefined) updateData.exchange_rate = parseFloat(exchange_rate)
    if (entry_date !== undefined) updateData.entry_date = entry_date
    if (remarks !== undefined) updateData.remarks = remarks
    if (status !== undefined) updateData.status = parseInt(status)
    if (tax_included_amount !== undefined) updateData.tax_included_amount = parseFloat(tax_included_amount)
    if (expenses !== undefined) updateData.expenses = expenses
    if (sales_person !== undefined) updateData.sales_person = sales_person

    // 更新订单并重新生成采购/出库计划，整体走事务：
    // 生成器会按已出库/已采购量净出剩余待办数量，不会重置为全量
    const connection = await pool.getConnection()
    let order
    try {
      await connection.beginTransaction()

      order = await SalesOrder.update(id, updateData, connection)

      // 更新时重新生成采购计划
      await generatePurchasePlan(order, connection)

      // 更新时重新生成出库计划
      await generateOutboundPlan(order, connection)

      await connection.commit()
    } catch (txError) {
      await connection.rollback()
      throw txError
    } finally {
      connection.release()
    }

    res.json({ success: true, data: order })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作销售订单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const deleteSalesOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await SalesOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sales order not found' })
    }

    // 已有出库记录的销售订单不允许删除：
    // 出库单/应收/采购关联已生成，删除会让单据悬挂
    const shippedItems = parseSalesItems(existing.sales_items).some(it => (parseFloat(it.outbound_quantity) || 0) > 0)
    if (shippedItems) {
      return res.status(400).json({ success: false, message: '该销售订单已有出库记录，不能删除；请先处理相关出库单' })
    }
    const [relatedDeliveries] = await pool.query(
      'SELECT delivery_order_id FROM delivery_orders WHERE sales_order_id = ? LIMIT 1',
      [id]
    )
    if (relatedDeliveries.length > 0) {
      return res.status(400).json({ success: false, message: '该销售订单已生成出库单，不能删除；请先删除对应的出库单' })
    }

    // 删除销售订单时同步删除其自动生成的出库计划/采购计划，整体走事务，任一步失败全部回滚。
    // 否则计划残留会造成计划数量与销售订单数量不一致（如订单 100、出库计划 300）
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      await OutboundPlan.deleteBySalesOrderId(id, connection)
      await PurchasePlan.deleteBySalesOrderId(id, connection)
      await SalesOrder.delete(id, connection)

      await connection.commit()
    } catch (txError) {
      await connection.rollback()
      throw txError
    } finally {
      connection.release()
    }

    res.json({ success: true, message: 'Sales order deleted successfully' })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作销售订单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await SalesOrder.getNewOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作销售订单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getUndeliveredContractNumbers = async (req, res) => {
  try {
    const { customerName } = req.query

    // 构建查询条件
    let where = 'contract_number IS NOT NULL AND contract_number != ""'
    const params = []

    if (customerName) {
      where += ' AND customer_name = ?'
      params.push(customerName)
    }

    // 获取销售订单
    const orders = await SalesOrder.findAllWithStatus({
      where,
      orderBy: 'sales_date DESC',
      params
    })

    // 过滤出未出库或部分出库的订单（状态1或3）
    const undeliveredOrders = orders.filter(order => order.status === 1 || order.status === 3)

    // 提取合同号（去重）
    const contractNumbers = [...new Set(undeliveredOrders.map(order => order.contract_number))]

    res.json({ success: true, data: contractNumbers })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作销售订单')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getSalesItemsByContractNumber = async (req, res) => {
  try {
    const { contractNumber } = req.params

    if (!contractNumber) {
      return res.status(400).json({ success: false, message: '合同号不能为空' })
    }

    // 根据合同号查询销售订单
    const orders = await SalesOrder.findAllWithStatus({
      where: 'contract_number = ?',
      params: [contractNumber]
    })

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该合同号的销售订单' })
    }

    // 同一合同编号可能对应多张销售订单（分批生成），
    // 需要合并所有订单的商品（同一商品的数量累加），否则会漏掉其他订单里的商品
    const mergedItems = new Map()
    let fallbackKey = 0
    for (const order of orders) {
      let items = []
      try {
        items = JSON.parse(order.sales_items || '[]')
      } catch (e) {
        console.error('解析销售商品列表失败:', e)
      }

      for (const item of items) {
        const key = item.product_code || item.product_name || `__no_code_${fallbackKey++}`
        const existing = mergedItems.get(key)
        if (existing) {
          existing.quantity = (parseFloat(existing.quantity) || 0) + (parseFloat(item.quantity) || 0)
        } else {
          mergedItems.set(key, { ...item })
        }
      }
    }

    res.json({
      success: true,
      data: {
        order_number: orders[0].order_number,
        customer_name: orders[0].customer_name,
        sales_items: Array.from(mergedItems.values())
      }
    })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作销售订单')
    res.status(statusCode).json({ success: false, message })
  }
}
