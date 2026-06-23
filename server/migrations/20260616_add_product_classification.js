import pool from '../config/database.js'

const migration = async () => {
  const connection = await pool.getConnection()
  try {
    console.log('开始迁移：为 products 表添加 product_classification 字段...')

    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'product_classification'
    `)

    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE products ADD COLUMN product_classification TEXT COMMENT '产品分类（JSON字符串：分类方案/一级/二级/三级）' AFTER tax_excluded_price
      `)
      console.log('✅ product_classification 字段添加成功')
    } else {
      console.log('⏭️ product_classification 字段已存在，跳过')
    }

    console.log('迁移完成')
  } catch (error) {
    console.error('迁移失败:', error.message)
    throw error
  } finally {
    connection.release()
  }
}

migration().then(() => process.exit(0)).catch(() => process.exit(1))
