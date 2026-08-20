import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class PurchasePlan extends BaseModel {
  constructor() {
    super('purchase_plans', 'purchase_plan_id')
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
    const [result] = await pool.query(query, [`XSD-PP-${dateStr}-%`])

    let sequence = 1
    if (result.length > 0) {
      const lastNumber = result[0].plan_number
      const lastSequence = parseInt(lastNumber.split('-').pop(), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `XSD-PP-${dateStr}-${sequence.toString().padStart(3, '0')}`
  }

  async create(data) {
    const planData = {
      purchase_plan_id: data.purchase_plan_id || generateUUID(),
      plan_number: data.plan_number || await this.generatePlanNumber(),
      sales_order_id: data.sales_order_id || null,
      contract_number: data.contract_number || null,
      customer_name: data.customer_name || null,
      plan_items: typeof data.plan_items === 'string' ? data.plan_items : JSON.stringify(data.plan_items || []),
      currency: data.currency || 'CNY',
      entry_date: data.entry_date || null,
      sales_person: data.sales_person || null,
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

  async findBySalesOrderId(salesOrderId) {
    return this.findAll({
      where: 'sales_order_id = ?',
      params: [salesOrderId],
    })
  }

  async deleteBySalesOrderId(salesOrderId) {
    const connection = await pool.getConnection()
    try {
      await connection.query(
        `DELETE FROM ${this.tableName} WHERE sales_order_id = ?`,
        [salesOrderId]
      )
    } finally {
      connection.release()
    }
  }
}

export default new PurchasePlan()
