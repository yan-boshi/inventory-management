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

    console.log('Creating packing_lists table...')

    const query = `
      CREATE TABLE IF NOT EXISTS packing_lists (
        packing_list_id VARCHAR(36) PRIMARY KEY,
        packing_no VARCHAR(50) NOT NULL UNIQUE,
        packing_date DATE NOT NULL,
        po_number VARCHAR(100),
        sales_order_id VARCHAR(36),
        seller_name VARCHAR(200),
        seller_contact VARCHAR(100),
        seller_address TEXT,
        seller_phone VARCHAR(50),
        buyer_name VARCHAR(200),
        buyer_contact VARCHAR(100),
        buyer_address TEXT,
        buyer_phone VARCHAR(50),
        packing_items JSON NOT NULL,
        total_packages VARCHAR(50),
        trade_terms VARCHAR(100),
        country_of_origin VARCHAR(100),
        title_en VARCHAR(100) DEFAULT 'Packing List',
        title_zh VARCHAR(100) DEFAULT '装箱单',
        seller_stamp LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_packing_no (packing_no),
        INDEX idx_sales_order_id (sales_order_id),
        INDEX idx_packing_date (packing_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `

    await connection.query(query)
    console.log('✓ packing_lists table created successfully')
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

    await connection.query('DROP TABLE IF EXISTS packing_lists')
    console.log('✓ packing_lists table dropped successfully')
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
if (process.argv[1] && process.argv[1].includes('20260818_create_packing_lists')) {
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
