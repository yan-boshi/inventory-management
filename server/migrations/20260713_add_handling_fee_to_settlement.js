import pool from '../config/database.js'

async function migrate() {
  console.log('开始为对账单表添加手续费字段...')

  try {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 检查手续费字段是否已存在
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM settlement_statements LIKE 'handling_fee'
      `)

      if (columns.length === 0) {
        console.log('为 settlement_statements 表添加 handling_fee 字段...')
        await connection.query(`
          ALTER TABLE settlement_statements
          ADD COLUMN handling_fee DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '手续费'
        `)
        console.log('settlement_statements.handling_fee 字段添加成功')
      } else {
        console.log('settlement_statements.handling_fee 字段已存在，跳过')
      }

      await connection.commit()

      console.log('手续费字段添加完成！')
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
