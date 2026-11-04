import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'
import { round4 } from '../utils/round.js'
import { nextSequence, localDateStr, localDateTime } from '../utils/sequence.js'

class DeliveryOrder extends BaseModel {
  constructor() {
    super('delivery_orders', 'delivery_order_id')
  }

  async generateOrderNumber() {
    return nextSequence(this.tableName, 'order_number', `XSD-O-${localDateStr().slice(2)}-`)
  }

  calculateTotal(items) {
    // 金额求和走 round4，避免浮点累加与 DECIMAL(15,4) 落库值产生 0.0001 级偏差
    return round4(items.reduce((total, item) => {
      return total + (item.quantity * item.tax_included_price || 0)
    }, 0))
  }

  async update(id, data, conn) {
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

    // 计划扣减记录
    if (data.plan_deductions !== undefined && typeof data.plan_deductions !== 'string') {
      data.plan_deductions = JSON.stringify(data.plan_deductions)
    }

    return super.update(id, data, conn)
  }

  async create(data, conn) {
    const deliveryItems = typeof data.delivery_items === 'string' ? JSON.parse(data.delivery_items) : (data.delivery_items || [])
    const expensesJson = data.expenses ? JSON.stringify(data.expenses) : null
    const totalAmount = this.calculateTotal(deliveryItems)

    // 处理商品数据
    const processedItems = deliveryItems.map((item, index) => ({
      ...item,
      no: index + 1
    }))

    // 取号撞号（ER_DUP_ENTRY）重试：每次重试重新取号，不复用已冲突的编号
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const orderData = {
          delivery_order_id: generateUUID(),
          order_number: data.order_number || await this.generateOrderNumber(),
          contract_number: data.contract_number || null,
          sales_order_id: data.sales_order_id || null,
          customer_name: data.customer_name || '',
          customer_address: data.customer_address || '',
          delivery_items: JSON.stringify(processedItems),
          delivery_time: data.delivery_time || localDateTime().slice(0, 16),
          delivery_date: data.delivery_date || null,
          entry_date: data.entry_date || null,
          currency: data.currency || 'CNY',
          exchange_rate: data.exchange_rate || 1.0,
          total_amount: totalAmount,
          expenses: expensesJson,
          plan_deductions: JSON.stringify(data.plan_deductions || []),
          tracking_number: data.tracking_number || null,
          delivery_person: data.delivery_person || '',
          contact_phone: data.contact_phone || '',
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
