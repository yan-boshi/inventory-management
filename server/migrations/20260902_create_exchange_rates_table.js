import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_management',
  waitForConnections: true,
  connectionLimit: 10,
})

async function up() {
  const connection = await pool.getConnection()
  try {
    // 创建汇率表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        exchange_rate_id VARCHAR(36) PRIMARY KEY,
        source_currency VARCHAR(10) NOT NULL,
        target_currency VARCHAR(10) NOT NULL,
        rate DECIMAL(15,6) NOT NULL,
        effective_week DATE NOT NULL COMMENT '生效周的周一日期',
        remarks VARCHAR(200) DEFAULT NULL,
        created_by VARCHAR(36) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_source_target_week (source_currency, target_currency, effective_week)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('exchange_rates 表创建成功')
    console.log('\n✅ exchange_rates 表迁移完成！')
  } catch (error) {
    console.error('\n❌ exchange_rates 表迁移失败:', error.message)
    throw error
  } finally {
    connection.release()
  }
}

async function down() {
  const connection = await pool.getConnection()
  try {
    await connection.query('DROP TABLE IF EXISTS exchange_rates')
    console.log('exchange_rates 表已删除')
    console.log('\n✅ exchange_rates 表回滚完成！')
  } catch (error) {
    console.error('\n❌ exchange_rates 表回滚失败:', error.message)
    throw error
  } finally {
    connection.release()
  }
}

// 执行迁移
const action = process.argv[2]
if (action === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1))
} else {
  up().then(() => process.exit(0)).catch(() => process.exit(1))
}
