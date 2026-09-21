import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

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
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customs_exchange_rates (
        customs_exchange_rate_id VARCHAR(36) PRIMARY KEY,
        source_currency VARCHAR(10) NOT NULL,
        target_currency VARCHAR(10) NOT NULL,
        rate DECIMAL(15,6) NOT NULL,
        effective_month DATE NOT NULL COMMENT '生效月的第一天日期',
        remarks VARCHAR(200) DEFAULT NULL,
        created_by VARCHAR(36) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_source_target_month (source_currency, target_currency, effective_month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('customs_exchange_rates 表创建成功')
    console.log('\n✅ customs_exchange_rates 表迁移完成！')
  } catch (error) {
    console.error('\n❌ customs_exchange_rates 表迁移失败:', error.message)
    throw error
  } finally {
    connection.release()
  }
}

async function down() {
  const connection = await pool.getConnection()
  try {
    await connection.query('DROP TABLE IF EXISTS customs_exchange_rates')
    console.log('customs_exchange_rates 表已删除')
    console.log('\n✅ customs_exchange_rates 表回滚完成！')
  } catch (error) {
    console.error('\n❌ customs_exchange_rates 表回滚失败:', error.message)
    throw error
  } finally {
    connection.release()
  }
}

const action = process.argv[2]
if (action === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1))
} else {
  up().then(() => process.exit(0)).catch(() => process.exit(1))
}
