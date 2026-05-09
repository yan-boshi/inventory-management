import User from '../models/User.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'x7K9mP2nR8vQz1wB4fL6sYjD5cVhN0pXqEaTgWuZiSbFkMlJdHrOyC'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

console.log('JWT_SECRET', JWT_SECRET)
console.log('JWT_EXPIRES_IN', JWT_EXPIRES_IN)

export const register = async (req, res) => {
  console.log('req.body', req.body)
  try {
    const { username, password, contact, remarks } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' })
    }

    const existingUser = await User.findByUsername(username)
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' })
    }

    const user = await User.create({
      username,
      password,
      role: 'normal',
      contact,
      remarks
    })
    console.log('user', user)

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          userId: user.user_id,
          username: user.username,
          role: user.role,
          contact: user.contact
        },
        token
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const login = async (req, res) => {
  try {
    console.log('req.body', req.body)
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' })
    }

    const user = await User.findByUsername(username)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const isValid = await User.verifyPassword(password, user.password)
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, role: user.role, phone: user.phone, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          userId: user.user_id,
          username: user.username,
          role: user.role,
          phone: user.phone,
          email: user.email
        },
        token
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({
      success: true,
      data: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        contact: user.contact,
        remarks: user.remarks
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const logout = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logout successful' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
