import BaseModel from './BaseModel.js'

class Supplier extends BaseModel {
  constructor() {
    super('suppliers', 'supplier_id')
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  async create(data) {
    const supplierData = {
      supplier_id: this.generateUUID(),
      supplier_name: data.supplier_name,
      supplier_code: data.supplier_code,
      supplier_tax_number: data.supplier_tax_number || null,
      register_address: data.register_address || null,
      supplier_phone: data.supplier_phone || null,
      supplier_email: data.supplier_email || null,
      bank_name: data.bank_name || null,
      bank_account: data.bank_account || null,
      bank_code: data.bank_code || null,
      contact: data.contact || null,
      contact_phone: data.contact_phone || null,
      remarks: data.remarks || null
    }
    return super.create(supplierData)
  }
}

export default new Supplier()
