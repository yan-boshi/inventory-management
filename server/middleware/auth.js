import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { isRevoked } from '../utils/tokenBlacklist.js'

// 必须设置 JWT_SECRET 环境变量（由 loadEnv.js 从 .env 读取）；
// 不再提供内置回退密钥——默认密钥等于认证体系不设防
const JWT_SECRET = process.env.JWT_SECRET ||
  (() => { throw new Error('JWT_SECRET environment variable is required') })()

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }

    const token = authHeader.substring(7)
    // 固定算法为 HS256，防御 alg 混淆
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })

    // 已登出的 token 不再有效
    if (isRevoked(token)) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

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
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
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
