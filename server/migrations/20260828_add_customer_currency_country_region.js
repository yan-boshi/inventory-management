import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'abc1234!',
  database: process.env.DB_NAME || 'inventory_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function up() {
  let connection = null
  try {
    console.log('Connecting to database...')
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}, Database: ${process.env.DB_NAME || 'inventory_management'}`)

    connection = await pool.getConnection()
    console.log('Database connected successfully')

    console.log('Adding currency, country, region columns to customers table...')

    // 检查 customers 表是否已有 currency 列
    const [currencyColumns] = await connection.query(`
      SHOW COLUMNS FROM customers LIKE 'currency'
    `)
    if (currencyColumns.length === 0) {
      await connection.query(`
        ALTER TABLE customers
        ADD COLUMN currency VARCHAR(10) DEFAULT NULL COMMENT '币种'
      `)
      console.log('✓ Added currency to customers table')
    } else {
      console.log('✓ currency column already exists in customers table')
    }

    // 检查 customers 表是否已有 country 列
    const [countryColumns] = await connection.query(`
      SHOW COLUMNS FROM customers LIKE 'country'
    `)
    if (countryColumns.length === 0) {
      await connection.query(`
        ALTER TABLE customers
        ADD COLUMN country VARCHAR(100) DEFAULT NULL COMMENT '国家'
      `)
      console.log('✓ Added country to customers table')
    } else {
      console.log('✓ country column already exists in customers table')
    }

    // 检查 customers 表是否已有 region 列
    const [regionColumns] = await connection.query(`
      SHOW COLUMNS FROM customers LIKE 'region'
    `)
    if (regionColumns.length === 0) {
      await connection.query(`
        ALTER TABLE customers
        ADD COLUMN region VARCHAR(100) DEFAULT NULL COMMENT '地区'
      `)
      console.log('✓ Added region to customers table')
    } else {
      console.log('✓ region column already exists in customers table')
    }

    // 检查 customers 表是否已有 receiver_phone 列
    const [receiverPhoneColumns] = await connection.query(`
      SHOW COLUMNS FROM customers LIKE 'receiver_phone'
    `)
    if (receiverPhoneColumns.length === 0) {
      await connection.query(`
        ALTER TABLE customers
        ADD COLUMN receiver_phone VARCHAR(50) DEFAULT NULL COMMENT '收货人联系电话'
      `)
      console.log('✓ Added receiver_phone to customers table')
    } else {
      console.log('✓ receiver_phone column already exists in customers table')
    }

    // 检查 customers 表是否已有 zip_code 列
    const [zipCodeColumns] = await connection.query(`
      SHOW COLUMNS FROM customers LIKE 'zip_code'
    `)
    if (zipCodeColumns.length === 0) {
      await connection.query(`
        ALTER TABLE customers
        ADD COLUMN zip_code VARCHAR(20) DEFAULT NULL COMMENT '邮编'
      `)
      console.log('✓ Added zip_code to customers table')
    } else {
      console.log('✓ zip_code column already exists in customers table')
    }

    // 检查 customers 表是否已有 express_account 列
    const [expressAccountColumns] = await connection.query(`
      SHOW COLUMNS FROM customers LIKE 'express_account'
    `)
    if (expressAccountColumns.length === 0) {
      await connection.query(`
        ALTER TABLE customers
        ADD COLUMN express_account VARCHAR(100) DEFAULT NULL COMMENT '快递账号'
      `)
      console.log('✓ Added express_account to customers table')
    } else {
      console.log('✓ express_account column already exists in customers table')
    }

    console.log('Adding currency, country, region columns to suppliers table...')

    // 检查 suppliers 表是否已有 currency 列
    const [supCurrencyColumns] = await connection.query(`
      SHOW COLUMNS FROM suppliers LIKE 'currency'
    `)
    if (supCurrencyColumns.length === 0) {
      await connection.query(`
        ALTER TABLE suppliers
        ADD COLUMN currency VARCHAR(10) DEFAULT NULL COMMENT '币种'
      `)
      console.log('✓ Added currency to suppliers table')
    } else {
      console.log('✓ currency column already exists in suppliers table')
    }

    // 检查 suppliers 表是否已有 country 列
    const [supCountryColumns] = await connection.query(`
      SHOW COLUMNS FROM suppliers LIKE 'country'
    `)
    if (supCountryColumns.length === 0) {
      await connection.query(`
        ALTER TABLE suppliers
        ADD COLUMN country VARCHAR(100) DEFAULT NULL COMMENT '国家'
      `)
      console.log('✓ Added country to suppliers table')
    } else {
      console.log('✓ country column already exists in suppliers table')
    }

    // 检查 suppliers 表是否已有 region 列
    const [supRegionColumns] = await connection.query(`
      SHOW COLUMNS FROM suppliers LIKE 'region'
    `)
    if (supRegionColumns.length === 0) {
      await connection.query(`
        ALTER TABLE suppliers
        ADD COLUMN region VARCHAR(100) DEFAULT NULL COMMENT '地区'
      `)
      console.log('✓ Added region to suppliers table')
    } else {
      console.log('✓ region column already exists in suppliers table')
    }

    console.log('✓ Migration completed')
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
    console.error('Full error:', error)
    throw error
  } finally {
    if (connection) {
      connection.release()
      console.log('Database connection released')
    }
    await pool.end()
  }
}

async function down() {
  let connection = null
  try {
    console.log('Connecting to database...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    console.log('Removing currency, country, region, receiver_phone, zip_code, express_account columns from customers table...')

    await connection.query(`
      ALTER TABLE customers
      DROP COLUMN currency,
      DROP COLUMN country,
      DROP COLUMN region,
      DROP COLUMN receiver_phone,
      DROP COLUMN zip_code,
      DROP COLUMN express_account
    `)

    console.log('✓ Successfully removed columns from customers table')

    console.log('Removing currency, country, region columns from suppliers table...')

    await connection.query(`
      ALTER TABLE suppliers
      DROP COLUMN currency,
      DROP COLUMN country,
      DROP COLUMN region
    `)

    console.log('✓ Successfully removed columns from suppliers table')
  } catch (error) {
    console.error('✗ Rollback failed:', error.message)
    console.error('Full error:', error)
    throw error
  } finally {
    if (connection) {
      connection.release()
      console.log('Database connection released')
    }
    await pool.end()
  }
}

// Run migration
const action = process.argv[2]

if (action === 'down') {
  down()
    .then(() => {
      console.log('Done')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Failed:', err.message)
      process.exit(1)
    })
} else {
  up()
    .then(() => {
      console.log('Done')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Failed:', err.message)
      process.exit(1)
    })
}
