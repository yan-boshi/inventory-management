/**
 * 金额列精度迁移：DECIMAL(15,2) → DECIMAL(15,4)
 * 所有金额类（费用/成本/总额/税额/毛利/余额/单价）统一 4 位小数
 * 数量、汇率、税率列不动
 *
 * 运行：node server/migrations/20261013_money_columns_to_decimal15_4.js
 * 回滚：node server/migrations/20261013_money_columns_to_decimal15_4.js down
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
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// 格式: [表名, 列名, 新列定义]，执行前先检查列是否存在
const MONEY_COLUMNS = [
  // quotations
  ['quotations', 'tax_included_amount', "DECIMAL(15,4) DEFAULT 0.0000 COMMENT '含税总价'"],

  // sales_orders
  ['sales_orders', 'tax_included_amount', "DECIMAL(15,4) DEFAULT 0.0000 COMMENT '含税总价'"],

  // delivery_orders
  ['delivery_orders', 'total_amount', "DECIMAL(15,4) DEFAULT 0.0000 COMMENT '总计金额'"],

  // warehousing_orders
  ['warehousing_orders', 'total_amount', "DECIMAL(15,4) DEFAULT 0.0000 COMMENT '总计'"],

  // receivables
  ['receivables', 'amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '应收金额'"],
  ['receivables', 'received_amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '已收金额'"],
  ['receivables', 'balance_amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '未收余额'"],
  ['receivables', 'handling_fee', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '手续费'"],

  // payables
  ['payables', 'amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '应付金额'"],
  ['payables', 'received_amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '已付金额'"],
  ['payables', 'balance_amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '未付余额'"],
  ['payables', 'handling_fee', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '手续费'"],

  // settlement_statements（received_amount/balance_amount 已被 20260711_update 删除，不再包含）
  ['settlement_statements', 'total_amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '总金额'"],
  ['settlement_statements', 'invoiced_amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '已开票金额'"],
  ['settlement_statements', 'uninvoiced_amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '未开票金额'"],
  ['settlement_statements', 'handling_fee', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '手续费'"],
  ['settlement_statements', 'sales_amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '销售额'"],

  // settlement_statement_items（quantity 是数量，不动）
  ['settlement_statement_items', 'amount', "DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT '金额'"],
  ['settlement_statement_items', 'unit_price', "DECIMAL(15,4) DEFAULT 0.0000 COMMENT '单价'"],
  ['settlement_statement_items', 'amount_with_tax', "DECIMAL(15,4) DEFAULT 0.0000 COMMENT '金额(含税)'"],

  // 退货单
  ['inbound_return_orders', 'total_amount', "DECIMAL(15,4) DEFAULT 0.0000 COMMENT '退货总金额'"],
  ['outbound_return_orders', 'total_amount', "DECIMAL(15,4) DEFAULT 0.0000 COMMENT '退货总金额'"]
]

async function columnExists(connection, table, column) {
  const [rows] = await connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column])
  return rows.length > 0
}

async function up() {
  const connection = await pool.getConnection()
  let upgraded = 0
  let skipped = 0
  try {
    console.log('Upgrading money columns to DECIMAL(15,4)...')
    for (const [table, column, definition] of MONEY_COLUMNS) {
      if (!(await columnExists(connection, table, column))) {
        console.log(`  SKIP ${table}.${column} (column not found)`)
        skipped++
        continue
      }
      await connection.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`)
      upgraded++
    }
    await connection.commit()
    console.log(`Done. ${upgraded} columns upgraded, ${skipped} skipped.`)
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
    await pool.end()
  }
}

async function down() {
  const connection = await pool.getConnection()
  let downgraded = 0
  let skipped = 0
  try {
    console.log('Downgrading money columns to DECIMAL(15,2)...')
    for (const [table, column, definition] of MONEY_COLUMNS) {
      if (!(await columnExists(connection, table, column))) {
        console.log(`  SKIP ${table}.${column} (column not found)`)
        skipped++
        continue
      }
      const rollbackDef = definition.replace(/DECIMAL\(15,4\)/g, 'DECIMAL(15,2)').replace(/0\.0000/g, '0.00')
      await connection.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${rollbackDef}`)
      downgraded++
    }
    await connection.commit()
    console.log(`Done. ${downgraded} columns downgraded, ${skipped} skipped.`)
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
    await pool.end()
  }
}

const action = process.argv[2]
if (action === 'down') {
  down().catch(console.error)
} else {
  up().catch(console.error)
}