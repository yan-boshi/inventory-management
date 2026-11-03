import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import { round4 } from '../utils/round.js'
import { nextSequence, localDateStr, localDateTime } from '../utils/sequence.js'

class Quotation extends BaseModel {
  constructor() {
    super('quotations', 'quotation_id')
  }

  async generateQuotationNumber() {
    return nextSequence(this.tableName, 'quotation_number', `XSD-Q-${localDateStr().slice(2)}-`)
  }

  // JSON 字段归一化：字符串原样保留，对象/数组序列化，避免 mysql2 把数组写成 '[object Object]'
  normalizeJson(value, fallback = '[]') {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'string') return value
    return JSON.stringify(value)
  }

  async create(data) {
    const quotationItems = this.normalizeJson(data.quotation_items)
    let taxIncludedAmount = 0

    try {
      const items = JSON.parse(quotationItems)
      taxIncludedAmount = items.reduce((sum, item) => {
        return sum + (parseFloat(item.total_amount) || 0)
      }, 0)
    } catch (e) {
      console.error('Error parsing quotation_items:', e)
    }

    const orderData = {
      quotation_id: generateUUID(),
      quotation_number: data.quotation_number || await this.generateQuotationNumber(),
      customer_name: data.customer_name,
      customer_code: data.customer_code,
      quotation_items: quotationItems,
      created_at: localDateTime(),
      status: 1,
      validity_period: data.validity_period || '自报价之日起10个工作日',
      delivery_method: data.delivery_method || '送货上门',
      tax_rate: data.tax_rate ?? 13,
      tax_included_amount: round4(taxIncludedAmount) || 0,
      currency: data.currency || 'CNY',
      payment_terms: data.payment_terms || null,
      trade_terms: data.trade_terms || null,
      entry_date: data.entry_date || null,
      remarks: data.remarks || null
    }
    return super.create(orderData)
  }

  async update(id, data) {
    let taxIncludedAmount = null

    if (data.quotation_items !== undefined) {
      data.quotation_items = this.normalizeJson(data.quotation_items)
      try {
        const items = JSON.parse(data.quotation_items)
        taxIncludedAmount = items.reduce((sum, item) => {
          return sum + (parseFloat(item.total_amount) || 0)
        }, 0)
        data.tax_included_amount = round4(taxIncludedAmount) || 0
      } catch (e) {
        console.error('Error parsing quotation_items:', e)
      }
    }

    return super.update(id, data)
  }
}

export default new Quotation()
