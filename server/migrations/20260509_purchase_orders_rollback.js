import pool from '../config/database.js'

async function rollback() {
  console.log('开始回滚迁移...')

  try {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [columns] = await connection.query(`SHOW COLUMNS FROM purchase_orders`)
      const columnNames = columns.map(col => col.Field)

      console.log('1. 删除新字段...')

      if (columnNames.includes('purchase_items')) {
        await connection.query(`ALTER TABLE purchase_orders DROP COLUMN purchase_items`)
        console.log('已删除 purchase_items 字段')
      }

      if (columnNames.includes('status')) {
        await connection.query(`ALTER TABLE purchase_orders DROP COLUMN status`)
        console.log('已删除 status 字段')
      }

      console.log('2. 恢复备份字段...')

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN payment_method_old payment_method VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN business_category_old business_category VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN product_name_old product_name VARCHAR(255) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN model_old model VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN description_old description TEXT DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN product_code_old product_code VARCHAR(100) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN unit_old unit VARCHAR(50) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN quantity_old quantity INT DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_rate_old tax_rate DECIMAL(5,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_included_price_old tax_included_price DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_excluded_price_old tax_excluded_price DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_included_amount_old tax_included_amount DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_excluded_amount_old tax_excluded_amount DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN tax_amount_old tax_amount DECIMAL(15,2) DEFAULT NULL
      `)

      await connection.query(`
        ALTER TABLE purchase_orders
        CHANGE COLUMN is_returned_old is_returned BOOLEAN DEFAULT FALSE
      `)

      await connection.commit()
      console.log('回滚成功完成！')
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('回滚失败:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

rollback()
