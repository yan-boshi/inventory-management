import User from './models/User.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'x7K9mP2nR8vQz1wB4fL6sYjD5cVhN0pXqEaTgWuZiSbFkMlJdHrOyC'

async function testLogin() {
  try {
    console.time('Total login')

    console.time('Find user')
    const user = await User.findByUsername('admin')
    console.timeEnd('Find user')
    console.log('User found:', user)

    console.time('Verify password')
    const isValid = await User.verifyPassword('admin123', user.password)
    console.timeEnd('Verify password')
    console.log('Password valid:', isValid)

    console.time('Sign JWT')
    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
    console.timeEnd('Sign JWT')
    console.log('Token:', token.substring(0, 50) + '...')

    console.timeEnd('Total login')
  } catch (error) {
    console.error('Error:', error)
  }
}

testLogin()
