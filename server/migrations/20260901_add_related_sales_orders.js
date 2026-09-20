import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 加载根目录的 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// 创建连接池
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

    connection = await pool.getConnection()
    console.log('Database connected successfully')

    console.log('Adding related_sales_orders column to purchase_orders table...')

    // 检查列是否已存在
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM purchase_orders LIKE 'related_sales_orders'
    `)

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE purchase_orders
        ADD COLUMN related_sales_orders JSON DEFAULT NULL
        COMMENT '关联销售订单明细，存储数组：[{sales_order_id, order_number, product_code, quantity}]'
      `)
      console.log('✓ related_sales_orders column added successfully')
    } else {
      console.log('✓ related_sales_orders column already exists')
    }

    console.log('Migration completed successfully!')
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

    console.log('Removing related_sales_orders column from purchase_orders table...')
    await connection.query(`
      ALTER TABLE purchase_orders
      DROP COLUMN related_sales_orders
    `)
    console.log('✓ related_sales_orders column removed')
  } catch (error) {
    console.error('✗ Rollback failed:', error.message)
    throw error
  } finally {
    if (connection) {
      connection.release()
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
