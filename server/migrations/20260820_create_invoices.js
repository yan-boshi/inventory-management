import pool from '../config/database.js'

export async function up() {
  const query = `
    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id VARCHAR(36) PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      so_number VARCHAR(50),
      invoice_date DATE NOT NULL,
      seller_name VARCHAR(200),
      seller_contact VARCHAR(100),
      seller_address TEXT,
      seller_phone VARCHAR(50),
      buyer_name VARCHAR(200),
      buyer_contact VARCHAR(100),
      buyer_address TEXT,
      buyer_phone VARCHAR(50),
      trade_terms VARCHAR(50),
      currency VARCHAR(20) DEFAULT 'USD',
      invoice_items JSON,
      total_value DECIMAL(15, 4),
      bank_name VARCHAR(200),
      bank_address TEXT,
      swift_code VARCHAR(50),
      beneficiary_name VARCHAR(200),
      beneficiary_address TEXT,
      account_number VARCHAR(50),
      seller_stamp LONGTEXT,
      sales_order_id VARCHAR(36),
      customer_code VARCHAR(50),
      remarks TEXT,
      created_by VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_invoice_number (invoice_number),
      INDEX idx_invoice_date (invoice_date),
      INDEX idx_sales_order_id (sales_order_id),
      INDEX idx_customer_code (customer_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `

  await pool.query(query)
  console.log('invoices table created successfully')
}

export async function down() {
  await pool.query('DROP TABLE IF EXISTS invoices')
  console.log('invoices table dropped successfully')
}

// 如果直接运行此文件
if (process.argv[1] && process.argv[1].includes('20260820_create_invoices')) {
  up().then(() => process.exit(0)).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
