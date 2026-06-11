import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// 生产环境必须设置 JWT_SECRET 环境变量
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('JWT_SECRET environment variable is required in production') })()
  : 'dev-only-secret-key-change-in-production')

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET)

    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' })
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }
    res.status(500).json({ success: false, message: error.message })
  }
}

export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' })
  }
  next()
}

export const advancedOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'advanced') {
    return res.status(403).json({ success: false, message: 'Advanced or admin access required' })
  }
  next()
}
