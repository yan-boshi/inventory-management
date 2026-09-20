import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'

class Currency extends BaseModel {
  constructor() {
    super('currencies', 'currency_id')
  }

  async create(data) {
    const currencyData = {
      currency_id: generateUUID(),
      currency_code: data.currency_code,
      currency_name: data.currency_name,
      currency_symbol: data.currency_symbol,
      decimal_places: data.decimal_places ?? 2,
      is_base_currency: data.is_base_currency ?? 0,
      is_active: data.is_active ?? 1,
      sort_order: data.sort_order ?? 0,
    }
    return super.create(currencyData)
  }

  // 获取所有启用的币种（按排序号）
  async findAllActive() {
    return this.findAll({ where: 'is_active = 1', orderBy: 'sort_order ASC, currency_code ASC' })
  }
}

export default new Currency()
