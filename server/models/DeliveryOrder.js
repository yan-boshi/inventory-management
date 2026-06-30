import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class DeliveryOrder extends BaseModel {
  constructor() {
    super('delivery_orders', 'delivery_order_id')
  }

  async generateOrderNumber() {
    const date = new Date()
    const fullDateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    // 年份取后两位 + 月日，共6位
    const dateStr = fullDateStr.slice(2)

    // 查询当天已有的出库单最大序号，避免并发冲突
    const query = `
      SELECT order_number
      FROM ${this.tableName}
      WHERE order_number LIKE ?
      ORDER BY order_number DESC
      LIMIT 1
    `
    const [result] = await pool.query(query, [`XSD-O-${dateStr}-%`])

    let sequence = 1
    if (result.length > 0) {
      const lastOrderNumber = result[0].order_number
      const lastSequence = parseInt(lastOrderNumber.split('-').pop(), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `XSD-O-${dateStr}-${sequence.toString().padStart(3, '0')}`
  }

  calculateTotal(items) {
    return items.reduce((total, item) => {
      return total + (item.quantity * item.tax_included_price || 0)
    }, 0)
  }

  async update(id, data) {
    // 处理商品数据
    if (data.delivery_items !== undefined) {
      const deliveryItems = typeof data.delivery_items === 'string' ? JSON.parse(data.delivery_items) : data.delivery_items
      const total = this.calculateTotal(deliveryItems)

      data.total_amount = total
      data.delivery_items = JSON.stringify(deliveryItems)
    }

    // 处理费用登记数据
    if (data.expenses !== undefined) {
      data.expenses = data.expenses ? JSON.stringify(data.expenses) : null
    }

    return super.update(id, data)
  }

  async create(data) {
    const deliveryItems = typeof data.delivery_items === 'string' ? JSON.parse(data.delivery_items) : (data.delivery_items || [])
    const expensesJson = data.expenses ? JSON.stringify(data.expenses) : null
    const totalAmount = this.calculateTotal(deliveryItems)

    // 处理商品数据
    const processedItems = deliveryItems.map((item, index) => ({
      ...item,
      no: index + 1
    }))

    const orderNumber = data.order_number || await this.generateOrderNumber()

    const orderData = {
      delivery_order_id: generateUUID(),
      order_number: orderNumber,
      contract_number: data.contract_number || null,
      customer_name: data.customer_name || '',
      customer_address: data.customer_address || '',
      delivery_items: JSON.stringify(processedItems),
      delivery_time: data.delivery_time || new Date().toISOString().slice(0, 16).replace('T', ' '),
      delivery_date: data.delivery_date || null,
      entry_date: data.entry_date || null,
      currency: data.currency || 'CNY',
      total_amount: totalAmount,
      expenses: expensesJson,
      tracking_number: data.tracking_number || null,
      delivery_person: data.delivery_person || '',
      contact_phone: data.contact_phone || '',
      remarks: data.remarks || null
    }

    return super.create(orderData)
  }

  // 获取未出库的销售订单
  async getUndeliveredSalesOrders() {
    try {
      // 查询状态为未出库或部分出库的销售订单
      const query = `
        SELECT sales_order_id, order_number, contract_number, customer_name,
               sales_items, currency, tax_included_amount, remarks
        FROM sales_orders
        WHERE status = '1' OR status = '3'
        ORDER BY created_at DESC
      `
      const [rows] = await pool.query(query)
      return rows
    } catch (error) {
      console.error('获取未出库销售订单失败:', error)
      throw error
    }
  }

  async getNewOrderNumber() {
    return await this.generateOrderNumber()
  }

  // 根据订单编号查询
  async findByOrderNumber(orderNumber) {
    return this.findOne('order_number = ?', [orderNumber])
  }
}

export default new DeliveryOrder()
