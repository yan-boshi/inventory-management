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

    console.log('开始创建对账单表...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    try {
      await connection.beginTransaction()

      // 创建对账单主表
      const [statementsTables] = await connection.query(`
        SHOW TABLES LIKE 'settlement_statements'
      `)

      if (statementsTables.length === 0) {
        console.log('创建 settlement_statements 表...')
        await connection.query(`
          CREATE TABLE settlement_statements (
            statement_id VARCHAR(36) PRIMARY KEY COMMENT '主键',
            statement_number VARCHAR(50) NOT NULL COMMENT '对账单编号',
            type TINYINT NOT NULL COMMENT '类型: 1=应收, 2=应付',
            entity_id VARCHAR(36) NOT NULL COMMENT '客户ID或供应商ID',
            entity_name VARCHAR(200) DEFAULT NULL COMMENT '客户名称或供应商名称',
            business_type VARCHAR(100) DEFAULT NULL COMMENT '业务类型',
            total_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '总金额',
            invoiced_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '已开票金额',
            uninvoiced_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '未开票金额',
            received_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '已收/付金额',
            balance_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '未收/付余额',
            handling_fee DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '手续费',
            status TINYINT NOT NULL DEFAULT 0 COMMENT '结算状态: 0=待结算, 1=已结算',
            billing_status TINYINT NOT NULL DEFAULT 0 COMMENT '开票状态: 0=未开票, 1=已开票, 2=部分开票',
            due_date DATE DEFAULT NULL COMMENT '结算日期',
            remarks TEXT DEFAULT NULL COMMENT '备注',
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            UNIQUE INDEX idx_statement_number (statement_number),
            INDEX idx_type (type),
            INDEX idx_entity_id (entity_id),
            INDEX idx_status (status),
            INDEX idx_billing_status (billing_status),
            INDEX idx_due_date (due_date),
            INDEX idx_create_time (create_time)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对账单主表'
        `)
        console.log('✓ settlement_statements 表创建成功')
      } else {
        console.log('✓ settlement_statements 表已存在，跳过创建')
      }

      // 创建对账单明细表（关联应收/应付）
      const [itemsTables] = await connection.query(`
        SHOW TABLES LIKE 'settlement_statement_items'
      `)

      if (itemsTables.length === 0) {
        console.log('创建 settlement_statement_items 表...')
        await connection.query(`
          CREATE TABLE settlement_statement_items (
            item_id VARCHAR(36) PRIMARY KEY COMMENT '主键',
            statement_id VARCHAR(36) NOT NULL COMMENT '对账单ID',
            source_type TINYINT NOT NULL COMMENT '来源类型: 1=应收, 2=应付',
            source_id VARCHAR(36) NOT NULL COMMENT '来源ID（receivable_id或payable_id）',
            amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '金额',
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            INDEX idx_statement_id (statement_id),
            INDEX idx_source (source_type, source_id),
            FOREIGN KEY (statement_id) REFERENCES settlement_statements(statement_id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对账单明细表'
        `)
        console.log('✓ settlement_statement_items 表创建成功')
      } else {
        console.log('✓ settlement_statement_items 表已存在，跳过创建')
      }

      await connection.commit()

      console.log('✓ 对账单表迁移完成！')
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

    console.log('Dropping settlement tables...')
    await connection.query('DROP TABLE IF EXISTS settlement_statement_items')
    await connection.query('DROP TABLE IF EXISTS settlement_statements')
    console.log('✓ Tables dropped successfully')
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
