import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'

class Product extends BaseModel {
  constructor() {
    super('products', 'product_id')
  }

  async create(data) {
    const productData = {
      product_id: generateUUID(),
      product_name: data.product_name,
      model: data.model || null,
      description: data.description || null,
      product_code: data.product_code,
      unit: data.unit || null,
      stock: data.stock || 0,
      tax_included_price: data.tax_included_price || null,
      tax_excluded_price: data.tax_excluded_price || null,
      product_classification: data.product_classification || null,
      remarks: data.remarks || null
    }
    return super.create(productData)
  }
}

export default new Product()
