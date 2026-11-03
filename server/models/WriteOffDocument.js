import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import pool from '../config/database.js'
import { nextSequence, localDateStr } from '../utils/sequence.js'

class WriteOffDocument extends BaseModel {
  constructor() {
    super('write_off_documents', 'write_off_id')
  }

  async create(data, conn = pool) {
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
    return super.create(writeOffData, conn)
  }

  // 生成核销单编号
  async generateWriteOffNumber() {
    return nextSequence(this.tableName, 'write_off_number', `hx${localDateStr()}`)
  }
}

export default new WriteOffDocument()
