import Customer from '../models/Customer.js'

export const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, name, code } = req.query
    const where = []
    const params = []

    if (name) {
      where.push('customer_name LIKE ?')
      params.push(`%${name}%`)
    }

    if (code) {
      where.push('customer_code LIKE ?')
      params.push(`%${code}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await Customer.paginate({
      where: whereClause,
      orderBy: 'created_at DESC',
      page,
      pageSize,
      params
    })
    return res.json({
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

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params
    const customer = await Customer.findById(id)
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' })
    }
    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createCustomer = async (req, res) => {
  try {
    const {
      customer_name,
      customer_code,
      customer_tax_number,
      register_address,
      customer_phone,
      customer_email,
      bank_name,
      bank_account,
      bank_code,
      contact,
      contact_phone,
      receiver,
      receiver_address,
      remarks
    } = req.body

    if (!customer_name || !customer_code) {
      return res.status(400).json({ success: false, message: 'Customer name and code are required' })
    }

    const existing = await Customer.findOne('customer_code = ?', [customer_code])
    if (existing) {
      return res.status(400).json({ success: false, message: 'Customer code already exists' })
    }

    const customer = await Customer.create({
      customer_name,
      customer_code,
      customer_tax_number,
      register_address,
      customer_phone,
      customer_email,
      bank_name,
      bank_account,
      bank_code,
      contact,
      contact_phone,
      receiver,
      receiver_address,
      remarks
    })
    res.status(201).json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params
    const {
      customer_name,
      customer_code,
      customer_tax_number,
      register_address,
      customer_phone,
      customer_email,
      bank_name,
      bank_account,
      bank_code,
      contact,
      contact_phone,
      receiver,
      receiver_address,
      remarks
    } = req.body

    const existing = await Customer.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' })
    }

    if (customer_code && customer_code !== existing.customer_code) {
      const duplicate = await Customer.findOne('customer_code = ?', [customer_code])
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Customer code already exists' })
      }
    }

    const updateData = {}
    if (customer_name !== undefined) updateData.customer_name = customer_name
    if (customer_code !== undefined) updateData.customer_code = customer_code
    if (customer_tax_number !== undefined) updateData.customer_tax_number = customer_tax_number
    if (register_address !== undefined) updateData.register_address = register_address
    if (customer_phone !== undefined) updateData.customer_phone = customer_phone
    if (customer_email !== undefined) updateData.customer_email = customer_email
    if (bank_name !== undefined) updateData.bank_name = bank_name
    if (bank_account !== undefined) updateData.bank_account = bank_account
    if (bank_code !== undefined) updateData.bank_code = bank_code
    if (contact !== undefined) updateData.contact = contact
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone
    if (receiver !== undefined) updateData.receiver = receiver
    if (receiver_address !== undefined) updateData.receiver_address = receiver_address
    if (remarks !== undefined) updateData.remarks = remarks

    const customer = await Customer.update(id, updateData)
    res.json({ success: true, data: customer })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await Customer.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found' })
    }

    await Customer.delete(id)
    res.json({ success: true, message: 'Customer deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getAllCustomersList = async (req, res) => {
  try {
    const customers = await Customer.findAll({ orderBy: 'customer_name ASC' })
    res.json({
      success: true,
      data: customers.map(c => ({
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        customer_code: c.customer_code
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
