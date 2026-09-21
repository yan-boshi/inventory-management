export default {
  name: '20260922_add_payment_method_to_receivables_payables',

  async up(connection) {
    try {
      // 检查 receivables 表是否有 payment_method 列
      const [receivableColumns] = await connection.query(`
        SHOW COLUMNS FROM receivables LIKE 'payment_method'
      `)

      if (receivableColumns.length === 0) {
        await connection.query(`
          ALTER TABLE receivables
          ADD COLUMN payment_method VARCHAR(100) DEFAULT NULL COMMENT '结算方式' AFTER handling_fee
        `)
        console.log('✅ receivables 表已添加 payment_method 列')
      } else {
        console.log('ℹ️  receivables 表已有 payment_method 列，跳过')
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
        console.log('✅ payables 表已添加 payment_method 列')
      } else {
        console.log('ℹ️  payables 表已有 payment_method 列，跳过')
      }

      // 从 sales_orders 回填 receivables 的 payment_method
      // 通过 delivery_orders -> sales_orders 关联
      const [updateResult] = await connection.query(`
        UPDATE receivables r
        INNER JOIN delivery_orders d ON r.source_bill_id = d.order_number AND r.source_bill_type = 1
        INNER JOIN sales_orders s ON d.contract_number = s.contract_number
        SET r.payment_method = s.payment_method
        WHERE r.payment_method IS NULL AND r.source_bill_type = 1
      `)
      console.log(`✅ 已从销售订单回填 receivables 的 payment_method，影响 ${updateResult.affectedRows} 条记录`)
      console.log('\n✅ payment_method 字段迁移完成！')
    } catch (error) {
      console.error('\n❌ payment_method 字段迁移失败:', error.message)
      throw error
    }
  },

  async down(connection) {
    try {
      const [receivableColumns] = await connection.query(`
        SHOW COLUMNS FROM receivables LIKE 'payment_method'
      `)
      if (receivableColumns.length > 0) {
        await connection.query(`ALTER TABLE receivables DROP COLUMN payment_method`)
        console.log('✅ receivables 表已删除 payment_method 列')
      }

      const [payableColumns] = await connection.query(`
        SHOW COLUMNS FROM payables LIKE 'payment_method'
      `)
      if (payableColumns.length > 0) {
        await connection.query(`ALTER TABLE payables DROP COLUMN payment_method`)
        console.log('✅ payables 表已删除 payment_method 列')
      }
      console.log('\n✅ payment_method 字段回滚完成！')
    } catch (error) {
      console.error('\n❌ payment_method 字段回滚失败:', error.message)
      throw error
    }
  }
}
