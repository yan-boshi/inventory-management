// 登录/注册接口限流（内存版，单实例部署适用）
//
// 按 IP 滑动窗口计数，超限返回 429。多实例部署需换 Redis 等共享存储。

const WINDOW_MS = 15 * 60 * 1000 // 15 分钟
const MAX_ATTEMPTS = 20 // 单 IP 每窗口最多请求次数（含成功与失败）

const attempts = new Map() // ip -> { start, count }

// 顺手清理过期窗口，防止内存无限增长
function sweep(now) {
  if (attempts.size < 10000) return
  for (const [ip, rec] of attempts) {
    if (now - rec.start > WINDOW_MS) attempts.delete(ip)
  }
}

export function authRateLimit(req, res, next) {
  const now = Date.now()
  sweep(now)

  const ip = req.ip || req.socket?.remoteAddress || 'unknown'
  const rec = attempts.get(ip)

  if (!rec || now - rec.start > WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 })
    return next()
  }

  rec.count += 1
  if (rec.count > MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: '尝试过于频繁，请 15 分钟后再试'
    })
  }
  next()
}

export default authRateLimit
