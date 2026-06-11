import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'

class BusinessCategory extends BaseModel {
  constructor() {
    super('business_categories', 'business_category_id')
  }

  async create(data) {
    const categoryData = {
      business_category_id: generateUUID(),
      business_category_name: data.business_category_name,
      remarks: data.remarks || null
    }
    return super.create(categoryData)
  }
}

export default new BusinessCategory()
