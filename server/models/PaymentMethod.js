import BaseModel from './BaseModel.js'

class PaymentMethod extends BaseModel {
  constructor() {
    super('payment_methods', 'payment_method_id')
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  async create(data) {
    const methodData = {
      payment_method_id: this.generateUUID(),
      payment_method_name: data.payment_method_name,
      remarks: data.remarks || null
    }
    return super.create(methodData)
  }
}

export default new PaymentMethod()
