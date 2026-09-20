import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'

class CustomsExchangeRate extends BaseModel {
  constructor() {
    super('customs_exchange_rates', 'customs_exchange_rate_id')
  }

  async create(data) {
    const rateData = {
      customs_exchange_rate_id: generateUUID(),
      source_currency: data.source_currency,
      target_currency: data.target_currency,
      rate: data.rate,
      effective_month: data.effective_month,
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

  // 获取指定币种对在指定月的海关汇率
  async findRate(sourceCurrency, targetCurrency, effectiveMonth) {
    return this.findOne(
      'source_currency = ? AND target_currency = ? AND effective_month = ?',
      [sourceCurrency, targetCurrency, effectiveMonth]
    )
  }

  // 获取某月的所有海关汇率
  async findByMonth(effectiveMonth) {
    return this.findAll({ where: 'effective_month = ?', params: [effectiveMonth], orderBy: 'source_currency ASC, target_currency ASC' })
  }

  // 获取所有海关汇率（带分页和筛选）
  async paginateWithFilter(options = {}) {
    const { page = 1, pageSize = 20, source_currency, target_currency, effective_month } = options

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
    if (effective_month) {
      where += ' AND effective_month = ?'
      params.push(effective_month)
    }

    return this.paginate({ page, pageSize, where, params, orderBy: 'effective_month DESC, source_currency ASC' })
  }
}

export default new CustomsExchangeRate()
