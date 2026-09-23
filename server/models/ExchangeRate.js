import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'

class ExchangeRate extends BaseModel {
  constructor() {
    super('exchange_rates', 'exchange_rate_id')
  }

  async create(data) {
    const rateData = {
      exchange_rate_id: generateUUID(),
      source_currency: data.source_currency,
      target_currency: data.target_currency,
      rate: data.rate,
      effective_week: data.effective_week,
      remarks: data.remarks || null,
      created_by: data.created_by || null,
    }
    return super.create(rateData)
  }

  async update(id, data) {
    const updateData = {}
    if (data.rate !== undefined) updateData.rate = data.rate
    if (data.remarks !== undefined) updateData.remarks = data.remarks
    return super.update(id, updateData)
  }

  // 获取指定币种对在指定周的汇率
  async findRate(sourceCurrency, targetCurrency, effectiveWeek) {
    return this.findOne(
      'source_currency = ? AND target_currency = ? AND effective_week = ?',
      [sourceCurrency, targetCurrency, effectiveWeek]
    )
  }

  // 查找 effective_week <= targetDate 的最新汇率
  // 跨月时汇率只生效当月的日期：effective_week 和 targetDate 必须在同一月份
  async findLatestRate(sourceCurrency, targetCurrency, targetDate) {
    // targetDate 格式: 'YYYY-MM-DD'
    const targetMonth = targetDate.slice(0, 7) // 'YYYY-MM'
    const results = await this.findAll({
      where: 'source_currency = ? AND target_currency = ? AND effective_week <= ? AND DATE_FORMAT(effective_week, \'%Y-%m\') = ?',
      params: [sourceCurrency, targetCurrency, targetDate, targetMonth],
      orderBy: 'effective_week DESC',
      limit: '1'
    })
    return results[0] || null
  }

  // 获取某周的所有汇率
  async findByWeek(effectiveWeek) {
    return this.findAll({ where: 'effective_week = ?', params: [effectiveWeek], orderBy: 'source_currency ASC, target_currency ASC' })
  }

  // 获取所有汇率（带分页和筛选）
  async paginateWithFilter(options = {}) {
    const { page = 1, pageSize = 20, source_currency, target_currency, effective_week } = options

    let where = '1=1'
    const params = []

    if (source_currency) {
      where += ' AND source_currency = ?'
      params.push(source_currency)
    }
    if (target_currency) {
      where += ' AND target_currency = ?'
      params.push(target_currency)
    }
    if (effective_week) {
      where += ' AND effective_week = ?'
      params.push(effective_week)
    }

    return this.paginate({ page, pageSize, where, params, orderBy: 'effective_week DESC, source_currency ASC' })
  }
}

export default new ExchangeRate()
