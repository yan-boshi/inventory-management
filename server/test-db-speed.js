import pool from './config/database.js'

console.time('Total query')
try {
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin'])
  console.timeEnd('Total query')
  console.log('Result:', rows)
} catch (error) {
  console.error('Error:', error)
} finally {
  await pool.end()
}
