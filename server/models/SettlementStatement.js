import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import pool from '../config/database.js'

class SettlementStatement extends BaseModel {
  constructor() {
    super('settlement_statements', 'statement_id')
  }

  async create(data) {
    const statementData = {
      statement_id: generateUUID(),
      statement_number: data.statement_number,
      type: data.type,
      entity_id: data.entity_id,
      entity_name: data.entity_name || null,
      billing_month: data.billing_month || null,
      payment_method: data.payment_method || null,
      sales_amount: data.sales_amount ?? 0,
      is_invoiced: data.is_invoiced ?? 0,
      invoice_date: data.invoice_date || null,
      invoice_number: data.invoice_number || null,
      document_date: data.document_date || null,
      total_amount: data.total_amount ?? 0,
      invoiced_amount: data.invoiced_amount ?? 0,
      uninvoiced_amount: data.uninvoiced_amount ?? 0,
      billing_status: data.billing_status ?? 0,
      handling_fee: data.handling_fee ?? 0,
      remarks: data.remarks || null
    }
    return super.create(statementData)
  }

  // 生成对账单编号
  async generateStatementNumber() {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const prefix = `DZ${year}${month}${day}`

    // 查询当天最大的编号
    const sql = `
      SELECT statement_number
      FROM settlement_statements
      WHERE statement_number LIKE '${prefix}%'
      ORDER BY statement_number DESC
      LIMIT 1
    `
    const [rows] = await pool.query(sql)

    let sequence = 1
    if (rows.length > 0) {
      const lastNumber = rows[0].statement_number
      const lastSequence = parseInt(lastNumber.slice(-4))
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`
  }
}

export default new SettlementStatement()
