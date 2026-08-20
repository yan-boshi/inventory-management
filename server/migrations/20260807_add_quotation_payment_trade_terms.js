import pool from '../config/database.js'

async function up() {
  const connection = await pool.getConnection()
  try {
    console.log('Adding payment_terms and trade_terms columns to quotations table...')

    await connection.query(`
      ALTER TABLE quotations
      ADD COLUMN payment_terms VARCHAR(255) DEFAULT NULL COMMENT '付款方式',
      ADD COLUMN trade_terms VARCHAR(255) DEFAULT NULL COMMENT '贸易条款'
    `)

    console.log('Successfully added payment_terms and trade_terms columns')
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
    console.log('Removing payment_terms and trade_terms columns from quotations table...')

    await connection.query(`
      ALTER TABLE quotations
      DROP COLUMN payment_terms,
      DROP COLUMN trade_terms
    `)

    console.log('Successfully removed payment_terms and trade_terms columns')
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
