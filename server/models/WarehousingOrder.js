import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class WarehousingOrder extends BaseModel {
  constructor() {
    super('warehousing_orders', 'warehousing_order_id')
  }

  async generateOrderNumber() {
    const date = new Date()
    const dateString = date.toISOString().slice(0, 10)
    const dateStr = dateString.replace(/-/g, '')

    // 查询当天已有的入库单最大序号，避免并发冲突
    const query = `
      SELECT order_number
      FROM ${this.tableName}
      WHERE order_number LIKE ?
      ORDER BY order_number DESC
      LIMIT 1
    `
    const [result] = await pool.query(query, [`XSD-W-${dateStr}%`])

    let sequence = 1
    if (result.length > 0) {
      const lastOrderNumber = result[0].order_number
      const lastSequence = parseInt(lastOrderNumber.slice(-5), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `XSD-W-${dateStr}${sequence.toString().padStart(5, '0')}`
  }

  async create(data) {
    const warehousingItems = data.warehousing_items || '[]'
    const expenses = data.expenses ? JSON.stringify(data.expenses) : null

    // 重试机制，处理并发生成相同订单号的情况
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const orderData = {
          warehousing_order_id: generateUUID(),
          order_number: await this.generateOrderNumber(),
          contract_number: data.contract_number || null,
          warehousing_items: warehousingItems,
          warehousing_time: data.warehousing_time || new Date().toISOString().slice(0, 16).replace('T', ' '),
          entry_date: data.entry_date || null,
          tracking_number: data.tracking_number || null,
          customer_name: data.customer_name || null,
          customer_address: data.customer_address || null,
          total_amount: data.total_amount || 0,
          currency: data.currency || 'CNY',
          warehousing_person: data.warehousing_person || null,
          contact_phone: data.contact_phone || null,
          remarks: data.remarks || null,
          expenses: expenses
        }
        return await super.create(orderData)
      } catch (error) {
        // 如果是唯一约束冲突且还有重试次数，则重试
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

    if (data.warehousing_items !== undefined) {
      updateData.warehousing_items = data.warehousing_items
    }

    if (data.warehousing_time !== undefined) {
      updateData.warehousing_time = data.warehousing_time
    }

    if (data.expenses !== undefined) {
      updateData.expenses = data.expenses ? JSON.stringify(data.expenses) : null
    }

    return super.update(id, updateData)
  }

  async getNewOrderNumber() {
    return await this.generateOrderNumber()
  }

  // Parse expenses JSON to object
  parseExpenses(expenses) {
    try {
      return expenses ? JSON.parse(expenses) : {}
    } catch {
      return {}
    }
  }

  // Format expenses object to JSON
  formatExpenses(expenses) {
    return expenses ? JSON.stringify(expenses) : null
  }
}

export default new WarehousingOrder()
