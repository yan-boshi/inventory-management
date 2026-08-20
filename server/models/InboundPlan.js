import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class InboundPlan extends BaseModel {
  constructor() {
    super('inbound_plans', 'inbound_plan_id')
  }

  async generatePlanNumber() {
    const date = new Date()
    const fullDateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const dateStr = fullDateStr.slice(2)

    const query = `
      SELECT plan_number
      FROM ${this.tableName}
      WHERE plan_number LIKE ?
      ORDER BY plan_number DESC
      LIMIT 1
    `
    const [result] = await pool.query(query, [`XSD-RK-${dateStr}-%`])

    let sequence = 1
    if (result.length > 0) {
      const lastNumber = result[0].plan_number
      const lastSequence = parseInt(lastNumber.split('-').pop(), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `XSD-RK-${dateStr}-${sequence.toString().padStart(3, '0')}`
  }

  async create(data) {
    const planData = {
      inbound_plan_id: data.inbound_plan_id || generateUUID(),
      plan_number: data.plan_number || await this.generatePlanNumber(),
      purchase_order_id: data.purchase_order_id || null,
      contract_number: data.contract_number || null,
      supplier_name: data.supplier_name || null,
      plan_items: typeof data.plan_items === 'string' ? data.plan_items : JSON.stringify(data.plan_items || []),
      currency: data.currency || 'CNY',
      entry_date: data.entry_date || null,
      purchase_person: data.purchase_person || null,
      status: data.status || 'pending',
      remarks: data.remarks || null,
      created_by: data.created_by || null,
    }

    return super.create(planData)
  }

  async update(id, data) {
    const updateData = { ...data }
    if (updateData.plan_items && typeof updateData.plan_items !== 'string') {
      updateData.plan_items = JSON.stringify(updateData.plan_items)
    }
    return super.update(id, updateData)
  }

  async findByPurchaseOrderId(purchaseOrderId) {
    return this.findAll({
      where: 'purchase_order_id = ?',
      params: [purchaseOrderId],
    })
  }

  async deleteByPurchaseOrderId(purchaseOrderId) {
    const connection = await pool.getConnection()
    try {
      await connection.query(
        `DELETE FROM ${this.tableName} WHERE purchase_order_id = ?`,
        [purchaseOrderId]
      )
    } finally {
      connection.release()
    }
  }
}

export default new InboundPlan()
