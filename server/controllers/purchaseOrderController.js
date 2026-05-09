import PurchaseOrder from '../models/PurchaseOrder.js'

export const getAllPurchaseOrders = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      supplierName,
      supplierCode,
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

    if (supplierName) {
      where.push('supplier_name LIKE ?')
      params.push(`%${supplierName}%`)
    }

    if (supplierCode) {
      where.push('supplier_code LIKE ?')
      params.push(`%${supplierCode}%`)
    }

    if (startDate && endDate) {
      where.push('created_at BETWEEN ? AND ?')
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`)
    } else if (startDate) {
      where.push('created_at >= ?')
      params.push(`${startDate} 00:00:00`)
    } else if (endDate) {
      where.push('created_at <= ?')
      params.push(`${endDate} 23:59:59`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await PurchaseOrder.paginate({
      where: whereClause,
      orderBy: 'created_at DESC',
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

export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await PurchaseOrder.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createPurchaseOrder = async (req, res) => {
  try {
    const {
      supplier_name,
      supplier_code,
      payment_method,
      business_category,
      product_name,
      model,
      description,
      product_code,
      unit,
      quantity,
      tax_included_price,
      tax_rate,
      currency,
      exchange_rate,
      delivery_date,
      arrival_date,
      remarks,
      contract_number
    } = req.body

    if (!supplier_name || !supplier_code) {
      return res.status(400).json({ success: false, message: 'Supplier name and code are required' })
    }

    const order = await PurchaseOrder.create({
      supplier_name,
      supplier_code,
      payment_method,
      business_category,
      product_name,
      model,
      description,
      product_code,
      unit,
      quantity: parseFloat(quantity),
      tax_included_price: parseFloat(tax_included_price),
      tax_rate: parseFloat(tax_rate) || 0.13,
      currency,
      exchange_rate: parseFloat(exchange_rate) || 1.0,
      delivery_date,
      arrival_date,
      remarks,
      contract_number
    })
    res.status(201).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params
    const {
      supplier_name,
      supplier_code,
      payment_method,
      business_category,
      product_name,
      model,
      description,
      product_code,
      unit,
      quantity,
      tax_included_price,
      tax_rate,
      currency,
      exchange_rate,
      delivery_date,
      arrival_date,
      remarks,
      contract_number
    } = req.body

    const existing = await PurchaseOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }

    const updateData = {}
    if (supplier_name !== undefined) updateData.supplier_name = supplier_name
    if (supplier_code !== undefined) updateData.supplier_code = supplier_code
    if (payment_method !== undefined) updateData.payment_method = payment_method
    if (business_category !== undefined) updateData.business_category = business_category
    if (product_name !== undefined) updateData.product_name = product_name
    if (model !== undefined) updateData.model = model
    if (description !== undefined) updateData.description = description
    if (product_code !== undefined) updateData.product_code = product_code
    if (unit !== undefined) updateData.unit = unit
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity)
    if (tax_included_price !== undefined) updateData.tax_included_price = parseFloat(tax_included_price)
    if (tax_rate !== undefined) updateData.tax_rate = parseFloat(tax_rate)
    if (currency !== undefined) updateData.currency = currency
    if (exchange_rate !== undefined) updateData.exchange_rate = parseFloat(exchange_rate)
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date
    if (arrival_date !== undefined) updateData.arrival_date = arrival_date
    if (remarks !== undefined) updateData.remarks = remarks
    if (contract_number !== undefined) updateData.contract_number = contract_number

    // Recalculate tax values if needed
    if (quantity !== undefined || tax_included_price !== undefined || tax_rate !== undefined) {
      const taxExcludedPrice = PurchaseOrder.calculateTaxExcludedPrice(
        updateData.tax_included_price || existing.tax_included_price,
        updateData.tax_rate || existing.tax_rate
      )
      const taxIncludedAmount = PurchaseOrder.calculateTaxIncludedAmount(
        updateData.quantity || existing.quantity,
        updateData.tax_included_price || existing.tax_included_price
      )
      const taxExcludedAmount = PurchaseOrder.calculateTaxExcludedAmount(
        updateData.quantity || existing.quantity,
        taxExcludedPrice
      )
      const taxAmount = PurchaseOrder.calculateTaxAmount(
        taxIncludedAmount,
        updateData.tax_rate || existing.tax_rate
      )

      updateData.tax_excluded_price = taxExcludedPrice
      updateData.tax_included_amount = taxIncludedAmount
      updateData.tax_excluded_amount = taxExcludedAmount
      updateData.tax_amount = taxAmount
    }

    const order = await PurchaseOrder.update(id, updateData)
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await PurchaseOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }

    await PurchaseOrder.delete(id)
    res.json({ success: true, message: 'Purchase order deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const returnPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await PurchaseOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }

    const updated = await PurchaseOrder.update(id, { is_returned: true })
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = PurchaseOrder.generateOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}