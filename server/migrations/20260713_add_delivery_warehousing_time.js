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

    console.log('开始添加出库时间/入库时间字段...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    try {
      await connection.beginTransaction()

      // 为应收账款表添加出库时间字段
      const [receivableColumns] = await connection.query(`
        SHOW COLUMNS FROM receivables LIKE 'delivery_time'
      `)

      if (receivableColumns.length === 0) {
        console.log('为 receivables 表添加 delivery_time 字段...')
        await connection.query(`
          ALTER TABLE receivables
          ADD COLUMN delivery_time DATETIME DEFAULT NULL COMMENT '出库时间'
        `)
        console.log('✓ receivables.delivery_time 字段添加成功')
      } else {
        console.log('✓ receivables.delivery_time 字段已存在，跳过')
      }

      // 为应付账款表添加入库时间字段
      const [payableColumns] = await connection.query(`
        SHOW COLUMNS FROM payables LIKE 'warehousing_time'
      `)

      if (payableColumns.length === 0) {
        console.log('为 payables 表添加 warehousing_time 字段...')
        await connection.query(`
          ALTER TABLE payables
          ADD COLUMN warehousing_time DATETIME DEFAULT NULL COMMENT '入库时间'
        `)
        console.log('✓ payables.warehousing_time 字段添加成功')
      } else {
        console.log('✓ payables.warehousing_time 字段已存在，跳过')
      }

      await connection.commit()

      console.log('✓ 出库时间/入库时间字段添加完成！')
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

    console.log('Removing delivery_time and warehousing_time columns...')
    await connection.query(`ALTER TABLE receivables DROP COLUMN delivery_time`)
    await connection.query(`ALTER TABLE payables DROP COLUMN warehousing_time`)
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
