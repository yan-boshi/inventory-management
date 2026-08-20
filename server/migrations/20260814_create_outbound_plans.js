import pool from '../config/database.js'

async function up() {
  const connection = await pool.getConnection()
  try {
    console.log('Creating outbound_plans table...')

    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'outbound_plans'
    `)
    if (tables.length === 0) {
      await connection.query(`
        CREATE TABLE outbound_plans (
          outbound_plan_id VARCHAR(36) PRIMARY KEY,
          plan_number VARCHAR(50) UNIQUE NOT NULL COMMENT '出库计划单编号',
          sales_order_id VARCHAR(36) COMMENT '关联销售订单ID',
          contract_number VARCHAR(100) COMMENT '销售合同编号',
          customer_name VARCHAR(255) COMMENT '客户名称',
          plan_items TEXT COMMENT '计划明细(JSON)',
          currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
          entry_date DATE COMMENT '录入日期',
          sales_person VARCHAR(100) COMMENT '销售员',
          status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/completed/cancelled',
          remarks TEXT COMMENT '备注',
          created_by VARCHAR(100) COMMENT '建档人',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_plan_number (plan_number),
          INDEX idx_contract_number (contract_number),
          INDEX idx_sales_order_id (sales_order_id),
          INDEX idx_entry_date (entry_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('outbound_plans table created successfully')
    } else {
      console.log('outbound_plans table already exists')
    }

    console.log('Migration completed')
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
    console.log('Dropping outbound_plans table...')
    await connection.query('DROP TABLE IF EXISTS outbound_plans')
    console.log('outbound_plans table dropped')
  } catch (error) {
    console.error('Rollback failed:', error)
    throw error
  } finally {
    connection.release()
  }
}

const action = process.argv[2]

if (action === 'down') {
  down()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
} else {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
