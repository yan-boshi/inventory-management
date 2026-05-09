import SalesOrder from '../models/SalesOrder.js'

export const getAllSalesOrders = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      customerName,
      customerCode,
      quotationNumber,
      salesDate
    } = req.query

    const where = []
    const params = []

    if (quotationNumber) {
      where.push('order_number LIKE ?')
      params.push(`%${quotationNumber}%`)
    }

    if (customerName) {
      where.push('customer_name LIKE ?')
      params.push(`%${customerName}%`)
    }

    if (customerCode) {
      where.push('customer_code LIKE ?')
      params.push(`%${customerCode}%`)
    }

    if (salesDate) {
      where.push('sales_date >= ?')
      params.push(salesDate)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await SalesOrder.paginate({
      where: whereClause,
      orderBy: 'sales_date DESC',
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
    res.json({ success: true, data: order })
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
      delivery_date,
      remarks,
      tax_included_amount
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
      delivery_date,
      remarks,
      tax_included_amount
    })
    res.status(201).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateSalesOrder = async (req, res) => {
  try {
    const { id } = req.params
    const {
      contract_number,
      customer_name,
      customer_code,
      payment_method,
      sales_items,
      currency,
      exchange_rate,
      delivery_date,
      remarks,
      status,
      tax_included_amount
    } = req.body

    const existing = await SalesOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sales order not found' })
    }

    const updateData = {}
    if (contract_number !== undefined) updateData.contract_number = contract_number
    if (customer_name !== undefined) updateData.customer_name = customer_name
    if (customer_code !== undefined) updateData.customer_code = customer_code
    if (payment_method !== undefined) updateData.payment_method = payment_method
    if (sales_items !== undefined) updateData.sales_items = sales_items
    if (currency !== undefined) updateData.currency = currency
    if (exchange_rate !== undefined) updateData.exchange_rate = parseFloat(exchange_rate)
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date
    if (remarks !== undefined) updateData.remarks = remarks
    if (status !== undefined) updateData.status = parseInt(status)
    if (tax_included_amount !== undefined) updateData.tax_included_amount = parseFloat(tax_included_amount)

    const order = await SalesOrder.update(id, updateData)
    res.json({ success: true, data: order })
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

export const returnSalesOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await SalesOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sales order not found' })
    }

    const updated = await SalesOrder.update(id, { status: 2 })
    res.json({ success: true, data: updated })
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
