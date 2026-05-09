import BusinessCategory from '../models/BusinessCategory.js'

export const getAllBusinessCategories = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, name } = req.query
    const where = []
    const params = []

    if (name) {
      where.push('business_category_name LIKE ?')
      params.push(`%${name}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await BusinessCategory.paginate({
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

export const getBusinessCategoryById = async (req, res) => {
  try {
    const { id } = req.params
    const category = await BusinessCategory.findById(id)
    if (!category) {
      return res.status(404).json({ success: false, message: 'Business category not found' })
    }
    res.json({ success: true, data: category })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createBusinessCategory = async (req, res) => {
  try {
    const { business_category_name, remarks } = req.body

    if (!business_category_name) {
      return res.status(400).json({ success: false, message: 'Business category name is required' })
    }

    const existing = await BusinessCategory.findOne('business_category_name = ?', [business_category_name])
    if (existing) {
      return res.status(400).json({ success: false, message: 'Business category name already exists' })
    }

    const category = await BusinessCategory.create({ business_category_name, remarks })
    res.status(201).json({ success: true, data: category })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateBusinessCategory = async (req, res) => {
  try {
    const { id } = req.params
    const { business_category_name, remarks } = req.body

    const existing = await BusinessCategory.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Business category not found' })
    }

    if (business_category_name && business_category_name !== existing.business_category_name) {
      const duplicate = await BusinessCategory.findOne('business_category_name = ?', [business_category_name])
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Business category name already exists' })
      }
    }

    const updateData = {}
    if (business_category_name !== undefined) updateData.business_category_name = business_category_name
    if (remarks !== undefined) updateData.remarks = remarks

    const category = await BusinessCategory.update(id, updateData)
    res.json({ success: true, data: category })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteBusinessCategory = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await BusinessCategory.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Business category not found' })
    }

    await BusinessCategory.delete(id)
    res.json({ success: true, message: 'Business category deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getAllBusinessCategoriesList = async (req, res) => {
  try {
    const categories = await BusinessCategory.findAll({ orderBy: 'business_category_name ASC' })
    res.json({
      success: true,
      data: categories.map(c => ({
        business_category_id: c.business_category_id,
        business_category_name: c.business_category_name
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
