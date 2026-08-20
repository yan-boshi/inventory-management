import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class InboundReturnOrder extends BaseModel {
  constructor() {
    super('inbound_return_orders', 'inbound_return_id')
  }

  async generateOrderNumber() {
    const date = new Date()
    const fullDateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const dateStr = fullDateStr.slice(2)

    const query = `
      SELECT order_number
      FROM ${this.tableName}
      WHERE order_number LIKE ?
      ORDER BY order_number DESC
      LIMIT 1
    `
    const [result] = await pool.query(query, [`XSD-IR-${dateStr}-%`])

    let sequence = 1
    if (result.length > 0) {
      const lastOrderNumber = result[0].order_number
      const lastSequence = parseInt(lastOrderNumber.split('-').pop(), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `XSD-IR-${dateStr}-${sequence.toString().padStart(3, '0')}`
  }

  calculateTotal(items) {
    if (!items || !Array.isArray(items)) return 0
    return items.reduce((sum, item) => sum + (parseFloat(item.total_price) || parseFloat(item.quantity) * parseFloat(item.tax_included_price) || 0), 0)
  }

  async create(data) {
    const returnItems = data.return_items || '[]'
    const items = typeof returnItems === 'string' ? JSON.parse(returnItems) : returnItems
    const totalAmount = data.total_amount || this.calculateTotal(items)

    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const orderData = {
          inbound_return_id: generateUUID(),
          order_number: data.order_number || await this.generateOrderNumber(),
          source_order_id: data.source_order_id || null,
          source_order_number: data.source_order_number || null,
          contract_number: data.contract_number || null,
          supplier_name: data.supplier_name || null,
          supplier_code: data.supplier_code || null,
          return_items: typeof returnItems === 'string' ? returnItems : JSON.stringify(returnItems),
          total_amount: totalAmount,
          return_time: data.return_time || new Date().toISOString().slice(0, 16).replace('T', ' '),
          entry_date: data.entry_date || null,
          currency: data.currency || 'CNY',
          return_person: data.return_person || null,
          reason: data.reason || null,
          remarks: data.remarks || null
        }
        return await super.create(orderData)
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && attempt < maxRetries - 1) {
          console.warn(`订单号冲突，重试第 ${attempt + 1} 次...`)
          continue
        }
        throw error
      }
    }
  }

  async update(id, data) {
    let updateData = { ...data }

    if (data.return_items !== undefined) {
      const items = typeof data.return_items === 'string' ? JSON.parse(data.return_items) : data.return_items
      updateData.return_items = typeof data.return_items === 'string' ? data.return_items : JSON.stringify(data.return_items)
      if (!data.total_amount) {
        updateData.total_amount = this.calculateTotal(items)
      }
    }

    return super.update(id, updateData)
  }
}

export default new InboundReturnOrder()
