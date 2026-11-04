import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'
import { nextSequence, localDateStr, localDateISO } from '../utils/sequence.js'

class Invoice extends BaseModel {
  constructor() {
    super('invoices', 'invoice_id')
  }

  async generateInvoiceNumber() {
    // 年份取后两位 + 月，共4位（当月段）
    const prefix = localDateStr().slice(2, 6)
    return nextSequence(this.tableName, 'invoice_number', prefix)
  }

  async create(data) {
    // 取号撞号（ER_DUP_ENTRY）重试：每次重试重新取号，不复用已冲突的编号
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const invoiceData = {
          invoice_id: generateUUID(),
          invoice_number: data.invoice_number || await this.generateInvoiceNumber(),
          so_number: data.so_number || null,
          invoice_date: data.invoice_date || localDateISO(),

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
        return await super.create(invoiceData)
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && attempt < maxRetries - 1) {
          console.warn(`发票号冲突，重试第 ${attempt + 1} 次...`)
          continue
        }
        throw error
      }
    }
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
