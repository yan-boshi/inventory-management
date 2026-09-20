import CustomsExchangeRate from '../models/CustomsExchangeRate.js'
import Currency from '../models/Currency.js'
import { generateUUID } from '../utils/uuid.js'

// 获取本月1日日期
function getFirstDayOfMonth(date) {
  const d = new Date(date)
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

// 获取海关汇率列表（分页）
export const getAllCustomsExchangeRates = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, source_currency, target_currency, effective_month } = req.query
    const result = await CustomsExchangeRate.paginateWithFilter({
      page,
      pageSize,
      source_currency,
      target_currency,
      effective_month
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

// 获取单个海关汇率
export const getCustomsExchangeRateById = async (req, res) => {
  try {
    const { id } = req.params
    const rate = await CustomsExchangeRate.findById(id)
    if (!rate) {
      return res.status(404).json({ success: false, message: '海关汇率不存在' })
    }
    res.json({ success: true, data: rate })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 创建海关汇率
export const createCustomsExchangeRate = async (req, res) => {
  try {
    const { source_currency, target_currency, rate, effective_month, remarks } = req.body

    if (!source_currency || !target_currency || !rate || !effective_month) {
      return res.status(400).json({ success: false, message: '源币种、目标币种、汇率和生效月不能为空' })
    }

    if (source_currency === target_currency) {
      return res.status(400).json({ success: false, message: '源币种和目标币种不能相同' })
    }

    // 验证币种是否存在
    const sourceExists = await Currency.findOne('currency_code = ?', [source_currency])
    const targetExists = await Currency.findOne('currency_code = ?', [target_currency])
    if (!sourceExists || !targetExists) {
      return res.status(400).json({ success: false, message: '币种不存在' })
    }

    // effective_month 必须是每月1日
    const monthDate = new Date(effective_month)
    if (monthDate.getDate() !== 1) {
      return res.status(400).json({ success: false, message: '生效月必须选择每月1日的日期' })
    }
    const monthStr = effective_month.slice(0, 10)

    // 检查是否已存在
    const existing = await CustomsExchangeRate.findRate(source_currency, target_currency, monthStr)
    if (existing) {
      return res.status(400).json({ success: false, message: '该币种对在该月已有海关汇率记录' })
    }

    const customsRate = await CustomsExchangeRate.create({
      source_currency,
      target_currency,
      rate: parseFloat(rate),
      effective_month: monthStr,
      remarks,
      created_by: req.user?.user_id || null
    })

    res.status(201).json({ success: true, data: customsRate })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 更新海关汇率
export const updateCustomsExchangeRate = async (req, res) => {
  try {
    const { id } = req.params
    const { rate, remarks } = req.body

    const existing = await CustomsExchangeRate.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '海关汇率不存在' })
    }

    const updateData = {}
    if (rate !== undefined) updateData.rate = parseFloat(rate)
    if (remarks !== undefined) updateData.remarks = remarks

    const customsRate = await CustomsExchangeRate.update(id, updateData)
    res.json({ success: true, data: customsRate })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 删除海关汇率
export const deleteCustomsExchangeRate = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await CustomsExchangeRate.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '海关汇率不存在' })
    }

    await CustomsExchangeRate.delete(id)
    res.json({ success: true, message: '海关汇率删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 查询指定币种对当前月的海关汇率（给订单表单用）
export const getCurrentCustomsRate = async (req, res) => {
  try {
    const { source_currency, target_currency } = req.query

    if (!source_currency || !target_currency) {
      return res.status(400).json({ success: false, message: '源币种和目标币种不能为空' })
    }

    // 相同币种返回1
    if (source_currency === target_currency) {
      return res.json({ success: true, data: { rate: 1.0 } })
    }

    const today = new Date()
    const firstDay = getFirstDayOfMonth(today)

    const rate = await CustomsExchangeRate.findRate(source_currency, target_currency, firstDay)
    if (!rate) {
      return res.json({ success: true, data: null, message: '本月尚未设置该币种对的海关汇率' })
    }

    res.json({ success: true, data: rate })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取某月的所有海关汇率
export const getMonthRates = async (req, res) => {
  try {
    const { effective_month } = req.query
    if (!effective_month) {
      return res.status(400).json({ success: false, message: '生效月不能为空' })
    }

    const rates = await CustomsExchangeRate.findByMonth(effective_month)
    res.json({ success: true, data: rates })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
