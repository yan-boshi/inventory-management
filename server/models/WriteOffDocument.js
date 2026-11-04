import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import pool from '../config/database.js'
import { nextSequence, localDateStr } from '../utils/sequence.js'

class WriteOffDocument extends BaseModel {
  constructor() {
    super('write_off_documents', 'write_off_id')
  }

  async create(data, conn = pool) {
    // 取号撞号（ER_DUP_ENTRY）重试：重试时重新调用 generateWriteOffNumber 取新号，不复用已冲突的编号
    const maxRetries = 3
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const writeOffData = {
          write_off_id: generateUUID(),
          write_off_number: attempt === 0
            ? (data.write_off_number || await this.generateWriteOffNumber())
            : await this.generateWriteOffNumber(),
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
        return await super.create(writeOffData, conn)
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && attempt < maxRetries - 1) {
          console.warn(`核销单编号冲突，重试第 ${attempt + 1} 次...`)
          continue
        }
        throw error
      }
    }
  }

  // 生成核销单编号
  async generateWriteOffNumber() {
    return nextSequence(this.tableName, 'write_off_number', `hx${localDateStr()}`)
  }
}

export default new WriteOffDocument()
