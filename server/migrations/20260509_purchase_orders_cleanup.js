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

    console.log('开始清理备份字段...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    try {
      await connection.beginTransaction()

      const [columns] = await connection.query(`SHOW COLUMNS FROM purchase_orders`)
      const columnNames = columns.map(col => col.Field)

      const columnsToDrop = [
        'payment_method_old',
        'business_category_old',
        'product_name_old',
        'model_old',
        'description_old',
        'product_code_old',
        'unit_old',
        'quantity_old',
        'tax_rate_old',
        'tax_included_price_old',
        'tax_excluded_price_old',
        'tax_included_amount_old',
        'tax_excluded_amount_old',
        'tax_amount_old',
        'is_returned_old',
      ]

      for (const column of columnsToDrop) {
        if (columnNames.includes(column)) {
          try {
            await connection.query(`ALTER TABLE purchase_orders DROP COLUMN ${column}`)
            console.log(`✓ 已删除字段: ${column}`)
          } catch (error) {
            console.error(`✗ 删除字段失败: ${column}`, error.message)
          }
        } else {
          console.log(`字段不存在，跳过: ${column}`)
        }
      }

      await connection.commit()
      console.log('✓ 清理完成！')
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
    console.log('✓ No down migration for cleanup')
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
