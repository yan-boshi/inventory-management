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

    console.log('开始创建出库单表...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    try {
      await connection.beginTransaction()

      // 检查表是否存在
      const [tables] = await connection.query(`
        SHOW TABLES LIKE 'delivery_orders'
      `)

      if (tables.length === 0) {
        console.log('创建 delivery_orders 表...')
        await connection.query(`
          CREATE TABLE delivery_orders (
            delivery_order_id VARCHAR(36) PRIMARY KEY,
            order_number VARCHAR(50) NOT NULL UNIQUE COMMENT '出库单编号',
            sales_order_number VARCHAR(50) DEFAULT NULL COMMENT '销售订单编号',
            customer_name VARCHAR(200) NOT NULL COMMENT '客户名称',
            customer_address VARCHAR(500) DEFAULT NULL COMMENT '客户地址',
            delivery_items JSON COMMENT '出库商品内容(JSON字符串)',
            delivery_time DATETIME COMMENT '出库时间',
            delivery_date DATETIME DEFAULT NULL COMMENT '送货日期',
            currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
            total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '总计金额',
            expenses JSON COMMENT '出库费用登记(JSON字符串)',
            delivery_person VARCHAR(100) DEFAULT NULL COMMENT '发货人',
            contact_phone VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
            remarks TEXT COMMENT '备注',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_order_number (order_number),
            INDEX idx_sales_order_number (sales_order_number),
            INDEX idx_customer_name (customer_name),
            INDEX idx_delivery_time (delivery_time),
            INDEX idx_created_at (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='出库单表'
        `)
        console.log('✓ delivery_orders 表创建成功')
      } else {
        console.log('✓ delivery_orders 表已存在，跳过创建')
      }

      await connection.commit()

      console.log('✓ 出库单表迁移完成！')
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

    console.log('Dropping delivery_orders table...')
    await connection.query('DROP TABLE IF EXISTS delivery_orders')
    console.log('✓ delivery_orders table dropped')
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
