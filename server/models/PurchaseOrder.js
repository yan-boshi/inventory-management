import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'
import { round4 } from '../utils/round.js'
import { nextSequence, localDateStr } from '../utils/sequence.js'

class PurchaseOrder extends BaseModel {
  constructor() {
    super('purchase_orders', 'purchase_order_id')
  }

  async generateOrderNumber() {
    return nextSequence(this.tableName, 'order_number', `XSD-P-${localDateStr().slice(2)}-`)
  }

  // 税率换算：0 是合法税率（出口免税），只拦 null/undefined/NaN，不拦 0
  calculateTaxExcludedPrice(taxIncludedPrice, taxRate) {
    const price = Number(taxIncludedPrice)
    const rate = Number(taxRate)
    if (Number.isNaN(price) || Number.isNaN(rate)) return 0
    return round4(price / (1 + rate))
  }

  calculateTaxIncludedAmount(quantity, taxIncludedPrice) {
    const qty = Number(quantity)
    const price = Number(taxIncludedPrice)
    if (Number.isNaN(qty) || Number.isNaN(price)) return 0
    return round4(qty * price)
  }

  calculateTaxExcludedAmount(quantity, taxExcludedPrice) {
    const qty = Number(quantity)
    const price = Number(taxExcludedPrice)
    if (Number.isNaN(qty) || Number.isNaN(price)) return 0
    return round4(qty * price)
  }

  calculateTaxAmount(taxIncludedAmount, taxRate) {
    const amount = Number(taxIncludedAmount)
    const rate = Number(taxRate)
    if (Number.isNaN(amount) || Number.isNaN(rate)) return 0
    return round4((amount / (1 + rate)) * rate)
  }

  async updateStatus(id, status) {
    return await this.update(id, { status })
  }

  async update(id, data, conn) {
    if (data.expenses !== undefined) {
      data.expenses = data.expenses ? JSON.stringify(data.expenses) : null
    }

    if (data.purchase_items !== undefined) {
      const purchaseItems = typeof data.purchase_items === 'string' ? JSON.parse(data.purchase_items) : data.purchase_items
      const calculatedItems = purchaseItems.map((item) => {
        const taxRateDecimal = item.tax_rate / 100
        const taxExcludedPrice = this.calculateTaxExcludedPrice(item.tax_included_price, taxRateDecimal)
        const taxIncludedAmount = this.calculateTaxIncludedAmount(item.quantity, item.tax_included_price)
        const taxExcludedAmount = this.calculateTaxExcludedAmount(item.quantity, taxExcludedPrice)
        const taxAmount = this.calculateTaxAmount(taxIncludedAmount, taxRateDecimal)

        return {
          ...item,
          tax_excluded_price: taxExcludedPrice,
          tax_included_amount: taxIncludedAmount,
          tax_excluded_amount: taxExcludedAmount,
          tax_amount: taxAmount,
          total_price: taxIncludedAmount
        }
      })
      data.purchase_items = JSON.stringify(calculatedItems)
    }

    return super.update(id, data, conn)
  }

  async create(data, conn) {
    const purchaseItems = data.purchase_items || []
    const expensesJson = data.expenses ? JSON.stringify(data.expenses) : null

    const calculatedItems = purchaseItems.map((item, index) => {
      const taxRateDecimal = item.tax_rate / 100
      const taxExcludedPrice = this.calculateTaxExcludedPrice(item.tax_included_price, taxRateDecimal)
      const taxIncludedAmount = this.calculateTaxIncludedAmount(item.quantity, item.tax_included_price)
      const taxExcludedAmount = this.calculateTaxExcludedAmount(item.quantity, taxExcludedPrice)
      const taxAmount = this.calculateTaxAmount(taxIncludedAmount, taxRateDecimal)

      return {
        ...item,
        no: item.no || index + 1,
        inbound_quantity: item.inbound_quantity || 0,
        status: item.status || 1,
        tax_excluded_price: taxExcludedPrice,
        tax_included_amount: taxIncludedAmount,
        tax_excluded_amount: taxExcludedAmount,
        tax_amount: taxAmount,
        total_price: taxIncludedAmount
      }
    })

    const orderData = {
      purchase_order_id: generateUUID(),
      order_number: data.order_number || await this.generateOrderNumber(),
      contract_number: data.contract_number || null,
      supplier_name: data.supplier_name,
      supplier_code: data.supplier_code,
      purchase_items: JSON.stringify(calculatedItems),
      currency: data.currency || 'CNY',
      exchange_rate: data.exchange_rate || 1.0,
      entry_date: data.entry_date || null,
      status: data.status || 1,
      remarks: data.remarks || null,
      expenses: expensesJson,
      purchase_person: data.purchase_person || null,
      related_sales_order_id: data.related_sales_order_id || null,
      related_sales_orders: data.related_sales_orders ? JSON.stringify(data.related_sales_orders) : null,
      plan_deductions: JSON.stringify(data.plan_deductions || [])
    }
    return super.create(orderData, conn)
  }

  /**
   * 根据商品行状态推导订单整体状态
   * @param {Array} purchaseItems - 采购商品列表
   * @returns {number} 状态值: 1=未入库, 2=已全部入库, 3=已部分入库
   */
  deriveOrderStatus(purchaseItems) {
    const statuses = purchaseItems.map(item => item.status || 1)
    if (statuses.every(s => s === 2)) return 2
    if (statuses.some(s => s === 2 || s === 3)) return 3
    return 1
  }

  /**
   * 计算采购订单的入库状态（读取已存储的商品行状态）
   * @param {string} orderId - 采购订单ID
   * @returns {number} 状态值: 1=未入库, 2=已全部入库, 3=已部分入库, 4=退货
   */
  async calculateStatus(orderId) {
    try {
      const order = await this.findById(orderId)
      if (!order) return 1

      // 退货状态直接返回
      if (String(order.status) === '4') return 4

      // 从 purchase_items 中读取每个商品的已存储状态
      const purchaseItems = JSON.parse(order.purchase_items || '[]')
      if (purchaseItems.length === 0) return 1

      return this.deriveOrderStatus(purchaseItems)
    } catch (error) {
      console.error('计算采购订单状态失败:', error)
      return 1
    }
  }

  /**
   * 获取所有采购订单（带动态计算的状态）
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
        const status = await this.calculateStatus(order.purchase_order_id)
        return { ...order, status }
      })
    )

    return ordersWithStatus
  }

  /**
   * 分页获取采购订单（带动态计算的状态）
   */
  async paginateWithStatus(options = {}) {
    const { where = '', orderBy = 'created_at DESC', page = 1, pageSize = 10, params = [] } = options

    // 验证分页参数
    const validPage = Math.max(1, parseInt(page) || 1)
    const validPageSize = Math.min(1000, Math.max(1, parseInt(pageSize) || 10))

    // 验证排序字段（只允许字母、数字、下划线、逗号、空格、ASC、DESC）
    const sanitizedOrderBy = orderBy.replace(/[^a-zA-Z0-9_,\s]/g, '') || 'created_at DESC'

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
        const status = await this.calculateStatus(order.purchase_order_id)
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

export default new PurchaseOrder()
