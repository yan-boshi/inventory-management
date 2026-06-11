import BaseModel from './BaseModel.js'
import pool from '../config/database.js'

class DeliveryOrder extends BaseModel {
  constructor() {
    super('delivery_orders', 'delivery_order_id')
  }

  async generateOrderNumber() {
    const date = new Date()
    const dateString = date.toISOString().slice(0, 10)
    const dateStr = dateString.replace(/-/g, '')

    // 查询当天已有的出库单数量，生成递增数字
    const todayStart = `${dateString} 00:00:00`
    const todayEnd = `${dateString} 23:59:59`
    const countQuery = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE order_number LIKE ?
      AND created_at BETWEEN ? AND ?
    `
    const [result] = await pool.query(countQuery, [`XSD-O-${dateStr}%`, todayStart, todayEnd])
    const count = result[0]?.count || 0
    const sequence = (count + 1).toString().padStart(5, '0')

    return `XSD-O-${dateStr}${sequence}`
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

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
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

    const orderNumber = await this.generateOrderNumber()

    const orderData = {
      delivery_order_id: this.generateUUID(),
      order_number: orderNumber,
      sales_order_number: data.sales_order_number || null,
      customer_name: data.customer_name || '',
      customer_address: data.customer_address || '',
      delivery_items: JSON.stringify(processedItems),
      delivery_time: data.delivery_time || new Date().toISOString().slice(0, 16).replace('T', ' '),
      delivery_date: data.delivery_date || null,
      currency: data.currency || 'CNY',
      total_amount: totalAmount,
      expenses: expensesJson,
      delivery_person: data.delivery_person || '',
      contact_phone: data.contact_phone || '',
      remarks: data.remarks || null
    }

    return super.create(orderData)
  }

  // 获取未出库的销售订单
  async getUndeliveredSalesOrders() {
    try {
      const query = `
        SELECT so.sales_order_id, so.order_number, so.customer_name,
               so.sales_items, so.currency, so.tax_included_amount, so.remarks
        FROM sales_orders so
        LEFT JOIN delivery_orders do ON so.order_number = do.sales_order_number
        WHERE so.status = '1' OR so.status = '3'
        ORDER BY so.created_at DESC
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
