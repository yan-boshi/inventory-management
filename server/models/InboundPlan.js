import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'
import { nextSequence, localDateStr } from '../utils/sequence.js'

class InboundPlan extends BaseModel {
  constructor() {
    super('inbound_plans', 'inbound_plan_id')
  }

  async generatePlanNumber() {
    return nextSequence(this.tableName, 'plan_number', `XSD-RK-${localDateStr().slice(2)}-`)
  }

  async create(data, conn) {
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

    return super.create(planData, conn)
  }

  async update(id, data, conn) {
    const updateData = { ...data }
    if (updateData.plan_items && typeof updateData.plan_items !== 'string') {
      updateData.plan_items = JSON.stringify(updateData.plan_items)
    }
    return super.update(id, updateData, conn)
  }

  async findByPurchaseOrderId(purchaseOrderId) {
    return this.findAll({
      where: 'purchase_order_id = ?',
      params: [purchaseOrderId],
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

  async deleteByPurchaseOrderId(purchaseOrderId, conn = pool) {
    await conn.query(
      `DELETE FROM ${this.tableName} WHERE purchase_order_id = ?`,
      [purchaseOrderId]
    )
  }
}

export default new InboundPlan()
