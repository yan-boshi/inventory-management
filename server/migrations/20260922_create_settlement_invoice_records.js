export default {
  name: '20260922_create_settlement_invoice_records',

  async up(connection) {
    // 创建开票记录表
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'settlement_invoice_records'
    `)

    if (tables.length === 0) {
      await connection.query(`
        CREATE TABLE settlement_invoice_records (
          invoice_record_id VARCHAR(36) PRIMARY KEY,
          statement_id VARCHAR(36) NOT NULL COMMENT '对账单ID',
          invoice_date DATE DEFAULT NULL COMMENT '开票日期',
          invoice_number VARCHAR(100) DEFAULT NULL COMMENT '发票号',
          invoiced_amount DECIMAL(15,4) NOT NULL DEFAULT 0 COMMENT '已开票金额',
          uninvoiced_amount DECIMAL(15,4) NOT NULL DEFAULT 0 COMMENT '未开票金额',
          create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_statement_id (statement_id),
          CONSTRAINT fk_invoice_record_statement FOREIGN KEY (statement_id)
            REFERENCES settlement_statements(statement_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对账单开票记录'
      `)
      console.log('settlement_invoice_records 表创建成功')
    }

    // 将现有对账单的开票数据迁移到新表
    const [existingRecords] = await connection.query(`
      SELECT statement_id, invoice_date, invoice_number, invoiced_amount, uninvoiced_amount
      FROM settlement_statements
      WHERE invoice_date IS NOT NULL OR invoice_number IS NOT NULL
        OR invoiced_amount > 0 OR uninvoiced_amount > 0
    `)

    for (const record of existingRecords) {
      const { generateUUID } = await import('../utils/uuid.js')
      await connection.query(`
        INSERT INTO settlement_invoice_records
          (invoice_record_id, statement_id, invoice_date, invoice_number, invoiced_amount, uninvoiced_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        generateUUID(),
        record.statement_id,
        record.invoice_date,
        record.invoice_number,
        record.invoiced_amount || 0,
        record.uninvoiced_amount || 0
      ])
    }
    console.log(`已迁移 ${existingRecords.length} 条开票记录`)
  },

  async down(connection) {
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'settlement_invoice_records'
    `)
    if (tables.length > 0) {
      await connection.query(`DROP TABLE settlement_invoice_records`)
    }
  }
}
