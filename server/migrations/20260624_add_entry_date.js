import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'abc1234!',
  database: process.env.DB_NAME || 'inventory_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function up() {
  let connection = null
  try {
    console.log('Connecting to database...')
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}, Database: ${process.env.DB_NAME || 'inventory_management'}`)

    console.log('开始为出库单和入库单表添加录入日期字段...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    try {
      await connection.beginTransaction()

      // 检查 delivery_orders 表是否已有 entry_date 字段
      const [deliveryColumns] = await connection.query(`
        SHOW COLUMNS FROM delivery_orders LIKE 'entry_date'
      `)

      if (deliveryColumns.length === 0) {
        console.log('为 delivery_orders 表添加 entry_date 字段...')
        await connection.query(`
          ALTER TABLE delivery_orders ADD COLUMN entry_date DATE DEFAULT NULL COMMENT '录入日期' AFTER delivery_date
        `)
        console.log('✓ delivery_orders 表 entry_date 字段添加成功')
      } else {
        console.log('✓ delivery_orders 表已有 entry_date 字段，跳过')
      }

      // 检查 warehousing_orders 表是否已有 entry_date 字段
      const [warehousingColumns] = await connection.query(`
        SHOW COLUMNS FROM warehousing_orders LIKE 'entry_date'
      `)

      if (warehousingColumns.length === 0) {
        console.log('为 warehousing_orders 表添加 entry_date 字段...')
        await connection.query(`
          ALTER TABLE warehousing_orders ADD COLUMN entry_date DATE DEFAULT NULL COMMENT '录入日期' AFTER warehousing_time
        `)
        console.log('✓ warehousing_orders 表 entry_date 字段添加成功')
      } else {
        console.log('✓ warehousing_orders 表已有 entry_date 字段，跳过')
      }

      await connection.commit()

      console.log('✓ 录入日期字段迁移完成！')
    } catch (error) {
      await connection.rollback()
      throw error
    }
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
    console.error('Full error:', error)
    throw error
  } finally {
    if (connection) {
      connection.release()
      console.log('Database connection released')
    }
    await pool.end()
  }
}

async function down() {
  let connection = null
  try {
    console.log('Connecting to database...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    console.log('Removing entry_date columns...')
    await connection.query(`ALTER TABLE delivery_orders DROP COLUMN entry_date`)
    await connection.query(`ALTER TABLE warehousing_orders DROP COLUMN entry_date`)
    console.log('✓ Columns removed successfully')
  } catch (error) {
    console.error('✗ Rollback failed:', error.message)
    console.error('Full error:', error)
    throw error
  } finally {
    if (connection) {
      connection.release()
      console.log('Database connection released')
    }
    await pool.end()
  }
}

const action = process.argv[2]

if (action === 'down') {
  down()
    .then(() => {
      console.log('Done')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Failed:', err.message)
      process.exit(1)
    })
} else {
  up()
    .then(() => {
      console.log('Done')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Failed:', err.message)
      process.exit(1)
    })
}
