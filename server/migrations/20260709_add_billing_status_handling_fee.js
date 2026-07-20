import pool from '../config/database.js'

async function migrate() {
  console.log('开始添加开票状态和手续费字段...')

  try {
    const connection = await pool.getConnection()

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
        console.log('receivables 表字段添加成功')
      } else {
        console.log('receivables 表已存在这些字段，跳过')
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
        console.log('payables 表字段添加成功')
      } else {
        console.log('payables 表已存在这些字段，跳过')
      }

      await connection.commit()

      console.log('开票状态和手续费字段添加完成！')
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
