import pool from '../config/database.js'

async function migrate() {
  console.log('开始创建应收应付表...')

  try {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 创建应收账款表
      const [receivablesTables] = await connection.query(`
        SHOW TABLES LIKE 'receivables'
      `)

      if (receivablesTables.length === 0) {
        console.log('创建 receivables 表...')
        await connection.query(`
          CREATE TABLE receivables (
            receivable_id VARCHAR(36) PRIMARY KEY COMMENT '主键',
            customer_id VARCHAR(36) NOT NULL COMMENT '客户ID',
            customer_name VARCHAR(200) DEFAULT NULL COMMENT '客户名称',
            source_bill_type TINYINT NOT NULL COMMENT '来源单据类型: 1=出库单, 2=销售退货单',
            source_bill_id VARCHAR(50) NOT NULL COMMENT '来源单据编号',
            amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '应收金额',
            received_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '已收金额',
            balance_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '未收余额',
            due_date DATE DEFAULT NULL COMMENT '结算日期',
            status TINYINT NOT NULL DEFAULT 0 COMMENT '核销状态: 0=未核销, 1=部分核销, 2=已核销',
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            INDEX idx_customer_id (customer_id),
            INDEX idx_source_bill_id (source_bill_id),
            INDEX idx_status (status),
            INDEX idx_due_date (due_date),
            INDEX idx_create_time (create_time)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应收账款表'
        `)
        console.log('receivables 表创建成功')
      } else {
        console.log('receivables 表已存在，跳过创建')
      }

      // 创建应付账款表
      const [payablesTables] = await connection.query(`
        SHOW TABLES LIKE 'payables'
      `)

      if (payablesTables.length === 0) {
        console.log('创建 payables 表...')
        await connection.query(`
          CREATE TABLE payables (
            payable_id VARCHAR(36) PRIMARY KEY COMMENT '主键',
            supplier_id VARCHAR(36) NOT NULL COMMENT '供应商ID',
            supplier_name VARCHAR(200) DEFAULT NULL COMMENT '供应商名称',
            source_bill_type TINYINT NOT NULL COMMENT '来源单据类型: 1=入库单, 2=采购退货单',
            source_bill_id VARCHAR(50) NOT NULL COMMENT '来源单据编号',
            amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '应付金额',
            received_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '已付金额',
            balance_amount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '未付余额',
            due_date DATE DEFAULT NULL COMMENT '结算日期',
            status TINYINT NOT NULL DEFAULT 0 COMMENT '核销状态: 0=未核销, 1=部分核销, 2=已核销',
            create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            INDEX idx_supplier_id (supplier_id),
            INDEX idx_source_bill_id (source_bill_id),
            INDEX idx_status (status),
            INDEX idx_due_date (due_date),
            INDEX idx_create_time (create_time)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应付账款表'
        `)
        console.log('payables 表创建成功')
      } else {
        console.log('payables 表已存在，跳过创建')
      }

      await connection.commit()

      console.log('应收应付表迁移完成！')
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
