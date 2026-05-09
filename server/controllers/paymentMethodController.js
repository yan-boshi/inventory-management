import PaymentMethod from '../models/PaymentMethod.js'

export const getAllPaymentMethods = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, name } = req.query
    const where = []
    const params = []

    if (name) {
      where.push('payment_method_name LIKE ?')
      params.push(`%${name}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await PaymentMethod.paginate({
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

export const getPaymentMethodById = async (req, res) => {
  try {
    const { id } = req.params
    const method = await PaymentMethod.findById(id)
    if (!method) {
      return res.status(404).json({ success: false, message: 'Payment method not found' })
    }
    res.json({ success: true, data: method })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createPaymentMethod = async (req, res) => {
  try {
    const { payment_method_name, remarks } = req.body

    if (!payment_method_name) {
      return res.status(400).json({ success: false, message: 'Payment method name is required' })
    }

    const existing = await PaymentMethod.findOne('payment_method_name = ?', [payment_method_name])
    if (existing) {
      return res.status(400).json({ success: false, message: 'Payment method name already exists' })
    }

    const method = await PaymentMethod.create({ payment_method_name, remarks })
    res.status(201).json({ success: true, data: method })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params
    const { payment_method_name, remarks } = req.body

    const existing = await PaymentMethod.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Payment method not found' })
    }

    if (payment_method_name && payment_method_name !== existing.payment_method_name) {
      const duplicate = await PaymentMethod.findOne('payment_method_name = ?', [payment_method_name])
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Payment method name already exists' })
      }
    }

    const updateData = {}
    if (payment_method_name !== undefined) updateData.payment_method_name = payment_method_name
    if (remarks !== undefined) updateData.remarks = remarks

    const method = await PaymentMethod.update(id, updateData)
    res.json({ success: true, data: method })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await PaymentMethod.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Payment method not found' })
    }

    await PaymentMethod.delete(id)
    res.json({ success: true, message: 'Payment method deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getAllPaymentMethodsList = async (req, res) => {
  try {
    const methods = await PaymentMethod.findAll({ orderBy: 'payment_method_name ASC' })
    res.json({
      success: true,
      data: methods.map(m => ({
        payment_method_id: m.payment_method_id,
        payment_method_name: m.payment_method_name
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
