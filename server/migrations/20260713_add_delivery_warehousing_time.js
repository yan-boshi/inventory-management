import pool from '../config/database.js'

async function migrate() {
  console.log('开始添加出库时间/入库时间字段...')

  try {
    const connection = await pool.getConnection()

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
        console.log('receivables.delivery_time 字段添加成功')
      } else {
        console.log('receivables.delivery_time 字段已存在，跳过')
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
        console.log('payables.warehousing_time 字段添加成功')
      } else {
        console.log('payables.warehousing_time 字段已存在，跳过')
      }

      await connection.commit()

      console.log('出库时间/入库时间字段添加完成！')
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('迁移失败:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
