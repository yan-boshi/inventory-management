import BaseModel from './BaseModel.js'

class Product extends BaseModel {
  constructor() {
    super('products', 'product_id')
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  async create(data) {
    const productData = {
      product_id: this.generateUUID(),
      product_name: data.product_name,
      model: data.model || null,
      description: data.description || null,
      product_code: data.product_code,
      unit: data.unit || null,
      tax_included_price: data.tax_included_price || null,
      tax_excluded_price: data.tax_excluded_price || null,
      remarks: data.remarks || null
    }
    return super.create(productData)
  }
}

export default new Product()
