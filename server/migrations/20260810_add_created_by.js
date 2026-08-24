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

    console.log('Adding created_by column to customers and suppliers tables...')

    // 检查 customers 表是否已有 created_by 列
    const [customerColumns] = await connection.query(`
      SHOW COLUMNS FROM customers LIKE 'created_by'
    `)
    if (customerColumns.length === 0) {
      await connection.query(`
        ALTER TABLE customers
        ADD COLUMN created_by VARCHAR(100) DEFAULT NULL COMMENT '建档人'
      `)
      console.log('✓ Added created_by to customers table')
    } else {
      console.log('✓ created_by column already exists in customers table')
    }

    // 检查 suppliers 表是否已有 created_by 列
    const [supplierColumns] = await connection.query(`
      SHOW COLUMNS FROM suppliers LIKE 'created_by'
    `)
    if (supplierColumns.length === 0) {
      await connection.query(`
        ALTER TABLE suppliers
        ADD COLUMN created_by VARCHAR(100) DEFAULT NULL COMMENT '建档人'
      `)
      console.log('✓ Added created_by to suppliers table')
    } else {
      console.log('✓ created_by column already exists in suppliers table')
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

    console.log('Removing created_by column from customers and suppliers tables...')

    await connection.query(`
      ALTER TABLE customers
      DROP COLUMN created_by
    `)

    await connection.query(`
      ALTER TABLE suppliers
      DROP COLUMN created_by
    `)

    console.log('✓ Successfully removed created_by column')
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
