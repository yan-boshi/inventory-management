import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function up() {
  const connection = await pool.getConnection()
  try {
    console.log('Creating write-off tables...')

    // Create write_off_documents table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS write_off_documents (
        write_off_id VARCHAR(36) PRIMARY KEY,
        write_off_number VARCHAR(30) NOT NULL UNIQUE,
        type TINYINT NOT NULL COMMENT '核销类型: 1=应收核销, 2=应付核销',
        entity_id VARCHAR(50) NOT NULL COMMENT '客户/供应商代码',
        entity_name VARCHAR(100) NOT NULL COMMENT '客户/供应商名称',
        write_off_date DATE COMMENT '核销日期',
        payment_method VARCHAR(50) COMMENT '收付款方式',
        bank_reference VARCHAR(100) COMMENT '银行流水号',
        document_date DATE COMMENT '制单日期',
        total_amount DECIMAL(15,4) DEFAULT 0 COMMENT '核销总额',
        status TINYINT DEFAULT 1 COMMENT '状态: 0=已作废, 1=已核销',
        remarks TEXT COMMENT '备注',
        created_by VARCHAR(50) COMMENT '创建人',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_write_off_number (write_off_number),
        INDEX idx_type (type),
        INDEX idx_entity_id (entity_id),
        INDEX idx_write_off_date (write_off_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('✓ Created write_off_documents table')

    // Create write_off_items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS write_off_items (
        item_id VARCHAR(36) PRIMARY KEY,
        write_off_id VARCHAR(36) NOT NULL COMMENT '核销单ID',
        source_type TINYINT COMMENT '核销类型: 1=应收核销, 2=应付核销',
        source_id VARCHAR(36) NOT NULL COMMENT '来源账款ID',
        source_bill_id VARCHAR(50) COMMENT '来源单据号',
        source_bill_type TINYINT COMMENT '来源类型: 1=出库单/入库单, 2=退货单',
        write_off_amount DECIMAL(15,4) DEFAULT 0 COMMENT '本次核销金额',
        target_amount DECIMAL(15,4) DEFAULT 0 COMMENT '核销时应收/应付总额',
        before_received DECIMAL(15,4) DEFAULT 0 COMMENT '核销前已收金额',
        after_received DECIMAL(15,4) DEFAULT 0 COMMENT '核销后已收金额',
        remarks TEXT COMMENT '备注',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_write_off_id (write_off_id),
        INDEX idx_source_id (source_id),
        FOREIGN KEY (write_off_id) REFERENCES write_off_documents(write_off_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('✓ Created write_off_items table')

    // Add received_amount and balance_amount columns to receivables if not exists
    const [receivablesColumns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'receivables'
      AND COLUMN_NAME IN ('received_amount', 'balance_amount')
    `)

    if (receivablesColumns.length < 2) {
      await connection.query(`
        ALTER TABLE receivables
        ADD COLUMN received_amount DECIMAL(15,4) DEFAULT 0 COMMENT '已核销金额',
        ADD COLUMN balance_amount DECIMAL(15,4) DEFAULT 0 COMMENT '待核销余额'
      `)
      console.log('✓ Added received_amount and balance_amount to receivables')
    } else {
      console.log('✓ Columns already exist in receivables')
    }

    // Add received_amount and balance_amount columns to payables if not exists
    const [payablesColumns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payables'
      AND COLUMN_NAME IN ('received_amount', 'balance_amount')
    `)

    if (payablesColumns.length < 2) {
      await connection.query(`
        ALTER TABLE payables
        ADD COLUMN received_amount DECIMAL(15,4) DEFAULT 0 COMMENT '已核销金额',
        ADD COLUMN balance_amount DECIMAL(15,4) DEFAULT 0 COMMENT '待核销余额'
      `)
      console.log('✓ Added received_amount and balance_amount to payables')
    } else {
      console.log('✓ Columns already exist in payables')
    }

    // Update balance_amount for existing records
    await connection.query(`
      UPDATE receivables
      SET balance_amount = amount - IFNULL(received_amount, 0)
      WHERE balance_amount = 0 AND amount > 0
    `)
    console.log('✓ Updated balance_amount for receivables')

    await connection.query(`
      UPDATE payables
      SET balance_amount = amount - IFNULL(received_amount, 0)
      WHERE balance_amount = 0 AND amount > 0
    `)
    console.log('✓ Updated balance_amount for payables')

    console.log('✓ All write-off tables created successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    connection.release()
  }
}

async function down() {
  const connection = await pool.getConnection()
  try {
    console.log('Dropping write-off tables...')

    await connection.query('DROP TABLE IF EXISTS write_off_items')
    console.log('✓ Dropped write_off_items table')

    await connection.query('DROP TABLE IF EXISTS write_off_documents')
    console.log('✓ Dropped write_off_documents table')

    // Remove columns from receivables and payables if they exist
    try {
      const [receivablesCols] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'receivables'
        AND COLUMN_NAME IN ('received_amount', 'balance_amount')
      `)
      if (receivablesCols.length > 0) {
        const cols = receivablesCols.map(c => `DROP COLUMN ${c.COLUMN_NAME}`).join(', ')
        await connection.query(`ALTER TABLE receivables ${cols}`)
        console.log('✓ Removed columns from receivables')
      } else {
        console.log('✓ Columns not found in receivables')
      }
    } catch (error) {
      console.log('Note: Could not remove columns from receivables:', error.message)
    }

    try {
      const [payablesCols] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payables'
        AND COLUMN_NAME IN ('received_amount', 'balance_amount')
      `)
      if (payablesCols.length > 0) {
        const cols = payablesCols.map(c => `DROP COLUMN ${c.COLUMN_NAME}`).join(', ')
        await connection.query(`ALTER TABLE payables ${cols}`)
        console.log('✓ Removed columns from payables')
      } else {
        console.log('✓ Columns not found in payables')
      }
    } catch (error) {
      console.log('Note: Could not remove columns from payables:', error.message)
    }

    console.log('✓ All write-off tables dropped successfully!')
  } catch (error) {
    console.error('Rollback failed:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Run migration
const command = process.argv[2]
if (command === 'down') {
  down()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
} else {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
