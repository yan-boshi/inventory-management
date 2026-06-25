import pool from '../config/database.js'

async function migrate() {
  console.log('开始为出库单和入库单表添加录入日期字段...')

  try {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 检查 delivery_orders 表是否已有 entry_date 字段
      const [deliveryColumns] = await connection.query(`
        SHOW COLUMNS FROM delivery_orders LIKE 'entry_date'
      `)

      if (deliveryColumns.length === 0) {
        console.log('为 delivery_orders 表添加 entry_date 字段...')
        await connection.query(`
          ALTER TABLE delivery_orders ADD COLUMN entry_date DATE DEFAULT NULL COMMENT '录入日期' AFTER delivery_date
        `)
        console.log('delivery_orders 表 entry_date 字段添加成功')
      } else {
        console.log('delivery_orders 表已有 entry_date 字段，跳过')
      }

      // 检查 warehousing_orders 表是否已有 entry_date 字段
      const [warehousingColumns] = await connection.query(`
        SHOW COLUMNS FROM warehousing_orders LIKE 'entry_date'
      `)

      if (warehousingColumns.length === 0) {
        console.log('为 warehousing_orders 表添加 entry_date 字段...')
        await connection.query(`
          ALTER TABLE warehousing_orders ADD COLUMN entry_date DATE DEFAULT NULL COMMENT '录入日期' AFTER warehousing_time
        `)
        console.log('warehousing_orders 表 entry_date 字段添加成功')
      } else {
        console.log('warehousing_orders 表已有 entry_date 字段，跳过')
      }

      await connection.commit()

      console.log('录入日期字段迁移完成！')
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
