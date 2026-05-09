import BaseModel from './BaseModel.js'

class Customer extends BaseModel {
  constructor() {
    super('customers', 'customer_id')
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  async create(data) {
    const customerData = {
      customer_id: this.generateUUID(),
      customer_name: data.customer_name,
      customer_code: data.customer_code,
      customer_tax_number: data.customer_tax_number || null,
      register_address: data.register_address || null,
      customer_phone: data.customer_phone || null,
      customer_email: data.customer_email || null,
      bank_name: data.bank_name || null,
      bank_account: data.bank_account || null,
      bank_code: data.bank_code || null,
      contact: data.contact || null,
      contact_phone: data.contact_phone || null,
      receiver: data.receiver || null,
      receiver_address: data.receiver_address || null,
      remarks: data.remarks || null
    }
    return super.create(customerData)
  }
}

export default new Customer()
