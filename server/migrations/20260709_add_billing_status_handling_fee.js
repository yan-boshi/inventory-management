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

    console.log('开始添加开票状态和手续费字段...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    try {
      await connection.beginTransaction()

      // 为应收账款表添加字段
      const [receivablesColumns] = await connection.query(`
        SHOW COLUMNS FROM receivables LIKE 'billing_status'
      `)

      if (receivablesColumns.length === 0) {
        console.log('为 receivables 表添加 billing_status 和 handling_fee 字段...')
        await connection.query(`
          ALTER TABLE receivables
          ADD COLUMN billing_status TINYINT NOT NULL DEFAULT 0 COMMENT '开票状态: 0=未开票, 1=已开票' AFTER status,
          ADD COLUMN handling_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT '手续费' AFTER billing_status
        `)
        console.log('✓ receivables 表字段添加成功')
      } else {
        console.log('✓ receivables 表已存在这些字段，跳过')
      }

      // 为应付账款表添加字段
      const [payablesColumns] = await connection.query(`
        SHOW COLUMNS FROM payables LIKE 'billing_status'
      `)

      if (payablesColumns.length === 0) {
        console.log('为 payables 表添加 billing_status 和 handling_fee 字段...')
        await connection.query(`
          ALTER TABLE payables
          ADD COLUMN billing_status TINYINT NOT NULL DEFAULT 0 COMMENT '开票状态: 0=未开票, 1=已开票' AFTER status,
          ADD COLUMN handling_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT '手续费' AFTER billing_status
        `)
        console.log('✓ payables 表字段添加成功')
      } else {
        console.log('✓ payables 表已存在这些字段，跳过')
      }

      await connection.commit()

      console.log('✓ 开票状态和手续费字段添加完成！')
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

    console.log('Removing billing_status and handling_fee columns...')
    await connection.query(`ALTER TABLE receivables DROP COLUMN billing_status, DROP COLUMN handling_fee`)
    await connection.query(`ALTER TABLE payables DROP COLUMN billing_status, DROP COLUMN handling_fee`)
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
