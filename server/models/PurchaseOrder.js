import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class PurchaseOrder extends BaseModel {
  constructor() {
    super('purchase_orders', 'purchase_order_id')
  }

  generateOrderNumber() {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
    return `XSD-P-${dateStr}${random}`
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
    return parseFloat((taxIncludedAmount * taxRate).toFixed(2))
  }

  async updateStatus(id, status) {
    return await this.update(id, { status })
  }

  async update(id, data) {
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

    return super.update(id, data)
  }

  async create(data) {
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
      order_number: this.generateOrderNumber(),
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
      purchase_person: data.purchase_person || null
    }
    return super.create(orderData)
  }

  /**
   * 计算采购订单的入库状态
   * @param {string} orderId - 采购订单ID
   * @returns {number} 状态值: 1=未入库, 2=已全部入库, 3=已部分入库, 4=退货
   */
  async calculateStatus(orderId) {
    try {
      // 获取采购订单
      const order = await this.findById(orderId)
      if (!order) return 1

      // 如果已退货，直接返回4
      if (order.status === '4') return 4

      // 解析采购订单项
      const purchaseItems = JSON.parse(order.purchase_items || '[]')
      if (purchaseItems.length === 0) return 1

      // 查询关联的入库单
      const [warehousingOrders] = await pool.query(
        `SELECT warehousing_items FROM warehousing_orders WHERE contract_number = ?`,
        [order.contract_number]
      )

      // 如果没有入库单，返回未入库
      if (warehousingOrders.length === 0) return 1

      // 汇总已入库数量（按产品代码）
      const warehousedQuantities = {}
      for (const warehousingOrder of warehousingOrders) {
        const items = JSON.parse(warehousingOrder.warehousing_items || '[]')
        for (const item of items) {
          const code = item.product_code
          if (code) {
            warehousedQuantities[code] = (warehousedQuantities[code] || 0) + (item.quantity || 0)
          }
        }
      }

      // 比较已入库数量与需求数量
      let allWarehoused = true
      let anyWarehoused = false

      for (const purchaseItem of purchaseItems) {
        const code = purchaseItem.product_code
        const requiredQty = purchaseItem.quantity || 0
        const warehousedQty = warehousedQuantities[code] || 0

        if (warehousedQty > 0) {
          anyWarehoused = true
        }
        if (warehousedQty < requiredQty) {
          allWarehoused = false
        }
      }

      if (allWarehoused && anyWarehoused) return 2  // 已全部入库
      if (anyWarehoused) return 3  // 已部分入库
      return 1  // 未入库
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
