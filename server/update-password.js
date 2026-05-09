import pool from './config/database.js'
import bcrypt from 'bcrypt'

const password = 'admin123'
const hash = await bcrypt.hash(password, 10)

try {
  const [result] = await pool.query(
    'UPDATE users SET password = ? WHERE username = ?',
    [hash, 'admin']
  )
  console.log('Password updated:', result.affectedRows, 'rows affected')
} catch (error) {
  console.error('Error updating password:', error)
} finally {
  await pool.end()
}
