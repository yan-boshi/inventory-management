import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import pool from '../config/database.js'

class WriteOffDocument extends BaseModel {
  constructor() {
    super('write_off_documents', 'write_off_id')
  }

  async create(data) {
    const writeOffData = {
      write_off_id: generateUUID(),
      write_off_number: data.write_off_number,
      type: data.type,
      entity_id: data.entity_id,
      entity_name: data.entity_name || null,
      write_off_date: data.write_off_date,
      total_amount: data.total_amount ?? 0,
      payment_method: data.payment_method || null,
      bank_reference: data.bank_reference || null,
      remarks: data.remarks || null,
      status: data.status ?? 1,
      document_date: data.document_date || null,
    }
    return super.create(writeOffData)
  }

  // 生成核销单编号
  async generateWriteOffNumber() {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const prefix = `hx${year}${month}${day}`

    const sql = `
      SELECT write_off_number
      FROM write_off_documents
      WHERE write_off_number LIKE '${prefix}%'
      ORDER BY write_off_number DESC
      LIMIT 1
    `
    const [rows] = await pool.query(sql)

    let sequence = 1
    if (rows.length > 0) {
      const lastNumber = rows[0].write_off_number
      const lastSequence = parseInt(lastNumber.slice(-3))
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `${prefix}${String(sequence).padStart(3, '0')}`
  }
}

export default new WriteOffDocument()
