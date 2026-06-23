import BaseModel from './BaseModel.js'
import { generateUUID } from '../utils/uuid.js'

class ProductClassification extends BaseModel {
  constructor() {
    super('product_classifications', 'product_classification_id')
  }

  async create(data) {
    const classificationData = {
      product_classification_id: generateUUID(),
      classification_name: data.classification_name,
      classification_data: typeof data.classification_data === 'string'
        ? data.classification_data
        : JSON.stringify(data.classification_data || {}),
      description: data.description || null,
      creator: data.creator || null,
      remarks: data.remarks || null
    }
    return super.create(classificationData)
  }

  async update(id, data) {
    if (data.classification_data && typeof data.classification_data !== 'string') {
      data.classification_data = JSON.stringify(data.classification_data)
    }
    return super.update(id, data)
  }

  // 解析 classification_data JSON 字段
  parseClassificationData(record) {
    if (!record) return record
    if (typeof record.classification_data === 'string') {
      try {
        record.classification_data = JSON.parse(record.classification_data)
      } catch (e) {
        record.classification_data = {}
      }
    }
    return record
  }

  // 解析记录列表中的 classification_data
  parseList(records) {
    if (!Array.isArray(records)) return records
    return records.map(record => this.parseClassificationData(record))
  }
}

export default new ProductClassification()
