import Invoice from '../models/Invoice.js'

export const getAllInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      invoiceNumber,
      soNumber,
      buyerName,
      startDate,
      endDate
    } = req.query

    const where = []
    const params = []

    if (invoiceNumber) {
      where.push('invoice_number LIKE ?')
      params.push(`%${invoiceNumber}%`)
    }

    if (soNumber) {
      where.push('so_number LIKE ?')
      params.push(`%${soNumber}%`)
    }

    if (buyerName) {
      where.push('buyer_name LIKE ?')
      params.push(`%${buyerName}%`)
    }

    if (startDate && endDate) {
      where.push('invoice_date BETWEEN ? AND ?')
      params.push(startDate, endDate)
    } else if (startDate) {
      where.push('invoice_date >= ?')
      params.push(startDate)
    } else if (endDate) {
      where.push('invoice_date <= ?')
      params.push(endDate)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await Invoice.paginate({
      where: whereClause,
      orderBy: 'invoice_date DESC',
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

export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params
    const invoice = await Invoice.findById(id)
    if (!invoice) {
      return res.status(404).json({ success: false, message: '发票不存在' })
    }
    res.json({ success: true, data: invoice })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.create({
      ...req.body,
      created_by: req.user?.user_id
    })
    res.json({ success: true, data: invoice })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await Invoice.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '发票不存在' })
    }
    const invoice = await Invoice.update(id, req.body)
    res.json({ success: true, data: invoice })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await Invoice.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '发票不存在' })
    }
    await Invoice.delete(id)
    res.json({ success: true, message: '发票删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewInvoiceNumber = async (req, res) => {
  try {
    const invoiceNumber = await Invoice.generateInvoiceNumber()
    res.json({ success: true, data: invoiceNumber })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getInvoicesBySalesOrder = async (req, res) => {
  try {
    const { salesOrderId } = req.params
    const invoices = await Invoice.findBySalesOrderId(salesOrderId)
    res.json({ success: true, data: invoices })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
