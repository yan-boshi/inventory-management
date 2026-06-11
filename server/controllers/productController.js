import Product from '../models/Product.js'

export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, name, code } = req.query
    const where = []
    const params = []

    if (name) {
      where.push('product_name LIKE ?')
      params.push(`%${name}%`)
    }

    if (code) {
      where.push('product_code LIKE ?')
      params.push(`%${code}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await Product.paginate({
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

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params
    const product = await Product.findById(id)
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }
    res.json({ success: true, data: product })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createProduct = async (req, res) => {
  try {
    const { product_name, model, description, product_code, unit, stock, tax_included_price, tax_excluded_price, remarks } = req.body

    if (!product_name || !product_code) {
      return res.status(400).json({ success: false, message: 'Product name and code are required' })
    }

    const existing = await Product.findOne('product_code = ?', [product_code])
    if (existing) {
      return res.status(400).json({ success: false, message: 'Product code already exists' })
    }

    const product = await Product.create({ product_name, model, description, product_code, unit, stock, tax_included_price, tax_excluded_price, remarks })
    res.status(201).json({ success: true, data: product })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params
    const { product_name, model, description, product_code, unit, stock, tax_included_price, tax_excluded_price, remarks } = req.body

    const existing = await Product.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    if (product_code && product_code !== existing.product_code) {
      const duplicate = await Product.findOne('product_code = ?', [product_code])
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Product code already exists' })
      }
    }

    const updateData = {}
    if (product_name !== undefined) updateData.product_name = product_name
    if (model !== undefined) updateData.model = model
    if (description !== undefined) updateData.description = description
    if (product_code !== undefined) updateData.product_code = product_code
    if (unit !== undefined) updateData.unit = unit
    if (stock !== undefined) updateData.stock = stock
    if (tax_included_price !== undefined) updateData.tax_included_price = tax_included_price
    if (tax_excluded_price !== undefined) updateData.tax_excluded_price = tax_excluded_price
    if (remarks !== undefined) updateData.remarks = remarks

    const product = await Product.update(id, updateData)
    res.json({ success: true, data: product })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await Product.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    await Product.delete(id)
    res.json({ success: true, message: 'Product deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getAllProductsList = async (req, res) => {
  try {
    const products = await Product.findAll({ orderBy: 'product_name ASC' })
    res.json({
      success: true,
      data: products.map(p => ({
        product_id: p.product_id,
        product_name: p.product_name,
        product_code: p.product_code,
        model: p.model,
        description: p.description,
        unit: p.unit
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
