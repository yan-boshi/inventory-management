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

    console.log('开始迁移采购订单表...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    try {
      await connection.beginTransaction()

      console.log('1. 添加新字段...')

      const [columns] = await connection.query(`SHOW COLUMNS FROM purchase_orders`)
      const columnNames = columns.map(col => col.Field)

      if (!columnNames.includes('purchase_items')) {
        await connection.query(`
          ALTER TABLE purchase_orders
          ADD COLUMN purchase_items JSON COMMENT '采购商品内容(JSON字符串)' AFTER supplier_code
        `)
        console.log('已添加 purchase_items 字段')
      } else {
        console.log('purchase_items 字段已存在，跳过')
      }

      if (!columnNames.includes('status')) {
        await connection.query(`
          ALTER TABLE purchase_orders
          ADD COLUMN status TINYINT DEFAULT 1 COMMENT '采购订单状态 1:采购中 2:已到货' AFTER remarks
        `)
        console.log('已添加 status 字段')
      } else {
        console.log('status 字段已存在，跳过')
      }

      console.log('2. 迁移现有数据到新结构...')

      const [orders] = await connection.query(`
        SELECT * FROM purchase_orders
        WHERE purchase_items IS NULL OR purchase_items = '[]' OR purchase_items = ''
      `)

      for (const order of orders) {
        const purchaseItem = {
          no: 1,
          business_category: order.business_category || '',
          product_name: order.product_name || '',
          product_code: order.product_code || '',
          model: order.model || '',
          description: order.description || '',
          unit: order.unit || '',
          quantity: order.quantity || 0,
          tax_rate: order.tax_rate || 0,
          tax_included_price: order.tax_included_price || 0,
          tax_excluded_price: order.tax_excluded_price || 0,
          tax_included_amount: order.tax_included_amount || 0,
          tax_excluded_amount: order.tax_excluded_amount || 0,
          tax_amount: order.tax_amount || 0,
          status: 1,
          remarks: '',
          total_price: order.tax_included_amount || 0,
        }

        await connection.query(
          `UPDATE purchase_orders SET purchase_items = ? WHERE purchase_order_id = ?`,
          [JSON.stringify([purchaseItem]), order.purchase_order_id]
        )
      }

      console.log(`已迁移 ${orders.length} 条数据`)

      console.log('3. 设置状态字段...')

      await connection.query(`
        UPDATE purchase_orders
        SET status = 1
        WHERE status IS NULL OR status = 0
      `)

      console.log('4. 备份旧字段...')

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN payment_method payment_method_old VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN business_category business_category_old VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN product_name product_name_old VARCHAR(255) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN model model_old VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN description description_old TEXT DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN product_code product_code_old VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN unit unit_old VARCHAR(50) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN quantity quantity_old INT DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_rate tax_rate_old DECIMAL(5,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_included_price tax_included_price_old DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_excluded_price tax_excluded_price_old DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_included_amount tax_included_amount_old DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_excluded_amount tax_excluded_amount_old DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_amount tax_amount_old DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN is_returned is_returned_old BOOLEAN DEFAULT FALSE
      `)

      await connection.commit()

      console.log('✓ 迁移成功完成！')
      console.log('旧字段已备份（添加 _old 后缀），确认无误后可手动删除备份字段。')
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

    console.log('开始回滚迁移...')

    try {
      await connection.beginTransaction()

      const [columns] = await connection.query(`SHOW COLUMNS FROM purchase_orders`)
      const columnNames = columns.map(col => col.Field)

      console.log('1. 删除新字段...')

      if (columnNames.includes('purchase_items')) {
        await connection.query(`ALTER TABLE purchase_orders DROP COLUMN purchase_items`)
        console.log('已删除 purchase_items 字段')
      }

      if (columnNames.includes('status')) {
        await connection.query(`ALTER TABLE purchase_orders DROP COLUMN status`)
        console.log('已删除 status 字段')
      }

      console.log('2. 恢复备份字段...')

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN payment_method_old payment_method VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN business_category_old business_category VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN product_name_old product_name VARCHAR(255) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN model_old model VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN description_old description TEXT DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN product_code_old product_code VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN unit_old unit VARCHAR(50) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN quantity_old quantity INT DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_rate_old tax_rate DECIMAL(5,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_included_price_old tax_included_price DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_excluded_price_old tax_excluded_price DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_included_amount_old tax_included_amount DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_excluded_amount_old tax_excluded_amount DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_amount_old tax_amount DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN is_returned_old is_returned BOOLEAN DEFAULT FALSE
      `)

      await connection.commit()
      console.log('✓ 回滚成功完成！')
    } catch (error) {
      await connection.rollback()
      throw error
    }
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
