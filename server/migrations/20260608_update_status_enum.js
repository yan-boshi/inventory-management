import pool from '../config/database.js'

async function up() {
  const connection = await pool.getConnection()
  try {
    console.log('Starting migration: update status ENUM for sales_orders and purchase_orders...')

    // Update sales_orders status ENUM
    await connection.query(`
      ALTER TABLE sales_orders
      MODIFY COLUMN status ENUM('1', '2', '3', '4') NOT NULL DEFAULT '1'
      COMMENT '1:未出库, 2:已全部出库, 3:已部分出库, 4:退货'
    `)
    console.log('Updated sales_orders status ENUM')

    // Update existing status=2 (已退货) to status=4 (退货)
    await connection.query(`
      UPDATE sales_orders SET status = '4' WHERE status = '2'
    `)
    console.log('Migrated sales_orders returned status from 2 to 4')

    // Update purchase_orders status ENUM
    await connection.query(`
      ALTER TABLE purchase_orders
      MODIFY COLUMN status ENUM('1', '2', '3', '4') NOT NULL DEFAULT '1'
      COMMENT '1:未入库, 2:已全部入库, 3:已部分入库, 4:退货'
    `)
    console.log('Updated purchase_orders status ENUM')

    // Update existing status=2 (已到货) to status=2 (已全部入库) - same value, no change needed
    console.log('purchase_orders status=2 maps to 已全部入库, no data migration needed')

    console.log('Migration completed successfully!')
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
    console.log('Rolling back migration: restore status ENUM...')

    // Rollback sales_orders
    await connection.query(`
      UPDATE sales_orders SET status = '2' WHERE status = '4'
    `)
    await connection.query(`
      ALTER TABLE sales_orders
      MODIFY COLUMN status ENUM('1', '2') NOT NULL DEFAULT '1'
      COMMENT '1:正常, 2:已退货'
    `)

    // Rollback purchase_orders
    await connection.query(`
      ALTER TABLE purchase_orders
      MODIFY COLUMN status ENUM('1', '2') NOT NULL DEFAULT '1'
      COMMENT '1:采购中, 2:已到货'
    `)

    console.log('Rollback completed!')
  } catch (error) {
    console.error('Rollback failed:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Run migration if called directly
const isMainModule = process.argv[1] && process.argv[1].includes('20260608_update_status_enum')
if (isMainModule) {
  const action = process.argv[2]
  if (action === 'down') {
    down().then(() => process.exit(0)).catch(() => process.exit(1))
  } else {
    up().then(() => process.exit(0)).catch(() => process.exit(1))
  }
}

export { up, down }
