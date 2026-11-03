import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import { nextSequence, localDateStr, localDateTime } from '../utils/sequence.js'

class WarehousingOrder extends BaseModel {
  constructor() {
    super('warehousing_orders', 'warehousing_order_id')
  }

  async generateOrderNumber() {
    return nextSequence(this.tableName, 'order_number', `XSD-W-${localDateStr().slice(2)}-`)
  }

  async create(data, conn) {
    const warehousingItems = typeof data.warehousing_items === 'string'
      ? (data.warehousing_items || '[]')
      : JSON.stringify(data.warehousing_items || [])
    const expenses = data.expenses ? JSON.stringify(data.expenses) : null

    // 重试机制，处理并发生成相同订单号的情况
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const orderData = {
          warehousing_order_id: generateUUID(),
          order_number: data.order_number || await this.generateOrderNumber(),
          contract_number: data.contract_number || null,
          purchase_order_id: data.purchase_order_id || null,
          warehousing_items: warehousingItems,
          warehousing_time: data.warehousing_time || localDateTime().slice(0, 16),
          entry_date: data.entry_date || null,
          tracking_number: data.tracking_number || null,
          customer_name: data.customer_name || null,
          customer_address: data.customer_address || null,
          total_amount: data.total_amount || 0,
          currency: data.currency || 'CNY',
          exchange_rate: data.exchange_rate || null,
          warehousing_person: data.warehousing_person || null,
          contact_phone: data.contact_phone || null,
          remarks: data.remarks || null,
          expenses: expenses,
          plan_deductions: JSON.stringify(data.plan_deductions || [])
        }
        return await super.create(orderData, conn)
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

  async update(id, data, conn) {
    let updateData = { ...data }

    if (data.warehousing_items !== undefined) {
      updateData.warehousing_items = typeof data.warehousing_items === 'string'
        ? data.warehousing_items
        : JSON.stringify(data.warehousing_items)
    }

    if (data.warehousing_time !== undefined) {
      updateData.warehousing_time = data.warehousing_time
    }

    if (data.expenses !== undefined) {
      updateData.expenses = data.expenses ? JSON.stringify(data.expenses) : null
    }

    if (data.plan_deductions !== undefined && typeof data.plan_deductions !== 'string') {
      updateData.plan_deductions = JSON.stringify(data.plan_deductions)
    }

    return super.update(id, updateData, conn)
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
