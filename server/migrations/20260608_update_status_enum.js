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

    console.log('Starting migration: update status ENUM for sales_orders and purchase_orders...')

    // Update sales_orders status ENUM
    await connection.query(`
      ALTER TABLE sales_orders
      MODIFY COLUMN status ENUM('1', '2', '3', '4') NOT NULL DEFAULT '1'
      COMMENT '1:未出库, 2:已全部出库, 3:已部分出库, 4:退货'
    `)
    console.log('Updated sales_orders status ENUM')

    // Update existing status=2 (已退货) to status=4 (退货)
    await connection.query(`
      UPDATE sales_orders SET status = '4' WHERE status = '2'
    `)
    console.log('Migrated sales_orders returned status from 2 to 4')

    // Update purchase_orders status ENUM
    await connection.query(`
      ALTER TABLE purchase_orders
      MODIFY COLUMN status ENUM('1', '2', '3', '4') NOT NULL DEFAULT '1'
      COMMENT '1:未入库, 2:已全部入库, 3:已部分入库, 4:退货'
    `)
    console.log('Updated purchase_orders status ENUM')

    // Update existing status=2 (已到货) to status=2 (已全部入库) - same value, no change needed
    console.log('purchase_orders status=2 maps to 已全部入库, no data migration needed')

    console.log('✓ Migration completed successfully!')
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

    console.log('Rolling back migration: restore status ENUM...')

    // Rollback sales_orders
    await connection.query(`
      UPDATE sales_orders SET status = '2' WHERE status = '4'
    `)
    await connection.query(`
      ALTER TABLE sales_orders
      MODIFY COLUMN status ENUM('1', '2') NOT NULL DEFAULT '1'
      COMMENT '1:正常, 2:已退货'
    `)

    // Rollback purchase_orders
    await connection.query(`
      ALTER TABLE purchase_orders
      MODIFY COLUMN status ENUM('1', '2') NOT NULL DEFAULT '1'
      COMMENT '1:采购中, 2:已到货'
    `)

    console.log('✓ Rollback completed!')
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

// Run migration if called directly
const isMainModule = process.argv[1] && process.argv[1].includes('20260608_update_status_enum')
if (isMainModule) {
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

export { up, down }
