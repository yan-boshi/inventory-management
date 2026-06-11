import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'

class PaymentMethod extends BaseModel {
  constructor() {
    super('payment_methods', 'payment_method_id')
  }

  async create(data) {
    const methodData = {
      payment_method_id: generateUUID(),
      payment_method_name: data.payment_method_name,
      remarks: data.remarks || null
    }
    return super.create(methodData)
  }
}

export default new PaymentMethod()
