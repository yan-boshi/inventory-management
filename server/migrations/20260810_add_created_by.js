import pool from '../config/database.js'

async function up() {
  const connection = await pool.getConnection()
  try {
    console.log('Adding created_by column to customers and suppliers tables...')

    // 检查 customers 表是否已有 created_by 列
    const [customerColumns] = await connection.query(`
      SHOW COLUMNS FROM customers LIKE 'created_by'
    `)
    if (customerColumns.length === 0) {
      await connection.query(`
        ALTER TABLE customers
        ADD COLUMN created_by VARCHAR(100) DEFAULT NULL COMMENT '建档人'
      `)
      console.log('Added created_by to customers table')
    } else {
      console.log('created_by column already exists in customers table')
    }

    // 检查 suppliers 表是否已有 created_by 列
    const [supplierColumns] = await connection.query(`
      SHOW COLUMNS FROM suppliers LIKE 'created_by'
    `)
    if (supplierColumns.length === 0) {
      await connection.query(`
        ALTER TABLE suppliers
        ADD COLUMN created_by VARCHAR(100) DEFAULT NULL COMMENT '建档人'
      `)
      console.log('Added created_by to suppliers table')
    } else {
      console.log('created_by column already exists in suppliers table')
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
    console.log('Removing created_by column from customers and suppliers tables...')

    await connection.query(`
      ALTER TABLE customers
      DROP COLUMN created_by
    `)

    await connection.query(`
      ALTER TABLE suppliers
      DROP COLUMN created_by
    `)

    console.log('Successfully removed created_by column')
  } catch (error) {
    console.error('Rollback failed:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Run migration
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
