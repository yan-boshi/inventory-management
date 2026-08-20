import pool from '../config/database.js'

async function up() {
  const connection = await pool.getConnection()
  try {
    // 创建入库退货单表
    console.log('Creating inbound_return_orders table...')
    const [tables1] = await connection.query(`
      SHOW TABLES LIKE 'inbound_return_orders'
    `)
    if (tables1.length === 0) {
      await connection.query(`
        CREATE TABLE inbound_return_orders (
          inbound_return_id VARCHAR(36) PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '退货单编号',
          source_order_id VARCHAR(36) COMMENT '来源入库单ID',
          source_order_number VARCHAR(50) COMMENT '来源入库单单号',
          contract_number VARCHAR(100) COMMENT '采购合同编号',
          supplier_name VARCHAR(255) COMMENT '供应商名称',
          supplier_code VARCHAR(50) COMMENT '供应商代码',
          return_items TEXT COMMENT '退货商品明细(JSON)',
          total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '退货总金额',
          return_time DATETIME COMMENT '退货时间',
          entry_date DATE COMMENT '录入日期',
          currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
          return_person VARCHAR(100) COMMENT '退货操作人',
          reason TEXT COMMENT '退货原因',
          remarks TEXT COMMENT '备注',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_order_number (order_number),
          INDEX idx_source_order_id (source_order_id),
          INDEX idx_contract_number (contract_number),
          INDEX idx_supplier_name (supplier_name),
          INDEX idx_entry_date (entry_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('inbound_return_orders table created successfully')
    } else {
      console.log('inbound_return_orders table already exists')
    }

    // 创建出库退货单表
    console.log('Creating outbound_return_orders table...')
    const [tables2] = await connection.query(`
      SHOW TABLES LIKE 'outbound_return_orders'
    `)
    if (tables2.length === 0) {
      await connection.query(`
        CREATE TABLE outbound_return_orders (
          outbound_return_id VARCHAR(36) PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '退货单编号',
          source_order_id VARCHAR(36) COMMENT '来源出库单ID',
          source_order_number VARCHAR(50) COMMENT '来源出库单单号',
          contract_number VARCHAR(100) COMMENT '销售合同编号',
          customer_name VARCHAR(255) COMMENT '客户名称',
          customer_code VARCHAR(50) COMMENT '客户代码',
          return_items TEXT COMMENT '退货商品明细(JSON)',
          total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '退货总金额',
          return_time DATETIME COMMENT '退货时间',
          entry_date DATE COMMENT '录入日期',
          currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种',
          return_person VARCHAR(100) COMMENT '退货操作人',
          reason TEXT COMMENT '退货原因',
          remarks TEXT COMMENT '备注',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_order_number (order_number),
          INDEX idx_source_order_id (source_order_id),
          INDEX idx_contract_number (contract_number),
          INDEX idx_customer_name (customer_name),
          INDEX idx_entry_date (entry_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('outbound_return_orders table created successfully')
    } else {
      console.log('outbound_return_orders table already exists')
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
    console.log('Dropping return order tables...')
    await connection.query('DROP TABLE IF EXISTS inbound_return_orders')
    await connection.query('DROP TABLE IF EXISTS outbound_return_orders')
    console.log('Return order tables dropped')
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
