import pool from '../config/database.js'

class BaseModel {
  constructor(tableName, idField = 'id') {
    this.tableName = tableName
    this.idField = idField
  }

  async findAll(options = {}) {
    const { where = '', orderBy = '', limit = '', params = [] } = options
    const sql = `SELECT * FROM ${this.tableName}${where ? ` WHERE ${where}` : ''}${orderBy ? ` ORDER BY ${orderBy}` : ''}${limit ? ` LIMIT ${limit}` : ''}`
    const [rows] = await pool.query(sql, params)
    return rows
  }

  async findById(id) {
    console.log('查询参数', id);
    const sql = `SELECT * FROM ${this.tableName} WHERE ${this.idField} = ?`
    const [rows] = await pool.query(sql, [id])
    return rows[0] || null
  }

  async findOne(where, params = []) {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`
    console.log('数据库查询参数', sql, params);
    const [rows] = await pool.query(sql, params)
    console.log('数据库查询结果', rows);
    return rows[0] || null
  }

  async create(data) {
    const fields = Object.keys(data).join(', ')
    const placeholders = Object.keys(data).map(() => '?').join(', ')
    const values = Object.values(data)
    const sql = `INSERT INTO ${this.tableName} (${fields}) VALUES (${placeholders})`
    const [result] = await pool.query(sql, values)
    return this.findById(result.insertId || values[0])
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
    const sql = `SELECT COUNT(*) as total FROM ${this.tableName}${where ? ` WHERE ${where}` : ''}`
    const [rows] = await pool.query(sql, params)
    return rows[0].total
  }

  async paginate(options = {}) {
    const { where = '', orderBy = '', page = 1, pageSize = 10, params = [] } = options
    const offset = (page - 1) * pageSize
    const total = await this.count(where, params)
    const data = await this.findAll({ where, orderBy, limit: `${offset}, ${pageSize}`, params })
    return {
      data,
      total: parseInt(total),
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize)
    }
  }
}

export default BaseModel
