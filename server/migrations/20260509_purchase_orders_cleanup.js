import pool from '../config/database.js'

async function cleanup() {
  console.log('开始清理备份字段...')

  try {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [columns] = await connection.query(`SHOW COLUMNS FROM purchase_orders`)
      const columnNames = columns.map(col => col.Field)

      const columnsToDrop = [
        'payment_method_old',
        'business_category_old',
        'product_name_old',
        'model_old',
        'description_old',
        'product_code_old',
        'unit_old',
        'quantity_old',
        'tax_rate_old',
        'tax_included_price_old',
        'tax_excluded_price_old',
        'tax_included_amount_old',
        'tax_excluded_amount_old',
        'tax_amount_old',
        'is_returned_old',
      ]

      for (const column of columnsToDrop) {
        if (columnNames.includes(column)) {
          try {
            await connection.query(`ALTER TABLE purchase_orders DROP COLUMN ${column}`)
            console.log(`已删除字段: ${column}`)
          } catch (error) {
            console.log(`删除字段失败: ${column}`, error.message)
          }
        } else {
          console.log(`字段不存在，跳过: ${column}`)
        }
      }

      await connection.commit()
      console.log('清理完成！')
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('清理失败:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

cleanup()
