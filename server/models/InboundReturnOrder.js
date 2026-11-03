import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'
import { nextSequence, localDateStr, localDateTime } from '../utils/sequence.js'

class InboundReturnOrder extends BaseModel {
  constructor() {
    super('inbound_return_orders', 'inbound_return_id')
  }

  async generateOrderNumber() {
    return nextSequence(this.tableName, 'order_number', `XSD-IR-${localDateStr().slice(2)}-`)
  }

  calculateTotal(items) {
    if (!items || !Array.isArray(items)) return 0
    return items.reduce((sum, item) => sum + (parseFloat(item.total_price) || parseFloat(item.quantity) * parseFloat(item.tax_included_price) || 0), 0)
  }

  async create(data, conn = pool) {
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
          return_time: data.return_time || localDateTime().slice(0, 16),
          entry_date: data.entry_date || null,
          currency: data.currency || 'CNY',
          return_person: data.return_person || null,
          reason: data.reason || null,
          remarks: data.remarks || null
        }
        return await super.create(orderData, conn)
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && attempt < maxRetries - 1) {
          console.warn(`订单号冲突，重试第 ${attempt + 1} 次...`)
          continue
        }
        throw error
      }
    }
  }

  async update(id, data, conn = pool) {
    let updateData = { ...data }

    if (data.return_items !== undefined) {
      const items = typeof data.return_items === 'string' ? JSON.parse(data.return_items) : data.return_items
      updateData.return_items = typeof data.return_items === 'string' ? data.return_items : JSON.stringify(data.return_items)
      if (!data.total_amount) {
        updateData.total_amount = this.calculateTotal(items)
      }
    }

    return super.update(id, updateData, conn)
  }
}

export default new InboundReturnOrder()
