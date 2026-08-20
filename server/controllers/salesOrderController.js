import SalesOrder from '../models/SalesOrder.js'
import { generateFromSalesOrder as generatePurchasePlan } from './purchasePlanController.js'
import { generateFromSalesOrder as generateOutboundPlan } from './outboundPlanController.js'

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
      params.push(`%${orderNumber}%`)
    }

    if (customerName) {
      where.push('customer_name LIKE ?')
      params.push(`%${customerName}%`)
    }

    if (customerCode) {
      where.push('customer_code LIKE ?')
      params.push(`%${customerCode}%`)
    }

    if (contractNumber) {
      where.push('contract_number LIKE ?')
      params.push(`%${contractNumber}%`)
    }

    if (productName) {
      where.push('sales_items LIKE ?')
      params.push(`%${productName}%`)
    }

    if (productCode) {
      where.push('sales_items LIKE ?')
      params.push(`%${productCode}%`)
    }

    if (productModel) {
      where.push('sales_items LIKE ?')
      params.push(`%${productModel}%`)
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
    res.status(500).json({ success: false, message: error.message })
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
    res.status(500).json({ success: false, message: error.message })
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

    const order = await SalesOrder.create({
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
    })
    res.status(201).json({ success: true, data: order })

    // 自动生成采购计划
    generatePurchasePlan(order).catch(err =>
      console.error('Auto generate purchase plan failed:', err)
    )

    // 自动生成出库计划
    generateOutboundPlan(order).catch(err =>
      console.error('Auto generate outbound plan failed:', err)
    )
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
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

    const order = await SalesOrder.update(id, updateData)
    res.json({ success: true, data: order })

    // 自动生成采购计划（更新时重新生成）
    generatePurchasePlan(order).catch(err =>
      console.error('Auto regenerate purchase plan failed:', err)
    )

    // 自动生成出库计划（更新时重新生成）
    generateOutboundPlan(order).catch(err =>
      console.error('Auto regenerate outbound plan failed:', err)
    )
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteSalesOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await SalesOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sales order not found' })
    }

    await SalesOrder.delete(id)
    res.json({ success: true, message: 'Sales order deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await SalesOrder.getNewOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
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
    res.status(500).json({ success: false, message: error.message })
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

    // 获取最新的订单
    const order = orders[0]

    // 解析销售商品列表
    let salesItems = []
    try {
      salesItems = JSON.parse(order.sales_items || '[]')
    } catch (e) {
      console.error('解析销售商品列表失败:', e)
    }

    res.json({
      success: true,
      data: {
        order_number: order.order_number,
        customer_name: order.customer_name,
        sales_items: salesItems
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
