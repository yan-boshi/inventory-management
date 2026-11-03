import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'
import pool from '../config/database.js'

class SettlementStatementItem extends BaseModel {
  constructor() {
    super('settlement_statement_items', 'item_id')
  }

  async create(data, conn = pool) {
    const itemData = {
      item_id: generateUUID(),
      statement_id: data.statement_id,
      source_type: data.source_type,
      source_id: data.source_id,
      amount: data.amount ?? 0,
      delivery_date: data.delivery_date || null,
      delivery_number: data.delivery_number || null,
      product_code: data.product_code || null,
      product_name: data.product_name || null,
      product_model: data.product_model || null,
      product_description: data.product_description || null,
      quantity: data.quantity ?? 0,
      currency: data.currency || null,
      unit: data.unit || null,
      unit_price: data.unit_price ?? 0,
      amount_with_tax: data.amount_with_tax ?? 0,
      remarks: data.remarks || null
    }
    return super.create(itemData, conn)
  }

  // 根据对账单ID获取明细
  async findByStatementId(statementId, conn = pool) {
    return this.findAll({
      where: 'statement_id = ?',
      params: [statementId]
    }, conn)
  }

  // 删除对账单的所有明细
  async deleteByStatementId(statementId, conn = pool) {
    const sql = `DELETE FROM settlement_statement_items WHERE statement_id = ?`
    const [result] = await conn.query(sql, [statementId])
    return result.affectedRows > 0
  }
}

export default new SettlementStatementItem()
