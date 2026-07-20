import pool from '../config/database.js'

async function migrate() {
  console.log('开始更新对账单表结构...')

  try {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 检查并添加新字段
      const fieldsToAdd = [
        { name: 'billing_month', type: 'VARCHAR(7) DEFAULT NULL COMMENT \'账单月份(YYYY-MM)\'' },
        { name: 'payment_method', type: 'VARCHAR(100) DEFAULT NULL COMMENT \'结算方式\'' },
        { name: 'sales_amount', type: 'DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT \'销售额\'' },
        { name: 'is_invoiced', type: 'TINYINT NOT NULL DEFAULT 0 COMMENT \'是否开票: 0=未开票, 1=已开票\'' },
        { name: 'invoice_date', type: 'DATE DEFAULT NULL COMMENT \'开票日期\'' },
        { name: 'invoice_number', type: 'VARCHAR(100) DEFAULT NULL COMMENT \'发票号\'' },
        { name: 'document_date', type: 'DATE DEFAULT NULL COMMENT \'制单日期\'' }
      ]

      for (const field of fieldsToAdd) {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM settlement_statements LIKE '${field.name}'
        `)

        if (columns.length === 0) {
          console.log(`添加 ${field.name} 字段...`)
          await connection.query(`
            ALTER TABLE settlement_statements
            ADD COLUMN ${field.name} ${field.type}
          `)
        } else {
          console.log(`${field.name} 字段已存在，跳过`)
        }
      }

      // 删除不再需要的字段
      const fieldsToDrop = ['received_amount', 'balance_amount', 'handling_fee', 'status']

      for (const fieldName of fieldsToDrop) {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM settlement_statements LIKE '${fieldName}'
        `)

        if (columns.length > 0) {
          console.log(`删除 ${fieldName} 字段...`)
          await connection.query(`
            ALTER TABLE settlement_statements
            DROP COLUMN ${fieldName}
          `)
        }
      }

      // 更新 settlement_statement_items 表，添加商品信息字段
      const itemFieldsToAdd = [
        { name: 'delivery_date', type: 'DATE DEFAULT NULL COMMENT \'出库日期\'' },
        { name: 'delivery_number', type: 'VARCHAR(50) DEFAULT NULL COMMENT \'出库编号\'' },
        { name: 'product_code', type: 'VARCHAR(100) DEFAULT NULL COMMENT \'产品代码\'' },
        { name: 'product_name', type: 'VARCHAR(200) DEFAULT NULL COMMENT \'产品名称\'' },
        { name: 'product_model', type: 'VARCHAR(100) DEFAULT NULL COMMENT \'产品型号\'' },
        { name: 'product_description', type: 'VARCHAR(500) DEFAULT NULL COMMENT \'产品描述\'' },
        { name: 'quantity', type: 'DECIMAL(15,2) DEFAULT 0 COMMENT \'数量\'' },
        { name: 'currency', type: 'VARCHAR(20) DEFAULT NULL COMMENT \'币种\'' },
        { name: 'unit', type: 'VARCHAR(20) DEFAULT NULL COMMENT \'单位\'' },
        { name: 'unit_price', type: 'DECIMAL(15,2) DEFAULT 0 COMMENT \'单价\'' },
        { name: 'amount_with_tax', type: 'DECIMAL(15,2) DEFAULT 0 COMMENT \'金额(含税)\'' },
        { name: 'remarks', type: 'VARCHAR(500) DEFAULT NULL COMMENT \'备注\'' }
      ]

      for (const field of itemFieldsToAdd) {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM settlement_statement_items LIKE '${field.name}'
        `)

        if (columns.length === 0) {
          console.log(`添加 items.${field.name} 字段...`)
          await connection.query(`
            ALTER TABLE settlement_statement_items
            ADD COLUMN ${field.name} ${field.type}
          `)
        }
      }

      await connection.commit()

      console.log('对账单表结构更新完成！')
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
