import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'

class Receivable extends BaseModel {
  constructor() {
    super('receivables', 'receivable_id')
  }

  async create(data) {
    const receivableData = {
      receivable_id: generateUUID(),
      customer_id: data.customer_id,
      customer_name: data.customer_name || null,
      source_bill_type: data.source_bill_type,
      source_bill_id: data.source_bill_id,
      amount: data.amount ?? 0,
      received_amount: data.received_amount ?? 0,
      balance_amount: data.balance_amount ?? 0,
      due_date: data.due_date || null,
      status: data.status ?? 0,
      billing_status: data.billing_status ?? 0,
      handling_fee: data.handling_fee ?? 0,
      delivery_time: data.delivery_time || null
    }
    return super.create(receivableData)
  }
}

export default new Receivable()
