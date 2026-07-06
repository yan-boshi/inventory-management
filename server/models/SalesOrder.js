import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class SalesOrder extends BaseModel {
  constructor() {
    super('sales_orders', 'sales_order_id')
  }

  async generateOrderNumber() {
    const date = new Date()
    const fullDateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    // 年份取后两位 + 月日，共6位
    const dateStr = fullDateStr.slice(2)

    // 查询当天已有的销售订单最大序号
    const query = `
      SELECT order_number
      FROM ${this.tableName}
      WHERE order_number LIKE ?
      ORDER BY order_number DESC
      LIMIT 1
    `
    const [result] = await pool.query(query, [`XSD-S-${dateStr}-%`])

    let sequence = 1
    if (result.length > 0) {
      const lastOrderNumber = result[0].order_number
      const lastSequence = parseInt(lastOrderNumber.split('-').pop(), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `XSD-S-${dateStr}-${sequence.toString().padStart(3, '0')}`
  }

  calculateTaxExcludedPrice(taxIncludedPrice, taxRate) {
    if (!taxIncludedPrice || !taxRate) return 0
    return parseFloat((taxIncludedPrice / (1 + taxRate)).toFixed(2))
  }

  calculateTaxIncludedAmount(quantity, taxIncludedPrice) {
    if (!quantity || !taxIncludedPrice) return 0
    return parseFloat((quantity * taxIncludedPrice).toFixed(2))
  }

  calculateTaxExcludedAmount(quantity, taxExcludedPrice) {
    if (!quantity || !taxExcludedPrice) return 0
    return parseFloat((quantity * taxExcludedPrice).toFixed(2))
  }

  calculateTaxAmount(taxIncludedAmount, taxRate) {
    if (!taxIncludedAmount || !taxRate) return 0
    return parseFloat(((taxIncludedAmount / (1 + taxRate)) * taxRate).toFixed(2))
  }

  async create(data) {
    const salesItemsRaw = data.sales_items || '[]'
    const expensesJson = data.expenses ? JSON.stringify(data.expenses) : null

    // 初始化每个商品行的 outbound_quantity 和 status
    let processedSalesItems = salesItemsRaw
    if (typeof salesItemsRaw === 'string') {
      try {
        const items = JSON.parse(salesItemsRaw)
        const processedItems = items.map((item, index) => ({
          ...item,
          no: item.no || index + 1,
          outbound_quantity: item.outbound_quantity || 0,
          status: item.status || 1
        }))
        processedSalesItems = JSON.stringify(processedItems)
      } catch (e) {
        // 解析失败时保持原样
      }
    }

    const orderData = {
      sales_order_id: generateUUID(),
      order_number: data.order_number || await this.generateOrderNumber(),
      contract_number: data.contract_number || null,
      customer_name: data.customer_name,
      customer_code: data.customer_code,
      payment_method: data.payment_method,
      sales_items: processedSalesItems,
      sales_date: new Date().toISOString().slice(0, 10),
      status: 1,
      tax_included_amount: data.tax_included_amount || 0,
      currency: data.currency || 'CNY',
      exchange_rate: parseFloat(data.exchange_rate) || 1.0,
      entry_date: data.entry_date || null,
      remarks: data.remarks || null,
      expenses: expensesJson,
      sales_person: data.sales_person || null
    }
    return super.create(orderData)
  }

  async update(id, data) {
    let taxIncludedAmount = null

    if (data.sales_items !== undefined) {
      try {
        const items = typeof data.sales_items === 'string' ? JSON.parse(data.sales_items) : data.sales_items
        taxIncludedAmount = items.reduce((sum, item) => {
          return sum + (parseFloat(item.tax_included_amount) || 0)
        }, 0)
        data.tax_included_amount = parseFloat(taxIncludedAmount.toFixed(2)) || 0
      } catch (e) {
        console.error('Error parsing sales_items:', e)
      }
    }

    if (data.expenses !== undefined) {
      data.expenses = data.expenses ? JSON.stringify(data.expenses) : null
    }

    return super.update(id, data)
  }

  async getNewOrderNumber() {
    return await this.generateOrderNumber()
  }

  /**
   * 根据商品行状态推导订单整体状态
   * @param {Array} salesItems - 销售商品列表
   * @returns {number} 状态值: 1=未出库, 2=已全部出库, 3=已部分出库
   */
  deriveOrderStatus(salesItems) {
    const statuses = salesItems.map(item => item.status || 1)
    if (statuses.every(s => s === 2)) return 2
    if (statuses.some(s => s === 2 || s === 3)) return 3
    return 1
  }

  /**
   * 计算销售订单的出库状态（读取已存储的商品行状态）
   * @param {string} orderId - 销售订单ID
   * @returns {number} 状态值: 1=未出库, 2=已全部出库, 3=已部分出库, 4=退货
   */
  async calculateStatus(orderId) {
    try {
      const order = await this.findById(orderId)
      if (!order) return 1

      // 退货状态直接返回（兼容数据库中 string 和 number 两种类型）
      if (String(order.status) === '4') return 4

      // 从 sales_items 中读取每个商品的已存储状态
      const salesItems = JSON.parse(order.sales_items || '[]')
      if (salesItems.length === 0) return 1

      return this.deriveOrderStatus(salesItems)
    } catch (error) {
      console.error('计算销售订单状态失败:', error)
      return 1
    }
  }

  /**
   * 获取所有销售订单（带动态计算的状态）
   */
  async findAllWithStatus(options = {}) {
    const { where = '', orderBy = 'created_at DESC', params = [] } = options

    let query = `SELECT * FROM ${this.tableName}`
    if (where) {
      query += ` WHERE ${where}`
    }
    query += ` ORDER BY ${orderBy}`

    const [rows] = await pool.query(query, params)

    // 为每个订单计算状态
    const ordersWithStatus = await Promise.all(
      rows.map(async (order) => {
        const status = await this.calculateStatus(order.sales_order_id)
        return { ...order, status }
      })
    )

    return ordersWithStatus
  }

  /**
   * 分页获取销售订单（带动态计算的状态）
   */
  async paginateWithStatus(options = {}) {
    const { where = '', orderBy = 'created_at DESC', page = 1, pageSize = 10, params = [] } = options

    // 验证分页参数
    const validPage = Math.max(1, parseInt(page) || 1)
    const validPageSize = Math.min(1000, Math.max(1, parseInt(pageSize) || 10))

    // 验证排序字段（只允许字母、数字、下划线、逗号、空格、ASC、DESC）
    const sanitizedOrderBy = orderBy.replace(/[^a-zA-Z0-9_,\s]/g, '') || 'sales_date DESC'

    // 查询总数
    let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`
    if (where) {
      countQuery += ` WHERE ${where}`
    }
    const [countResult] = await pool.query(countQuery, params)
    const total = countResult[0]?.total || 0

    // 查询分页数据
    const offset = (validPage - 1) * validPageSize
    let query = `SELECT * FROM ${this.tableName}`
    if (where) {
      query += ` WHERE ${where}`
    }
    query += ` ORDER BY ${sanitizedOrderBy} LIMIT ? OFFSET ?`

    const [rows] = await pool.query(query, [...params, validPageSize, offset])

    // 为每个订单计算状态
    const ordersWithStatus = await Promise.all(
      rows.map(async (order) => {
        const status = await this.calculateStatus(order.sales_order_id)
        return { ...order, status }
      })
    )

    return {
      data: ordersWithStatus,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages: Math.ceil(total / validPageSize)
    }
  }
}

export default new SalesOrder()
