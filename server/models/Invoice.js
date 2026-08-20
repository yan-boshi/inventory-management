import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class Invoice extends BaseModel {
  constructor() {
    super('invoices', 'invoice_id')
  }

  async generateInvoiceNumber() {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const prefix = `${year}${month}`

    // 查询当月已有的发票最大序号
    const query = `
      SELECT invoice_number
      FROM ${this.tableName}
      WHERE invoice_number LIKE ?
      ORDER BY invoice_number DESC
      LIMIT 1
    `
    const [result] = await pool.query(query, [`${prefix}%`])

    let sequence = 1
    if (result.length > 0) {
      const lastNumber = result[0].invoice_number
      const lastSequence = parseInt(lastNumber.slice(-3), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `${prefix}${sequence.toString().padStart(3, '0')}`
  }

  async create(data) {
    const invoiceData = {
      invoice_id: generateUUID(),
      invoice_number: data.invoice_number || await this.generateInvoiceNumber(),
      so_number: data.so_number || null,
      invoice_date: data.invoice_date || new Date().toISOString().slice(0, 10),

      // 卖方信息
      seller_name: data.seller_name,
      seller_contact: data.seller_contact,
      seller_address: data.seller_address,
      seller_phone: data.seller_phone,

      // 买方信息
      buyer_name: data.buyer_name,
      buyer_contact: data.buyer_contact,
      buyer_address: data.buyer_address,
      buyer_phone: data.buyer_phone,

      // 交易信息
      trade_terms: data.trade_terms || 'FOB',
      currency: data.currency || 'USD',

      // 商品明细
      invoice_items: typeof data.invoice_items === 'string'
        ? data.invoice_items
        : JSON.stringify(data.invoice_items || []),

      // 总金额
      total_value: data.total_value || 0,

      // 银行信息
      bank_name: data.bank_name,
      bank_address: data.bank_address,
      swift_code: data.swift_code,
      beneficiary_name: data.beneficiary_name,
      beneficiary_address: data.beneficiary_address,
      account_number: data.account_number,

      // 签章
      seller_stamp: data.seller_stamp || null,

      // 关联信息
      sales_order_id: data.sales_order_id || null,
      customer_code: data.customer_code || null,

      // 系统字段
      remarks: data.remarks || null,
      created_by: data.created_by || null
    }

    return super.create(invoiceData)
  }

  async update(id, data) {
    const updateData = { ...data }

    // 处理 invoice_items
    if (updateData.invoice_items && typeof updateData.invoice_items !== 'string') {
      updateData.invoice_items = JSON.stringify(updateData.invoice_items)
    }

    return super.update(id, updateData)
  }

  async findByInvoiceNumber(invoiceNumber) {
    const [rows] = await pool.query(
      `SELECT * FROM ${this.tableName} WHERE invoice_number = ?`,
      [invoiceNumber]
    )
    return rows[0] || null
  }

  async findBySalesOrderId(salesOrderId) {
    const [rows] = await pool.query(
      `SELECT * FROM ${this.tableName} WHERE sales_order_id = ? ORDER BY created_at DESC`,
      [salesOrderId]
    )
    return rows
  }
}

export default new Invoice()
