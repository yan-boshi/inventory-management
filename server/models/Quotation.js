import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class Quotation extends BaseModel {
  constructor() {
    super('quotations', 'quotation_id')
  }

  async generateQuotationNumber() {
    const date = new Date()
    const fullDateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    // 年份取后两位 + 月日，共6位
    const dateStr = fullDateStr.slice(2)

    // 查询当天已有的报价单最大序号
    const query = `
      SELECT quotation_number
      FROM ${this.tableName}
      WHERE quotation_number LIKE ?
      ORDER BY quotation_number DESC
      LIMIT 1
    `
    const [result] = await pool.query(query, [`XSD-Q-${dateStr}-%`])

    let sequence = 1
    if (result.length > 0) {
      const lastNumber = result[0].quotation_number
      const lastSequence = parseInt(lastNumber.split('-').pop(), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `XSD-Q-${dateStr}-${sequence.toString().padStart(3, '0')}`
  }

  async create(data) {
    const quotationItems = data.quotation_items || '[]'
    let taxIncludedAmount = 0

    try {
      const items = typeof quotationItems === 'string' ? JSON.parse(quotationItems) : quotationItems
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
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 1,
      validity_period: data.validity_period || '自报价之日起10个工作日',
      delivery_method: data.delivery_method || '送货上门',
      tax_rate: data.tax_rate || 13,
      tax_included_amount: parseFloat(taxIncludedAmount.toFixed(2)) || 0,
      currency: data.currency || 'CNY',
      entry_date: data.entry_date || null,
      remarks: data.remarks || null
    }
    return super.create(orderData)
  }

  async update(id, data) {
    let taxIncludedAmount = null

    if (data.quotation_items !== undefined) {
      try {
        const items = typeof data.quotation_items === 'string' ? JSON.parse(data.quotation_items) : data.quotation_items
        taxIncludedAmount = items.reduce((sum, item) => {
          return sum + (parseFloat(item.total_amount) || 0)
        }, 0)
        data.tax_included_amount = parseFloat(taxIncludedAmount.toFixed(2)) || 0
      } catch (e) {
        console.error('Error parsing quotation_items:', e)
      }
    }

    return super.update(id, data)
  }
}

export default new Quotation()
