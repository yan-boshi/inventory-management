import pool from '../config/database.js'

async function verify() {
  try {
    const connection = await pool.getConnection()

    try {
      const [columns] = await connection.query(`SHOW COLUMNS FROM purchase_orders`)

      console.log('采购订单表结构:')
      console.log('-'.repeat(80))
      console.log('字段名'.padEnd(30), '类型'.padEnd(20), '允许空值', '默认值', '注释')
      console.log('-'.repeat(80))

      for (const col of columns) {
        console.log(
          col.Field.padEnd(30),
          col.Type.padEnd(20),
          col.Null.padEnd(10),
          (col.Default || '').toString().padEnd(10),
          col.Extra
        )
      }

      console.log('-'.repeat(80))

      const [orders] = await connection.query(`SELECT * FROM purchase_orders LIMIT 1`)
      if (orders.length > 0) {
        console.log('\n第一条订单数据:')
        console.log(JSON.stringify(orders[0], null, 2))
      } else {
        console.log('\n表中无数据')
      }
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('验证失败:', error)
  } finally {
    await pool.end()
  }
}

verify()
