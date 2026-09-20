export default {
  name: '20260922_add_payment_method_to_receivables_payables',

  async up(connection) {
    // 检查 receivables 表是否有 payment_method 列
    const [receivableColumns] = await connection.query(`
      SHOW COLUMNS FROM receivables LIKE 'payment_method'
    `)

    if (receivableColumns.length === 0) {
      await connection.query(`
        ALTER TABLE receivables
        ADD COLUMN payment_method VARCHAR(100) DEFAULT NULL COMMENT '结算方式' AFTER handling_fee
      `)
      console.log('receivables 表已添加 payment_method 列')
    }

    // 检查 payables 表是否有 payment_method 列
    const [payableColumns] = await connection.query(`
      SHOW COLUMNS FROM payables LIKE 'payment_method'
    `)

    if (payableColumns.length === 0) {
      await connection.query(`
        ALTER TABLE payables
        ADD COLUMN payment_method VARCHAR(100) DEFAULT NULL COMMENT '结算方式' AFTER handling_fee
      `)
      console.log('payables 表已添加 payment_method 列')
    }

    // 从 sales_orders 回填 receivables 的 payment_method
    // 通过 delivery_orders -> sales_orders 关联
    await connection.query(`
      UPDATE receivables r
      INNER JOIN delivery_orders d ON r.source_bill_id = d.order_number AND r.source_bill_type = 1
      INNER JOIN sales_orders s ON d.contract_number = s.contract_number
      SET r.payment_method = s.payment_method
      WHERE r.payment_method IS NULL AND r.source_bill_type = 1
    `)
    console.log('已从销售订单回填 receivables 的 payment_method')
  },

  async down(connection) {
    const [receivableColumns] = await connection.query(`
      SHOW COLUMNS FROM receivables LIKE 'payment_method'
    `)
    if (receivableColumns.length > 0) {
      await connection.query(`ALTER TABLE receivables DROP COLUMN payment_method`)
    }

    const [payableColumns] = await connection.query(`
      SHOW COLUMNS FROM payables LIKE 'payment_method'
    `)
    if (payableColumns.length > 0) {
      await connection.query(`ALTER TABLE payables DROP COLUMN payment_method`)
    }
  }
}
