// 单据/计划编号生成工具
//
// 修两个老毛病：
// 1. "SELECT 最大序号字符串排序 +1" 在序号超过 999 后失效（'999' > '1000' 的字符串序），
//    第 1001 张起永远撞号；这里改为按数值取最大；
// 2. 并发取号拿到同号（表上有 UNIQUE，撞号直接建单失败）；这里用 MySQL 命名锁串行化取号。
import pool from '../config/database.js'

/**
 * 生成下一个编号：prefix + 数值序号（补零到 3 位起）
 * @param {string} tableName - 表名
 * @param {string} columnName - 编号列名
 * @param {string} prefix - 编号前缀（含末尾分隔符，如 'XSD-S-261103-'）
 * @param {object|null} conn - 可选事务连接；不传则临时取连接
 */
export async function nextSequence(tableName, columnName, prefix, conn = null) {
  const ownsConnection = !conn
  const connection = conn || await pool.getConnection()
  try {
    // 命名锁串行化取号（同表一把锁）
    const lockName = `dsh_seq:${tableName}`
    const [lockRows] = await connection.query('SELECT GET_LOCK(?, 10) AS got', [lockName])
    if (!lockRows[0] || Number(lockRows[0].got) !== 1) {
      throw new Error(`获取编号生成锁超时（${tableName}）`)
    }
    try {
      const [rows] = await connection.query(
        `SELECT ${columnName} AS n FROM ${tableName} WHERE ${columnName} LIKE ?`,
        [`${prefix}%`]
      )
      let max = 0
      for (const row of rows) {
        const seq = parseInt(String(row.n).slice(prefix.length), 10)
        if (!Number.isNaN(seq) && seq > max) max = seq
      }
      return `${prefix}${String(max + 1).padStart(3, '0')}`
    } finally {
      await connection.query('SELECT RELEASE_LOCK(?)', [lockName])
    }
  } finally {
    if (ownsConnection) connection.release()
  }
}

// 本地时区的日期前缀（toISOString 是 UTC，凌晨 0-8 点会取到昨天）
export function localDateStr(date = new Date()) {
  const y = String(date.getFullYear())
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

// 本地时区的日期 'YYYY-MM-DD'（DATE 列兜底取值用）
export function localDateISO(date = new Date()) {
  return localDateStr(date).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')
}

// 本地时区的时间 'YYYY-MM-DD HH:mm:ss'（DATETIME 列兜底取值用）
export function localDateTime(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${localDateISO(date)} ${hh}:${mm}:${ss}`
}
