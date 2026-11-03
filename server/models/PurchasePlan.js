import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'
import { nextSequence, localDateStr } from '../utils/sequence.js'

class PurchasePlan extends BaseModel {
  constructor() {
    super('purchase_plans', 'purchase_plan_id')
  }

  async generatePlanNumber() {
    return nextSequence(this.tableName, 'plan_number', `XSD-PP-${localDateStr().slice(2)}-`)
  }

  async create(data, conn) {
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

    return super.create(planData, conn)
  }

  async update(id, data, conn) {
    const updateData = { ...data }
    if (updateData.plan_items && typeof updateData.plan_items !== 'string') {
      updateData.plan_items = JSON.stringify(updateData.plan_items)
    }
    return super.update(id, updateData, conn)
  }

  async findBySalesOrderId(salesOrderId) {
    return this.findAll({
      where: 'sales_order_id = ?',
      params: [salesOrderId],
    })
  }

  async findByContractNumber(contractNumber, conn) {
    return this.findAll({
      where: 'contract_number = ?',
      orderBy: 'created_at ASC, plan_number ASC',
      params: [contractNumber],
      forUpdate: true
    }, conn)
  }

  async deleteBySalesOrderId(salesOrderId, conn = pool) {
    await conn.query(
      `DELETE FROM ${this.tableName} WHERE sales_order_id = ?`,
      [salesOrderId]
    )
  }
}

export default new PurchasePlan()
