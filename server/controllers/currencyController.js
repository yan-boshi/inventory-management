import Currency from '../models/Currency.js'

// 获取币种列表（分页）
export const getAllCurrencies = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, currency_code, currency_name, is_active } = req.query
    const where = []
    const params = []

    if (currency_code) {
      where.push('currency_code LIKE ?')
      params.push(`%${currency_code}%`)
    }
    if (currency_name) {
      where.push('currency_name LIKE ?')
      params.push(`%${currency_name}%`)
    }
    if (is_active !== undefined && is_active !== '') {
      where.push('is_active = ?')
      params.push(Number(is_active))
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await Currency.paginate({
      where: whereClause,
      orderBy: 'sort_order ASC, currency_code ASC',
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

// 获取所有启用的币种（下拉用）
export const getActiveCurrencies = async (req, res) => {
  try {
    const currencies = await Currency.findAllActive()
    res.json({ success: true, data: currencies })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取单个币种
export const getCurrencyById = async (req, res) => {
  try {
    const { id } = req.params
    const currency = await Currency.findById(id)
    if (!currency) {
      return res.status(404).json({ success: false, message: '币种不存在' })
    }
    res.json({ success: true, data: currency })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 创建币种
export const createCurrency = async (req, res) => {
  try {
    const { currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, is_active, sort_order } = req.body

    if (!currency_code || !currency_name || !currency_symbol) {
      return res.status(400).json({ success: false, message: '币种代码、名称和符号不能为空' })
    }

    // 检查币种代码是否重复
    const existing = await Currency.findOne('currency_code = ?', [currency_code.toUpperCase()])
    if (existing) {
      return res.status(400).json({ success: false, message: '该币种代码已存在' })
    }

    // 如果设置为基础币种，取消其他基础币种
    if (is_base_currency) {
      const currentBase = await Currency.findOne('is_base_currency = 1', [])
      if (currentBase) {
        await Currency.update(currentBase.currency_id, { is_base_currency: 0 })
      }
    }

    const currency = await Currency.create({
      currency_code: currency_code.toUpperCase(),
      currency_name,
      currency_symbol,
      decimal_places,
      is_base_currency,
      is_active,
      sort_order
    })

    res.status(201).json({ success: true, data: currency })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 更新币种
export const updateCurrency = async (req, res) => {
  try {
    const { id } = req.params
    const { currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, is_active, sort_order } = req.body

    const existing = await Currency.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '币种不存在' })
    }

    // 检查币种代码是否重复
    if (currency_code && currency_code.toUpperCase() !== existing.currency_code) {
      const duplicate = await Currency.findOne('currency_code = ?', [currency_code.toUpperCase()])
      if (duplicate) {
        return res.status(400).json({ success: false, message: '该币种代码已存在' })
      }
    }

    // 如果设置为基础币种，取消其他基础币种
    if (is_base_currency && !existing.is_base_currency) {
      const currentBase = await Currency.findOne('is_base_currency = 1', [])
      if (currentBase) {
        await Currency.update(currentBase.currency_id, { is_base_currency: 0 })
      }
    }

    const updateData = {}
    if (currency_code !== undefined) updateData.currency_code = currency_code.toUpperCase()
    if (currency_name !== undefined) updateData.currency_name = currency_name
    if (currency_symbol !== undefined) updateData.currency_symbol = currency_symbol
    if (decimal_places !== undefined) updateData.decimal_places = decimal_places
    if (is_base_currency !== undefined) updateData.is_base_currency = is_base_currency
    if (is_active !== undefined) updateData.is_active = is_active
    if (sort_order !== undefined) updateData.sort_order = sort_order

    const currency = await Currency.update(id, updateData)
    res.json({ success: true, data: currency })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 删除币种
export const deleteCurrency = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await Currency.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '币种不存在' })
    }

    // 基础币种不允许删除
    if (existing.is_base_currency) {
      return res.status(400).json({ success: false, message: '基础币种不能删除' })
    }

    await Currency.delete(id)
    res.json({ success: true, message: '币种删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
