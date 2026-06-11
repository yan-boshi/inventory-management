/**
 * 数据库迁移：为销售订单和采购订单添加 sales_person 和 purchase_person 字段
 *
 * 使用方法：node server/migrations/20260610_add_sales_purchase_person.js
 */

import pool from '../config/database.js'

async function migrate() {
  const connection = await pool.getConnection()

  try {
    console.log('开始迁移：为订单表添加人员字段...')

    // 1. 为 sales_orders 表添加 sales_person 字段
    console.log('\n处理 sales_orders 表...')
    const [salesColumns] = await connection.query(
      `SHOW COLUMNS FROM sales_orders LIKE 'sales_person'`
    )
    if (salesColumns.length === 0) {
      await connection.query(
        `ALTER TABLE sales_orders ADD COLUMN sales_person VARCHAR(100) DEFAULT NULL COMMENT '销售人' AFTER remarks`
      )
      console.log('sales_orders 表已添加 sales_person 字段')
    } else {
      console.log('sales_orders 表已存在 sales_person 字段，跳过')
    }

    // 2. 为 purchase_orders 表添加 purchase_person 字段
    console.log('\n处理 purchase_orders 表...')
    const [purchaseColumns] = await connection.query(
      `SHOW COLUMNS FROM purchase_orders LIKE 'purchase_person'`
    )
    if (purchaseColumns.length === 0) {
      await connection.query(
        `ALTER TABLE purchase_orders ADD COLUMN purchase_person VARCHAR(100) DEFAULT NULL COMMENT '采购人' AFTER remarks`
      )
      console.log('purchase_orders 表已添加 purchase_person 字段')
    } else {
      console.log('purchase_orders 表已存在 purchase_person 字段，跳过')
    }

    console.log('\n迁移完成！')

  } catch (error) {
    console.error('迁移失败:', error)
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

// 执行迁移
migrate().catch(console.error)
