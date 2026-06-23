import ProductClassification from '../models/ProductClassification.js'

// 获取分类列表（分页）
export const getAllProductClassifications = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, name } = req.query
    const where = []
    const params = []

    if (name) {
      where.push('classification_name LIKE ?')
      params.push(`%${name}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await ProductClassification.paginate({
      where: whereClause,
      orderBy: 'created_at DESC',
      page,
      pageSize,
      params
    })

    res.json({
      success: true,
      data: ProductClassification.parseList(result.data),
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

// 获取所有分类（下拉选择）
export const getAllProductClassificationsList = async (req, res) => {
  try {
    const classifications = await ProductClassification.findAll({ orderBy: 'classification_name ASC' })
    res.json({
      success: true,
      data: classifications.map(c => ({
        product_classification_id: c.product_classification_id,
        classification_name: c.classification_name
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取单个分类详情
export const getProductClassificationById = async (req, res) => {
  try {
    const { id } = req.params
    const classification = await ProductClassification.findById(id)
    if (!classification) {
      return res.status(404).json({ success: false, message: '产品分类不存在' })
    }
    res.json({ success: true, data: ProductClassification.parseClassificationData(classification) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 创建分类
export const createProductClassification = async (req, res) => {
  try {
    const { classification_name, classification_data, description, remarks } = req.body

    if (!classification_name) {
      return res.status(400).json({ success: false, message: '分类方案名称不能为空' })
    }

    const existing = await ProductClassification.findOne('classification_name = ?', [classification_name])
    if (existing) {
      return res.status(400).json({ success: false, message: '分类方案名称已存在' })
    }

    const classification = await ProductClassification.create({
      classification_name,
      classification_data: classification_data || {},
      description,
      creator: req.user?.username || null,
      remarks
    })

    res.status(201).json({ success: true, data: ProductClassification.parseClassificationData(classification) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 更新分类
export const updateProductClassification = async (req, res) => {
  try {
    const { id } = req.params
    const { classification_name, classification_data, description, remarks } = req.body

    const existing = await ProductClassification.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '产品分类不存在' })
    }

    if (classification_name && classification_name !== existing.classification_name) {
      const duplicate = await ProductClassification.findOne('classification_name = ?', [classification_name])
      if (duplicate) {
        return res.status(400).json({ success: false, message: '分类方案名称已存在' })
      }
    }

    const updateData = {}
    if (classification_name !== undefined) updateData.classification_name = classification_name
    if (classification_data !== undefined) updateData.classification_data = classification_data
    if (description !== undefined) updateData.description = description
    if (remarks !== undefined) updateData.remarks = remarks

    const classification = await ProductClassification.update(id, updateData)
    res.json({ success: true, data: ProductClassification.parseClassificationData(classification) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 删除分类
export const deleteProductClassification = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await ProductClassification.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '产品分类不存在' })
    }

    await ProductClassification.delete(id)
    res.json({ success: true, message: '产品分类删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ==================== 一级分类操作 ====================

// 新增一级分类
export const addLevel1 = async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ success: false, message: '一级分类名称不能为空' })
    }

    const classification = await ProductClassification.findById(id)
    if (!classification) {
      return res.status(404).json({ success: false, message: '产品分类不存在' })
    }

    const data = ProductClassification.parseClassificationData(classification).classification_data
    if (data[name]) {
      return res.status(400).json({ success: false, message: '同级下已存在相同名称的分类' })
    }

    data[name] = {}
    await ProductClassification.update(id, { classification_data: data })

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 编辑一级分类
export const updateLevel1 = async (req, res) => {
  try {
    const { id, oldName } = req.params
    const { new_name } = req.body

    if (!new_name) {
      return res.status(400).json({ success: false, message: '一级分类名称不能为空' })
    }

    const classification = await ProductClassification.findById(id)
    if (!classification) {
      return res.status(404).json({ success: false, message: '产品分类不存在' })
    }

    const data = ProductClassification.parseClassificationData(classification).classification_data
    if (!data[oldName]) {
      return res.status(404).json({ success: false, message: '一级分类不存在' })
    }

    if (oldName !== new_name && data[new_name]) {
      return res.status(400).json({ success: false, message: '同级下已存在相同名称的分类' })
    }

    if (oldName !== new_name) {
      data[new_name] = data[oldName]
      delete data[oldName]
    }

    await ProductClassification.update(id, { classification_data: data })
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 删除一级分类
export const deleteLevel1 = async (req, res) => {
  try {
    const { id, name } = req.params

    const classification = await ProductClassification.findById(id)
    if (!classification) {
      return res.status(404).json({ success: false, message: '产品分类不存在' })
    }

    const data = ProductClassification.parseClassificationData(classification).classification_data
    if (!data[name]) {
      return res.status(404).json({ success: false, message: '一级分类不存在' })
    }

    delete data[name]
    await ProductClassification.update(id, { classification_data: data })
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// ==================== 二级分类操作 ====================

// 新增二级分类
export const addLevel2 = async (req, res) => {
  try {
    const { id, level1Name } = req.params
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ success: false, message: '二级分类名称不能为空' })
    }

    const classification = await ProductClassification.findById(id)
    if (!classification) {
      return res.status(404).json({ success: false, message: '产品分类不存在' })
    }

    const data = ProductClassification.parseClassificationData(classification).classification_data
    if (!data[level1Name]) {
      return res.status(404).json({ success: false, message: '一级分类不存在' })
    }

    if (data[level1Name][name]) {
      return res.status(400).json({ success: false, message: '同级下已存在相同名称的分类' })
    }

    data[level1Name][name] = name
    await ProductClassification.update(id, { classification_data: data })
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 编辑二级分类
export const updateLevel2 = async (req, res) => {
  try {
    const { id, level1Name, oldName } = req.params
    const { new_name } = req.body

    if (!new_name) {
      return res.status(400).json({ success: false, message: '二级分类名称不能为空' })
    }

    const classification = await ProductClassification.findById(id)
    if (!classification) {
      return res.status(404).json({ success: false, message: '产品分类不存在' })
    }

    const data = ProductClassification.parseClassificationData(classification).classification_data
    if (!data[level1Name]) {
      return res.status(404).json({ success: false, message: '一级分类不存在' })
    }

    if (!data[level1Name][oldName]) {
      return res.status(404).json({ success: false, message: '二级分类不存在' })
    }

    if (oldName !== new_name && data[level1Name][new_name]) {
      return res.status(400).json({ success: false, message: '同级下已存在相同名称的分类' })
    }

    if (oldName !== new_name) {
      data[level1Name][new_name] = data[level1Name][oldName]
      delete data[level1Name][oldName]
    }

    await ProductClassification.update(id, { classification_data: data })
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 删除二级分类
export const deleteLevel2 = async (req, res) => {
  try {
    const { id, level1Name, name } = req.params

    const classification = await ProductClassification.findById(id)
    if (!classification) {
      return res.status(404).json({ success: false, message: '产品分类不存在' })
    }

    const data = ProductClassification.parseClassificationData(classification).classification_data
    if (!data[level1Name]) {
      return res.status(404).json({ success: false, message: '一级分类不存在' })
    }

    if (!data[level1Name][name]) {
      return res.status(404).json({ success: false, message: '二级分类不存在' })
    }

    delete data[level1Name][name]
    await ProductClassification.update(id, { classification_data: data })
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

