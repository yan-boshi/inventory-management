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
})

async function up() {
  const connection = await pool.getConnection()
  try {
    // 创建币种表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS currencies (
        currency_id VARCHAR(36) PRIMARY KEY,
        currency_code VARCHAR(10) NOT NULL UNIQUE,
        currency_name VARCHAR(50) NOT NULL,
        currency_symbol VARCHAR(10) NOT NULL,
        decimal_places INT DEFAULT 2,
        is_base_currency TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('currencies 表创建成功')

    // 插入预置币种数据
    const currencies = [
      { id: 'cur-cny-001', code: 'CNY', name: '人民币', symbol: '¥', decimal_places: 2, is_base: 1, sort: 1 },
      { id: 'cur-hkd-001', code: 'HKD', name: '港币', symbol: 'HK$', decimal_places: 2, is_base: 0, sort: 2 },
      { id: 'cur-usd-001', code: 'USD', name: '美元', symbol: '$', decimal_places: 2, is_base: 0, sort: 3 },
      { id: 'cur-eur-001', code: 'EUR', name: '欧元', symbol: '€', decimal_places: 2, is_base: 0, sort: 4 },
    ]

    for (const cur of currencies) {
      await connection.query(
        `INSERT IGNORE INTO currencies (currency_id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [cur.id, cur.code, cur.name, cur.symbol, cur.decimal_places, cur.is_base, cur.sort]
      )
    }
    console.log('预置币种数据插入成功')
    console.log('\n✅ currencies 表迁移完成！')
  } finally {
    connection.release()
  }
}

async function down() {
  const connection = await pool.getConnection()
  try {
    await connection.query('DROP TABLE IF EXISTS currencies')
    console.log('currencies 表已删除')
    console.log('\n✅ currencies 表回滚完成！')
  } finally {
    connection.release()
  }
}

// 执行迁移
const action = process.argv[2]
if (action === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1))
} else {
  up().then(() => process.exit(0)).catch(() => process.exit(1))
}
