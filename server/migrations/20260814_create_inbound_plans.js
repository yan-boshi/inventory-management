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

    console.log('Creating inbound_plans table...')

    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'inbound_plans'
    `)

    if (tables.length === 0) {
      await connection.query(`
        CREATE TABLE inbound_plans (
          inbound_plan_id VARCHAR(36) PRIMARY KEY,
          plan_number VARCHAR(50) UNIQUE NOT NULL COMMENT '入库计划单编号',
          purchase_order_id VARCHAR(36) COMMENT '关联采购订单ID',
          contract_number VARCHAR(100) COMMENT '采购合同编号',
          supplier_name VARCHAR(255) COMMENT '供应商名称',
          plan_items TEXT COMMENT '计划明细(JSON)',
          currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
          entry_date DATE COMMENT '录入日期',
          purchase_person VARCHAR(100) COMMENT '采购员',
          status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/completed/cancelled',
          remarks TEXT COMMENT '备注',
          created_by VARCHAR(100) COMMENT '建档人',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_plan_number (plan_number),
          INDEX idx_contract_number (contract_number),
          INDEX idx_purchase_order_id (purchase_order_id),
          INDEX idx_entry_date (entry_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('✓ inbound_plans table created successfully')
    } else {
      console.log('✓ inbound_plans table already exists')
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

    console.log('Dropping inbound_plans table...')
    await connection.query('DROP TABLE IF EXISTS inbound_plans')
    console.log('✓ inbound_plans table dropped')
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
