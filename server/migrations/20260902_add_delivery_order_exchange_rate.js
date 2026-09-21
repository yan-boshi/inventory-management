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
    // 检查 delivery_orders 表是否已有 exchange_rate 列
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM delivery_orders LIKE 'exchange_rate'"
    )

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE delivery_orders
        ADD COLUMN exchange_rate DECIMAL(15,6) DEFAULT 1.0 COMMENT '汇率'
        AFTER currency
      `)
      console.log('delivery_orders 表已添加 exchange_rate 列')
    } else {
      console.log('delivery_orders 表已有 exchange_rate 列，跳过')
    }
    console.log('\n✅ delivery_orders 表迁移完成！')
  } catch (error) {
    console.error('\n❌ delivery_orders 表迁移失败:', error.message)
    throw error
  } finally {
    connection.release()
  }
}

async function down() {
  const connection = await pool.getConnection()
  try {
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM delivery_orders LIKE 'exchange_rate'"
    )

    if (columns.length > 0) {
      await connection.query('ALTER TABLE delivery_orders DROP COLUMN exchange_rate')
      console.log('delivery_orders 表已删除 exchange_rate 列')
    }
    console.log('\n✅ delivery_orders 表回滚完成！')
  } catch (error) {
    console.error('\n❌ delivery_orders 表回滚失败:', error.message)
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
