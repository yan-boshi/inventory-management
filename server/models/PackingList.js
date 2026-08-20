import BaseModel from './BaseModel.js'
import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'

class PackingList extends BaseModel {
  constructor() {
    super('packing_lists', 'packing_list_id')
  }

  async create(data) {
    const packingData = {
      packing_list_id: generateUUID(),
      packing_no: data.packing_no,
      packing_date: data.packing_date,
      po_number: data.po_number || null,
      sales_order_id: data.sales_order_id || null,
      seller_name: data.seller_name || null,
      seller_contact: data.seller_contact || null,
      seller_address: data.seller_address || null,
      seller_phone: data.seller_phone || null,
      buyer_name: data.buyer_name || null,
      buyer_contact: data.buyer_contact || null,
      buyer_address: data.buyer_address || null,
      buyer_phone: data.buyer_phone || null,
      packing_items: typeof data.packing_items === 'string' ? data.packing_items : JSON.stringify(data.packing_items || []),
      total_packages: data.total_packages || null,
      trade_terms: data.trade_terms || null,
      country_of_origin: data.country_of_origin || null,
      title_en: data.title_en || 'Packing List',
      title_zh: data.title_zh || '装箱单',
      seller_stamp: data.seller_stamp || null,
    }
    return super.create(packingData)
  }

  async update(id, data) {
    const updateData = { ...data }

    if (updateData.packing_items && typeof updateData.packing_items !== 'string') {
      updateData.packing_items = JSON.stringify(updateData.packing_items)
    }

    return super.update(id, updateData)
  }

  async findByPackingNo(packingNo) {
    const [rows] = await pool.query(
      `SELECT * FROM ${this.tableName} WHERE packing_no = ?`,
      [packingNo]
    )
    return rows[0] || null
  }

  async existsByPackingNo(packingNo, excludeId = null) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE packing_no = ?`
    const params = [packingNo]

    if (excludeId) {
      query += ` AND packing_list_id != ?`
      params.push(excludeId)
    }

    const [rows] = await pool.query(query, params)
    return rows[0].count > 0
  }
}

export default new PackingList()