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

    // 查询当天已有的入库单数量，生成递增数字
    const todayStart = `${dateString} 00:00:00`
    const todayEnd = `${dateString} 23:59:59`
    const countQuery = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE order_number LIKE ?
      AND created_at BETWEEN ? AND ?
    `
    const [result] = await pool.query(countQuery, [`XSD-W-${dateStr}%`, todayStart, todayEnd])
    const count = result[0]?.count || 0
    const sequence = (count + 1).toString().padStart(5, '0')

    return `XSD-W-${dateStr}${sequence}`
  }

  async create(data) {
    const warehousingItems = data.warehousing_items || '[]'
    const expenses = data.expenses ? JSON.stringify(data.expenses) : null

    const orderData = {
      warehousing_order_id: generateUUID(),
      order_number: await this.generateOrderNumber(),
      purchase_order_number: data.purchase_order_number || null,
      warehousing_items: warehousingItems,
      warehousing_time: data.warehousing_time || new Date().toISOString().slice(0, 16).replace('T', ' '),
      customer_name: data.customer_name || null,
      customer_address: data.customer_address || null,
      total_amount: data.total_amount || 0,
      currency: data.currency || 'CNY',
      warehousing_person: data.warehousing_person || null,
      contact_phone: data.contact_phone || null,
      remarks: data.remarks || null,
      expenses: expenses
    }
    return super.create(orderData)
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
