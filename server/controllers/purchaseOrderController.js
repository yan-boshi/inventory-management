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
    const result = await PurchaseOrder.paginateWithStatus({
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
    // 计算动态状态
    const status = await PurchaseOrder.calculateStatus(id)
    res.json({ success: true, data: { ...order, status } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_name, supplier_code, purchase_items, currency, exchange_rate, entry_date, remarks, contract_number, expenses, purchase_person } = req.body

    if (!supplier_name || !supplier_code) {
      return res.status(400).json({ success: false, message: 'Supplier name and code are required' })
    }

    if (!purchase_items || !Array.isArray(purchase_items) || purchase_items.length === 0) {
      return res.status(400).json({ success: false, message: 'Purchase items are required' })
    }

    const order = await PurchaseOrder.create({
      supplier_name,
      supplier_code,
      purchase_items,
      currency,
      exchange_rate: parseFloat(exchange_rate) || 1.0,
      entry_date,
      remarks,
      contract_number,
      expenses,
      purchase_person
    })
    res.status(201).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params
    const { supplier_name, supplier_code, purchase_items, currency, exchange_rate, entry_date, remarks, contract_number, expenses, purchase_person } = req.body

    const existing = await PurchaseOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }

    const updateData = {}
    if (supplier_name !== undefined) updateData.supplier_name = supplier_name
    if (supplier_code !== undefined) updateData.supplier_code = supplier_code
    if (currency !== undefined) updateData.currency = currency
    if (exchange_rate !== undefined) updateData.exchange_rate = parseFloat(exchange_rate) || 1.0
    if (entry_date !== undefined) updateData.entry_date = entry_date
    if (remarks !== undefined) updateData.remarks = remarks
    if (contract_number !== undefined) updateData.contract_number = contract_number
    if (expenses !== undefined) updateData.expenses = expenses
    if (purchase_person !== undefined) updateData.purchase_person = purchase_person

    if (purchase_items !== undefined) {
      if (!Array.isArray(purchase_items) || purchase_items.length === 0) {
        return res.status(400).json({ success: false, message: 'Purchase items must be a non-empty array' })
      }

      const calculatedItems = purchase_items.map((item) => {
        const taxRateDecimal = item.tax_rate / 100
        const taxExcludedPrice = PurchaseOrder.calculateTaxExcludedPrice(item.tax_included_price, taxRateDecimal)
        const taxIncludedAmount = PurchaseOrder.calculateTaxIncludedAmount(item.quantity, item.tax_included_price)
        const taxExcludedAmount = PurchaseOrder.calculateTaxExcludedAmount(item.quantity, taxExcludedPrice)
        const taxAmount = PurchaseOrder.calculateTaxAmount(taxIncludedAmount, taxRateDecimal)

        return {
          ...item,
          tax_excluded_price: taxExcludedPrice,
          tax_included_amount: taxIncludedAmount,
          tax_excluded_amount: taxExcludedAmount,
          tax_amount: taxAmount,
          total_price: taxIncludedAmount
        }
      })

      updateData.purchase_items = JSON.stringify(calculatedItems)
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

export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status || ![1, 2, 3, 4].includes(parseInt(status))) {
      return res.status(400).json({ success: false, message: 'Status must be 1 (not warehoused), 2 (fully warehoused), 3 (partially warehoused), or 4 (returned)' })
    }

    const existing = await PurchaseOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }

    const updated = await PurchaseOrder.updateStatus(id, parseInt(status))
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