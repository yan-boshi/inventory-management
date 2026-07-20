import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'

class Payable extends BaseModel {
  constructor() {
    super('payables', 'payable_id')
  }

  async create(data) {
    const payableData = {
      payable_id: generateUUID(),
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name || null,
      source_bill_type: data.source_bill_type,
      source_bill_id: data.source_bill_id,
      amount: data.amount ?? 0,
      received_amount: data.received_amount ?? 0,
      balance_amount: data.balance_amount ?? 0,
      due_date: data.due_date || null,
      status: data.status ?? 0,
      billing_status: data.billing_status ?? 0,
      handling_fee: data.handling_fee ?? 0,
      warehousing_time: data.warehousing_time || null
    }
    return super.create(payableData)
  }
}

export default new Payable()
