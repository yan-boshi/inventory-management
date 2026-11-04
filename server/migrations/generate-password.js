import bcrypt from 'bcrypt'
import crypto from 'node:crypto'

// 用法：node generate-password.js [口令]
// 不传口令则随机生成一个；不再内置 admin123 这类默认口令
const password = process.argv[2] || crypto.randomBytes(9).toString('base64url')
const hash = await bcrypt.hash(password, 10)
console.log('Password:', password)
console.log('Hash:', hash)
