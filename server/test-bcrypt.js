import bcrypt from 'bcrypt'

const hash = '$2b$10$mzd5a06qTBh4cx.1qLK23O1FHtgHDH298g5NnOMCZGBsDQ0TkEuWa'
const password = 'admin123'

console.time('bcrypt.compare')
const isValid = await bcrypt.compare(password, hash)
console.timeEnd('bcrypt.compare')
console.log('Valid:', isValid)
