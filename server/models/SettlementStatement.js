import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import pool from '../config/database.js'
import { nextSequence, localDateStr } from '../utils/sequence.js'

class SettlementStatement extends BaseModel {
  constructor() {
    super('settlement_statements', 'statement_id')
  }

  async create(data, conn = pool) {
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
    return super.create(statementData, conn)
  }

  // 生成对账单编号
  async generateStatementNumber() {
    return nextSequence(this.tableName, 'statement_number', `pr${localDateStr()}`)
  }
}

export default new SettlementStatement()
