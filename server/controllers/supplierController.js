import Supplier from '../models/Supplier.js'

export const getAllSuppliers = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, name, code } = req.query
    const where = []
    const params = []

    if (name) {
      where.push('supplier_name LIKE ?')
      params.push(`%${name}%`)
    }

    if (code) {
      where.push('supplier_code LIKE ?')
      params.push(`%${code}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await Supplier.paginate({
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

export const getSupplierById = async (req, res) => {
  try {
    console.log('req.params', req.params.id)
    const { id } = req.params.id
    const supplier = await Supplier.findById(id)
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' })
    }
    res.json({ success: true, data: supplier })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createSupplier = async (req, res) => {
  try {
    const {
      supplier_name,
      supplier_code,
      supplier_tax_number,
      register_address,
      supplier_phone,
      supplier_email,
      bank_name,
      bank_account,
      bank_code,
      contact,
      contact_phone,
      remarks
    } = req.body

    if (!supplier_name || !supplier_code) {
      return res.status(400).json({ success: false, message: 'Supplier name and code are required' })
    }

    const existing = await Supplier.findOne('supplier_code = ?', [supplier_code])
    if (existing) {
      return res.status(400).json({ success: false, message: 'Supplier code already exists' })
    }

    const supplier = await Supplier.create({
      supplier_name,
      supplier_code,
      supplier_tax_number,
      register_address,
      supplier_phone,
      supplier_email,
      bank_name,
      bank_account,
      bank_code,
      contact,
      contact_phone,
      remarks
    })
    res.status(201).json({ success: true, data: supplier })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params
    const {
      supplier_name,
      supplier_code,
      supplier_tax_number,
      register_address,
      supplier_phone,
      supplier_email,
      bank_name,
      bank_account,
      bank_code,
      contact,
      contact_phone,
      remarks
    } = req.body

    const existing = await Supplier.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' })
    }

    if (supplier_code && supplier_code !== existing.supplier_code) {
      const duplicate = await Supplier.findOne('supplier_code = ?', [supplier_code])
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Supplier code already exists' })
      }
    }

    const updateData = {}
    if (supplier_name !== undefined) updateData.supplier_name = supplier_name
    if (supplier_code !== undefined) updateData.supplier_code = supplier_code
    if (supplier_tax_number !== undefined) updateData.supplier_tax_number = supplier_tax_number
    if (register_address !== undefined) updateData.register_address = register_address
    if (supplier_phone !== undefined) updateData.supplier_phone = supplier_phone
    if (supplier_email !== undefined) updateData.supplier_email = supplier_email
    if (bank_name !== undefined) updateData.bank_name = bank_name
    if (bank_account !== undefined) updateData.bank_account = bank_account
    if (bank_code !== undefined) updateData.bank_code = bank_code
    if (contact !== undefined) updateData.contact = contact
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone
    if (remarks !== undefined) updateData.remarks = remarks

    const supplier = await Supplier.update(id, updateData)
    res.json({ success: true, data: supplier })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await Supplier.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' })
    }

    await Supplier.delete(id)
    res.json({ success: true, message: 'Supplier deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getAllSuppliersList = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({ orderBy: 'supplier_name ASC' })
    res.json({
      success: true,
      data: suppliers.map(s => ({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        supplier_code: s.supplier_code
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
