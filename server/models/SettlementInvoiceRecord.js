import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import pool from '../config/database.js'

class SettlementInvoiceRecord extends BaseModel {
  constructor() {
    super('settlement_invoice_records', 'invoice_record_id')
  }

  async create(data) {
    const recordData = {
      invoice_record_id: generateUUID(),
      statement_id: data.statement_id,
      invoice_date: data.invoice_date || null,
      invoice_number: data.invoice_number || null,
      invoiced_amount: data.invoiced_amount ?? 0,
      uninvoiced_amount: data.uninvoiced_amount ?? 0
    }
    return super.create(recordData)
  }

  async findByStatementId(statementId) {
    const [rows] = await pool.query(
      'SELECT * FROM settlement_invoice_records WHERE statement_id = ? ORDER BY create_time ASC',
      [statementId]
    )
    return rows
  }

  async deleteByStatementId(statementId) {
    const [result] = await pool.query(
      'DELETE FROM settlement_invoice_records WHERE statement_id = ?',
      [statementId]
    )
    return result
  }
}

export default new SettlementInvoiceRecord()
