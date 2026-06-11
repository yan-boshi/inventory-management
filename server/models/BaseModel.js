import pool from '../config/database.js'

// 允许排序的字段白名单（子类可覆盖）
const ALLOWED_ORDER_FIELDS = new Set()

class BaseModel {
  constructor(tableName, idField = 'id') {
    this.tableName = tableName
    this.idField = idField
  }

  // 验证排序字段是否安全
  validateOrderBy(orderBy) {
    if (!orderBy) return ''
    // 只允许字母、数字、下划线、逗号、空格、ASC、DESC
    const sanitized = orderBy.replace(/[^a-zA-Z0-9_,\s]/g, '')
    return sanitized ? ` ORDER BY ${sanitized}` : ''
  }

  // 验证并格式化 LIMIT 参数
  validateLimit(limit) {
    if (!limit) return ''
    // 如果是 "offset, count" 格式，验证两个数字
    const parts = String(limit).split(',').map(s => s.trim())
    if (parts.length === 2) {
      const offset = parseInt(parts[0], 10)
      const count = parseInt(parts[1], 10)
      if (isNaN(offset) || isNaN(count) || offset < 0 || count < 0 || count > 10000) {
        return ''
      }
      return ` LIMIT ${offset}, ${count}`
    } else if (parts.length === 1) {
      const count = parseInt(parts[0], 10)
      if (isNaN(count) || count < 0 || count > 10000) {
        return ''
      }
      return ` LIMIT ${count}`
    }
    return ''
  }

  async findAll(options = {}) {
    const { where = '', orderBy = '', limit = '', params = [] } = options
    const orderClause = this.validateOrderBy(orderBy)
    const limitClause = this.validateLimit(limit)
    const whereClause = where ? ` WHERE ${where}` : ''
    const sql = `SELECT * FROM ${this.tableName}${whereClause}${orderClause}${limitClause}`
    const [rows] = await pool.query(sql, params)
    return rows
  }

  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${this.idField} = ?`
    const [rows] = await pool.query(sql, [id])
    return rows[0] || null
  }

  async findOne(where, params = []) {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`
    const [rows] = await pool.query(sql, params)
    return rows[0] || null
  }

  async create(data) {
    const fields = Object.keys(data).join(', ')
    const placeholders = Object.keys(data).map(() => '?').join(', ')
    const values = Object.values(data)
    const sql = `INSERT INTO ${this.tableName} (${fields}) VALUES (${placeholders})`
    await pool.query(sql, values)
    return this.findById(data[this.idField])
  }

  async update(id, data) {
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ')
    const values = [...Object.values(data), id]
    const sql = `UPDATE ${this.tableName} SET ${fields} WHERE ${this.idField} = ?`
    await pool.query(sql, values)
    return this.findById(id)
  }

  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.idField} = ?`
    const [result] = await pool.query(sql, [id])
    return result.affectedRows > 0
  }

  async count(where = '', params = []) {
    const whereClause = where ? ` WHERE ${where}` : ''
    const sql = `SELECT COUNT(*) as total FROM ${this.tableName}${whereClause}`
    const [rows] = await pool.query(sql, params)
    return rows[0].total
  }

  async paginate(options = {}) {
    const { where = '', orderBy = '', page = 1, pageSize = 10, params = [] } = options
    // 验证分页参数
    const validPage = Math.max(1, parseInt(page) || 1)
    const validPageSize = Math.min(1000, Math.max(1, parseInt(pageSize) || 10))
    const offset = (validPage - 1) * validPageSize
    const total = await this.count(where, params)
    const data = await this.findAll({ where, orderBy, limit: `${offset}, ${validPageSize}`, params })
    return {
      data,
      total: parseInt(total),
      page: validPage,
      pageSize: validPageSize,
      totalPages: Math.ceil(total / validPageSize)
    }
  }
}

export default BaseModel
