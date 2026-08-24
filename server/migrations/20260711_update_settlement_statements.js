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

    console.log('开始更新对账单表结构...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    try {
      await connection.beginTransaction()

      // 检查并添加新字段
      const fieldsToAdd = [
        { name: 'billing_month', type: 'VARCHAR(7) DEFAULT NULL COMMENT \'账单月份(YYYY-MM)\'' },
        { name: 'payment_method', type: 'VARCHAR(100) DEFAULT NULL COMMENT \'结算方式\'' },
        { name: 'sales_amount', type: 'DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT \'销售额\'' },
        { name: 'is_invoiced', type: 'TINYINT NOT NULL DEFAULT 0 COMMENT \'是否开票: 0=未开票, 1=已开票\'' },
        { name: 'invoice_date', type: 'DATE DEFAULT NULL COMMENT \'开票日期\'' },
        { name: 'invoice_number', type: 'VARCHAR(100) DEFAULT NULL COMMENT \'发票号\'' },
        { name: 'document_date', type: 'DATE DEFAULT NULL COMMENT \'制单日期\'' }
      ]

      for (const field of fieldsToAdd) {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM settlement_statements LIKE '${field.name}'
        `)

        if (columns.length === 0) {
          console.log(`添加 ${field.name} 字段...`)
          await connection.query(`
            ALTER TABLE settlement_statements
            ADD COLUMN ${field.name} ${field.type}
          `)
        } else {
          console.log(`${field.name} 字段已存在，跳过`)
        }
      }

      // 删除不再需要的字段
      const fieldsToDrop = ['received_amount', 'balance_amount', 'handling_fee', 'status']

      for (const fieldName of fieldsToDrop) {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM settlement_statements LIKE '${fieldName}'
        `)

        if (columns.length > 0) {
          console.log(`删除 ${fieldName} 字段...`)
          await connection.query(`
            ALTER TABLE settlement_statements
            DROP COLUMN ${fieldName}
          `)
        }
      }

      // 更新 settlement_statement_items 表，添加商品信息字段
      const itemFieldsToAdd = [
        { name: 'delivery_date', type: 'DATE DEFAULT NULL COMMENT \'出库日期\'' },
        { name: 'delivery_number', type: 'VARCHAR(50) DEFAULT NULL COMMENT \'出库编号\'' },
        { name: 'product_code', type: 'VARCHAR(100) DEFAULT NULL COMMENT \'产品代码\'' },
        { name: 'product_name', type: 'VARCHAR(200) DEFAULT NULL COMMENT \'产品名称\'' },
        { name: 'product_model', type: 'VARCHAR(100) DEFAULT NULL COMMENT \'产品型号\'' },
        { name: 'product_description', type: 'VARCHAR(500) DEFAULT NULL COMMENT \'产品描述\'' },
        { name: 'quantity', type: 'DECIMAL(15,2) DEFAULT 0 COMMENT \'数量\'' },
        { name: 'currency', type: 'VARCHAR(20) DEFAULT NULL COMMENT \'币种\'' },
        { name: 'unit', type: 'VARCHAR(20) DEFAULT NULL COMMENT \'单位\'' },
        { name: 'unit_price', type: 'DECIMAL(15,2) DEFAULT 0 COMMENT \'单价\'' },
        { name: 'amount_with_tax', type: 'DECIMAL(15,2) DEFAULT 0 COMMENT \'金额(含税)\'' },
        { name: 'remarks', type: 'VARCHAR(500) DEFAULT NULL COMMENT \'备注\'' }
      ]

      for (const field of itemFieldsToAdd) {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM settlement_statement_items LIKE '${field.name}'
        `)

        if (columns.length === 0) {
          console.log(`添加 items.${field.name} 字段...`)
          await connection.query(`
            ALTER TABLE settlement_statement_items
            ADD COLUMN ${field.name} ${field.type}
          `)
        }
      }

      await connection.commit()

      console.log('✓ 对账单表结构更新完成！')
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
    console.log('✓ No down migration for schema update')
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
