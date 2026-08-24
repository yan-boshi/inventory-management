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

    connection = await pool.getConnection()
    console.log('Database connected successfully')

    console.log('Creating purchase_plans table...')

    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'purchase_plans'
    `)
    if (tables.length === 0) {
      await connection.query(`
        CREATE TABLE purchase_plans (
          purchase_plan_id VARCHAR(36) PRIMARY KEY,
          plan_number VARCHAR(50) UNIQUE NOT NULL COMMENT '采购计划单编号',
          sales_order_id VARCHAR(36) COMMENT '关联销售订单ID',
          contract_number VARCHAR(100) COMMENT '销售合同编号',
          customer_name VARCHAR(255) COMMENT '客户名称',
          plan_items TEXT COMMENT '计划明细(JSON)',
          currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
          entry_date DATE COMMENT '录入日期',
          sales_person VARCHAR(100) COMMENT '销售员',
          status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/completed/cancelled',
          remarks TEXT COMMENT '备注',
          created_by VARCHAR(100) COMMENT '建档人',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_plan_number (plan_number),
          INDEX idx_contract_number (contract_number),
          INDEX idx_sales_order_id (sales_order_id),
          INDEX idx_entry_date (entry_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('✓ purchase_plans table created successfully')
    } else {
      console.log('✓ purchase_plans table already exists')
    }

    console.log('✓ Migration completed')
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

    console.log('Dropping purchase_plans table...')
    await connection.query('DROP TABLE IF EXISTS purchase_plans')
    console.log('✓ purchase_plans table dropped')
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

// Run migration
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
