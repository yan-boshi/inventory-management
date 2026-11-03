import ExchangeRate from '../models/ExchangeRate.js'
import Currency from '../models/Currency.js'
import { generateUUID } from '../utils/uuid.js'
import { handleDbError } from '../utils/errorHandler.js'

// 获取本周周一日期（本地时区拼接，避免 toISOString 的 UTC 串日）
function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// 获取汇率列表（分页）
export const getAllExchangeRates = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, source_currency, target_currency, effective_week } = req.query
    const result = await ExchangeRate.paginateWithFilter({
      page,
      pageSize,
      source_currency,
      target_currency,
      effective_week
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
    const { statusCode, message } = handleDbError(error, '操作汇率')
    res.status(statusCode).json({ success: false, message })
  }
}

// 获取单个汇率
export const getExchangeRateById = async (req, res) => {
  try {
    const { id } = req.params
    const rate = await ExchangeRate.findById(id)
    if (!rate) {
      return res.status(404).json({ success: false, message: '汇率不存在' })
    }
    res.json({ success: true, data: rate })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作汇率')
    res.status(statusCode).json({ success: false, message })
  }
}

// 创建汇率
export const createExchangeRate = async (req, res) => {
  try {
    const { source_currency, target_currency, rate, effective_week, remarks } = req.body

    if (!source_currency || !target_currency || !rate || !effective_week) {
      return res.status(400).json({ success: false, message: '源币种、目标币种、汇率和生效日期不能为空' })
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

    // effective_week 必须是周一（按字符串构造 UTC 日期判断星期，不受服务器时区影响，
    // 否则西半球下合法周一会被 new Date('YYYY-MM-DD').getDay() 误判成周日）
    const weekMatch = String(effective_week).match(/^(\d{4})-(\d{2})-(\d{2})/)
    const weekDay = weekMatch
      ? new Date(Date.UTC(+weekMatch[1], +weekMatch[2] - 1, +weekMatch[3])).getUTCDay()
      : new Date(effective_week).getDay()
    if (weekDay !== 1) {
      return res.status(400).json({ success: false, message: '生效日期必须选择周一的日期' })
    }
    const weekStr = effective_week.slice(0, 10)

    // 检查是否已存在
    const existing = await ExchangeRate.findRate(source_currency, target_currency, weekStr)
    if (existing) {
      return res.status(400).json({ success: false, message: '该币种对在该周已有汇率记录' })
    }

    const exchangeRate = await ExchangeRate.create({
      source_currency,
      target_currency,
      rate: parseFloat(rate),
      effective_week: weekStr,
      remarks,
      created_by: req.user?.user_id || null
    })

    res.status(201).json({ success: true, data: exchangeRate })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作汇率')
    res.status(statusCode).json({ success: false, message })
  }
}

// 更新汇率
export const updateExchangeRate = async (req, res) => {
  try {
    const { id } = req.params
    const { rate, remarks } = req.body

    const existing = await ExchangeRate.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '汇率不存在' })
    }

    const updateData = {}
    if (rate !== undefined) updateData.rate = parseFloat(rate)
    if (remarks !== undefined) updateData.remarks = remarks

    const exchangeRate = await ExchangeRate.update(id, updateData)
    res.json({ success: true, data: exchangeRate })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作汇率')
    res.status(statusCode).json({ success: false, message })
  }
}

// 删除汇率
export const deleteExchangeRate = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await ExchangeRate.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '汇率不存在' })
    }

    await ExchangeRate.delete(id)
    res.json({ success: true, message: '汇率删除成功' })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作汇率')
    res.status(statusCode).json({ success: false, message })
  }
}

// 查询指定币种对的汇率（给订单表单用，支持按日期查找最近生效的汇率）
export const getCurrentRate = async (req, res) => {
  try {
    const { source_currency, target_currency, date } = req.query

    if (!source_currency || !target_currency) {
      return res.status(400).json({ success: false, message: '源币种和目标币种不能为空' })
    }

    // 相同币种返回1
    if (source_currency === target_currency) {
      return res.json({ success: true, data: { rate: 1.0 } })
    }

    // 用本地时区的"今天"（toISOString 是 UTC，凌晨 0-8 点会串到昨天、周一凌晨取到上周汇率）
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const targetDate = date || todayStr

    // 精确匹配 source->target 方向
    const rate = await ExchangeRate.findLatestRate(source_currency, target_currency, targetDate)
    if (rate) {
      return res.json({ success: true, data: rate })
    }

    res.json({ success: true, data: null, message: '尚未设置该币种对的汇率' })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作汇率')
    res.status(statusCode).json({ success: false, message })
  }
}

// 获取某一周的所有汇率
export const getWeekRates = async (req, res) => {
  try {
    const { effective_week } = req.query
    if (!effective_week) {
      return res.status(400).json({ success: false, message: '生效日期不能为空' })
    }

    const rates = await ExchangeRate.findByWeek(effective_week)
    res.json({ success: true, data: rates })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作汇率')
    res.status(statusCode).json({ success: false, message })
  }
}
