import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import { revokeToken } from '../utils/tokenBlacklist.js'

// 必须设置 JWT_SECRET 环境变量（由 loadEnv.js 从 .env 读取）；不再提供内置回退密钥
const JWT_SECRET = process.env.JWT_SECRET ||
  (() => { throw new Error('JWT_SECRET environment variable is required') })()
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

export const register = async (req, res) => {
  try {
    const { username, password, phone, email, remarks } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' })
    }

    if (!phone || !email) {
      return res.status(400).json({ success: false, message: 'Phone and email are required' })
    }

    const existingUser = await User.findByUsername(username)
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' })
    }

    const user = await User.create({
      username,
      password,
      role: 'normal',
      phone,
      email,
      remarks
    })

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
          phone: user.phone,
          email: user.email
        },
        token
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const login = async (req, res) => {
  try {
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
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({
      success: true,
      data: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        phone: user.phone,
        email: user.email,
        remarks: user.remarks
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const logout = async (req, res) => {
  try {
    // 将当前 token 加入黑名单，登出后立即失效
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = jwt.decode(token)
      revokeToken(token, decoded?.exp)
    }
    res.json({ success: true, message: 'Logout successful' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}
