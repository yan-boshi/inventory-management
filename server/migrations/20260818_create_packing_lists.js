import pool from '../config/database.js'

export async function up() {
  const query = `
    CREATE TABLE IF NOT EXISTS packing_lists (
      packing_list_id VARCHAR(36) PRIMARY KEY,
      packing_no VARCHAR(50) NOT NULL UNIQUE,
      packing_date DATE NOT NULL,
      po_number VARCHAR(100),
      sales_order_id VARCHAR(36),
      seller_name VARCHAR(200),
      seller_contact VARCHAR(100),
      seller_address TEXT,
      seller_phone VARCHAR(50),
      buyer_name VARCHAR(200),
      buyer_contact VARCHAR(100),
      buyer_address TEXT,
      buyer_phone VARCHAR(50),
      packing_items JSON NOT NULL,
      total_packages VARCHAR(50),
      trade_terms VARCHAR(100),
      country_of_origin VARCHAR(100),
      title_en VARCHAR(100) DEFAULT 'Packing List',
      title_zh VARCHAR(100) DEFAULT '装箱单',
      seller_stamp LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_packing_no (packing_no),
      INDEX idx_sales_order_id (sales_order_id),
      INDEX idx_packing_date (packing_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `

  await pool.query(query)
  console.log('packing_lists table created successfully')
}

export async function down() {
  await pool.query('DROP TABLE IF EXISTS packing_lists')
  console.log('packing_lists table dropped successfully')
}

// 如果直接运行此文件
if (process.argv[1] && process.argv[1].includes('20260818_create_packing_lists')) {
  up().then(() => process.exit(0)).catch(err => {
    console.error(err)
    process.exit(1)
  })
}