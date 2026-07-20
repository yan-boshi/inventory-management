import pool from '../config/database.js'

async function migrate() {
  console.log('开始删除 business_type 字段...')

  try {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 检查 settlement_statements 表是否有 business_type 字段
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM settlement_statements LIKE 'business_type'
      `)

      if (columns.length > 0) {
        console.log('删除 settlement_statements 表的 business_type 字段...')
        await connection.query(`
          ALTER TABLE settlement_statements
          DROP COLUMN business_type
        `)
        console.log('business_type 字段删除成功')
      } else {
        console.log('settlement_statements 表没有 business_type 字段，跳过')
      }

      await connection.commit()

      console.log('迁移完成！')
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
