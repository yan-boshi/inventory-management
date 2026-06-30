import Quotation from '../models/Quotation.js'

export const getAllQuotations = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      customerName,
      customerCode,
      quotationNumber,
      startDate,
      endDate
    } = req.query

    const where = []
    const params = []

    if (quotationNumber) {
      where.push('quotation_number LIKE ?')
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
    const result = await Quotation.paginate({
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

export const getQuotationById = async (req, res) => {
  try {
    const { id } = req.params
    const quotation = await Quotation.findById(id)
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' })
    }
    res.json({ success: true, data: quotation })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createQuotation = async (req, res) => {
  try {
    const {
      customer_name,
      customer_code,
      quotation_items,
      validity_period,
      delivery_method,
      tax_rate,
      currency,
      remarks,
      tax_included_amount,
      entry_date
    } = req.body

    if (!customer_name || !customer_code) {
      return res.status(400).json({ success: false, message: 'Customer name and code are required' })
    }

    const quotation = await Quotation.create({
      customer_name,
      customer_code,
      quotation_items,
      validity_period,
      delivery_method,
      tax_rate: parseFloat(tax_rate) || 13,
      currency,
      remarks,
      tax_included_amount,
      entry_date
    })
    res.status(201).json({ success: true, data: quotation })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params
    const {
      quotation_number,
      customer_name,
      customer_code,
      quotation_items,
      validity_period,
      delivery_method,
      tax_rate,
      currency,
      remarks,
      tax_included_amount,
      entry_date
    } = req.body

    const existing = await Quotation.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found' })
    }

    const updateData = {}
    if (quotation_number !== undefined) updateData.quotation_number = quotation_number
    if (customer_name !== undefined) updateData.customer_name = customer_name
    if (customer_code !== undefined) updateData.customer_code = customer_code
    if (quotation_items !== undefined) updateData.quotation_items = quotation_items
    if (validity_period !== undefined) updateData.validity_period = validity_period
    if (delivery_method !== undefined) updateData.delivery_method = delivery_method
    if (tax_rate !== undefined) updateData.tax_rate = parseFloat(tax_rate)
    if (currency !== undefined) updateData.currency = currency
    if (remarks !== undefined) updateData.remarks = remarks
    if (tax_included_amount !== undefined) updateData.tax_included_amount = tax_included_amount
    if (entry_date !== undefined) updateData.entry_date = entry_date

    const quotation = await Quotation.update(id, updateData)
    res.json({ success: true, data: quotation })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await Quotation.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found' })
    }

    await Quotation.delete(id)
    res.json({ success: true, message: 'Quotation deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewQuotationNumber = async (req, res) => {
  try {
    const quotationNumber = await Quotation.generateQuotationNumber()
    res.json({ success: true, data: { quotation_number: quotationNumber } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
