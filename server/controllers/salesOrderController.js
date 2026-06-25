import SalesOrder from '../models/SalesOrder.js'

export const getAllSalesOrders = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      customerName,
      customerCode,
      orderNumber,
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

    // 退货时回退已出库的库存
    const salesItems = JSON.parse(existing.sales_items || '[]')
    const { default: pool } = await import('../config/database.js')
    for (const item of salesItems) {
      if (item.outbound_quantity && item.outbound_quantity > 0 && item.product_code) {
        const [productResult] = await pool.query(
          'SELECT stock FROM products WHERE product_code = ?',
          [item.product_code]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const newStock = currentStock + parseFloat(item.outbound_quantity)
          await pool.query(
            'UPDATE products SET stock = ? WHERE product_code = ?',
            [newStock.toFixed(2), item.product_code]
          )
        }
      }
    }

    // 重置销售项的出库数量和状态
    const resetItems = salesItems.map(item => ({
      ...item,
      outbound_quantity: 0,
      status: 1
    }))

    const updated = await SalesOrder.update(id, {
      status: 4,
      sales_items: JSON.stringify(resetItems)
    })
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
