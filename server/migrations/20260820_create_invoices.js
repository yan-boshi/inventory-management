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

export async function up() {
  let connection = null
  try {
    console.log('Connecting to database...')
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}, Database: ${process.env.DB_NAME || 'inventory_management'}`)

    connection = await pool.getConnection()
    console.log('Database connected successfully')

    console.log('Creating invoices table...')

    const query = `
      CREATE TABLE IF NOT EXISTS invoices (
        invoice_id VARCHAR(36) PRIMARY KEY,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        so_number VARCHAR(50),
        invoice_date DATE NOT NULL,
        seller_name VARCHAR(200),
        seller_contact VARCHAR(100),
        seller_address TEXT,
        seller_phone VARCHAR(50),
        buyer_name VARCHAR(200),
        buyer_contact VARCHAR(100),
        buyer_address TEXT,
        buyer_phone VARCHAR(50),
        trade_terms VARCHAR(50),
        currency VARCHAR(20) DEFAULT 'USD',
        invoice_items JSON,
        total_value DECIMAL(15, 4),
        bank_name VARCHAR(200),
        bank_address TEXT,
        swift_code VARCHAR(50),
        beneficiary_name VARCHAR(200),
        beneficiary_address TEXT,
        account_number VARCHAR(50),
        seller_stamp LONGTEXT,
        sales_order_id VARCHAR(36),
        customer_code VARCHAR(50),
        remarks TEXT,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_sales_order_id (sales_order_id),
        INDEX idx_customer_code (customer_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `

    await connection.query(query)
    console.log('✓ invoices table created successfully')
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

export async function down() {
  let connection = null
  try {
    console.log('Connecting to database...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    await connection.query('DROP TABLE IF EXISTS invoices')
    console.log('✓ invoices table dropped successfully')
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

// 如果直接运行此文件
if (process.argv[1] && process.argv[1].includes('20260820_create_invoices')) {
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
}
