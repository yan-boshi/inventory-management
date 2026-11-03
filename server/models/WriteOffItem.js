import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import pool from '../config/database.js'

class WriteOffItem extends BaseModel {
  constructor() {
    super('write_off_items', 'item_id')
  }

  async create(data, conn = pool) {
    const itemData = {
      item_id: generateUUID(),
      write_off_id: data.write_off_id,
      source_type: data.source_type,
      source_id: data.source_id,
      source_bill_id: data.source_bill_id || null,
      target_amount: data.target_amount ?? 0,
      write_off_amount: data.write_off_amount ?? 0,
      before_received: data.before_received ?? 0,
      after_received: data.after_received ?? 0,
      remarks: data.remarks || null,
    }
    return super.create(itemData, conn)
  }

  async findByWriteOffId(writeOffId, conn = pool) {
    const sql = 'SELECT * FROM write_off_items WHERE write_off_id = ? ORDER BY create_time ASC'
    const [rows] = await conn.query(sql, [writeOffId])
    return rows
  }

  async deleteByWriteOffId(writeOffId, conn = pool) {
    const sql = 'DELETE FROM write_off_items WHERE write_off_id = ?'
    const [result] = await conn.query(sql, [writeOffId])
    return result.affectedRows
  }
}

export default new WriteOffItem()
