/**
 * 数据库迁移：为销售订单和采购订单添加 sales_person 和 purchase_person 字段
 *
 * 使用方法：node server/migrations/20260610_add_sales_purchase_person.js
 */

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

    console.log('开始迁移：为订单表添加人员字段...')

    // 1. 为 sales_orders 表添加 sales_person 字段
    console.log('\n处理 sales_orders 表...')
    const [salesColumns] = await connection.query(
      `SHOW COLUMNS FROM sales_orders LIKE 'sales_person'`
    )
    if (salesColumns.length === 0) {
      await connection.query(
        `ALTER TABLE sales_orders ADD COLUMN sales_person VARCHAR(100) DEFAULT NULL COMMENT '销售人' AFTER remarks`
      )
      console.log('✓ sales_orders 表已添加 sales_person 字段')
    } else {
      console.log('✓ sales_orders 表已存在 sales_person 字段，跳过')
    }

    // 2. 为 purchase_orders 表添加 purchase_person 字段
    console.log('\n处理 purchase_orders 表...')
    const [purchaseColumns] = await connection.query(
      `SHOW COLUMNS FROM purchase_orders LIKE 'purchase_person'`
    )
    if (purchaseColumns.length === 0) {
      await connection.query(
        `ALTER TABLE purchase_orders ADD COLUMN purchase_person VARCHAR(100) DEFAULT NULL COMMENT '采购人' AFTER remarks`
      )
      console.log('✓ purchase_orders 表已添加 purchase_person 字段')
    } else {
      console.log('✓ purchase_orders 表已存在 purchase_person 字段，跳过')
    }

    console.log('\n✓ 迁移完成！')
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

    console.log('Removing sales_person and purchase_person columns...')
    await connection.query(`ALTER TABLE sales_orders DROP COLUMN sales_person`)
    await connection.query(`ALTER TABLE purchase_orders DROP COLUMN purchase_person`)
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
