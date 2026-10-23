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

// 1. plan_deductions：单据生成时对计划明细的实际扣减记录，删除单据时按记录原路回补
// 2. sales_order_id / purchase_order_id：生成单据时关联的具体订单，
//    删除回退数量时与创建定位到同一张订单
const COLUMNS = [
  {
    table: 'delivery_orders',
    columns: [
      `ALTER TABLE delivery_orders ADD COLUMN plan_deductions JSON NULL COMMENT '生成时对计划明细的扣减记录'`,
      `ALTER TABLE delivery_orders ADD COLUMN sales_order_id VARCHAR(36) DEFAULT NULL COMMENT '关联销售订单ID'`
    ],
    drop: [
      `ALTER TABLE delivery_orders DROP COLUMN plan_deductions`,
      `ALTER TABLE delivery_orders DROP COLUMN sales_order_id`
    ]
  },
  {
    table: 'warehousing_orders',
    columns: [
      `ALTER TABLE warehousing_orders ADD COLUMN plan_deductions JSON NULL COMMENT '生成时对计划明细的扣减记录'`,
      `ALTER TABLE warehousing_orders ADD COLUMN purchase_order_id VARCHAR(36) DEFAULT NULL COMMENT '关联采购订单ID'`
    ],
    drop: [
      `ALTER TABLE warehousing_orders DROP COLUMN plan_deductions`,
      `ALTER TABLE warehousing_orders DROP COLUMN purchase_order_id`
    ]
  },
  {
    table: 'purchase_orders',
    columns: [
      `ALTER TABLE purchase_orders ADD COLUMN plan_deductions JSON NULL COMMENT '生成时对采购计划明细的扣减记录'`
    ],
    drop: [
      `ALTER TABLE purchase_orders DROP COLUMN plan_deductions`
    ]
  }
]

async function up() {
  let connection = null
  try {
    console.log('Connecting to database...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    try {
      await connection.beginTransaction()

      for (const entry of COLUMNS) {
        for (const alterSql of entry.columns) {
          // ALTER 语句里没有 IF NOT EXISTS，先查列名判断是否需要添加
          const columnName = /ADD COLUMN (\w+)/.exec(alterSql)?.[1]
          if (!columnName) continue
          const [rows] = await connection.query(
            `SHOW COLUMNS FROM ${entry.table} LIKE ?`,
            [columnName]
          )
          if (rows.length === 0) {
            await connection.query(alterSql)
            console.log(`✓ ${entry.table}.${columnName} 添加成功`)
          } else {
            console.log(`✓ ${entry.table}.${columnName} 已存在，跳过`)
          }
        }
      }

      await connection.commit()
      console.log('✓ 迁移完成！')
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

    for (const entry of COLUMNS) {
      for (const alterSql of entry.drop) {
        await connection.query(alterSql)
      }
      console.log(`✓ ${entry.table} 相关字段已删除`)
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
