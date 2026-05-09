import BaseModel from './BaseModel.js'

class BusinessCategory extends BaseModel {
  constructor() {
    super('business_categories', 'business_category_id')
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  async create(data) {
    const categoryData = {
      business_category_id: this.generateUUID(),
      business_category_name: data.business_category_name,
      remarks: data.remarks || null
    }
    return super.create(categoryData)
  }
}

export default new BusinessCategory()
