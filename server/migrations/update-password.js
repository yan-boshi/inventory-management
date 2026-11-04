import pool from '../config/database.js'
import bcrypt from 'bcrypt'

// 用法：NEW_PASSWORD=<新口令(至少8位)> node update-password.js [username]
//
// 不再内置默认口令——本脚本曾把 admin 静默重置成 admin123，
// 任何人误跑一次就等于把大门钥匙插在门上。
const password = process.env.NEW_PASSWORD
const username = process.argv[2] || 'admin'

if (!password || password.length < 8) {
  console.error('用法：NEW_PASSWORD=<新口令(至少8位)> node update-password.js [username]')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 10)

try {
  const [result] = await pool.query(
    'UPDATE users SET password = ? WHERE username = ?',
    [hash, username]
  )
  console.log(`Password updated for user "${username}":`, result.affectedRows, 'rows affected')
} catch (error) {
  console.error('Error updating password:', error)
} finally {
  await pool.end()
}
