// 已登出 token 黑名单（内存版，单实例部署适用）
//
// 登出时把 token 加入黑名单（按过期时间自动失效），auth 中间件校验后拒绝黑名单内的 token。
// 注意：进程重启后黑名单清空，但 JWT 本身有过期时间兜底；多实例部署需换共享存储。

const revoked = new Map() // token -> exp(ms)

export function revokeToken(token, expSeconds) {
  const exp = expSeconds ? expSeconds * 1000 : Date.now() + 24 * 60 * 60 * 1000
  revoked.set(token, exp)
  // 顺手清理已过期条目
  if (revoked.size > 10000) {
    const now = Date.now()
    for (const [t, e] of revoked) {
      if (e <= now) revoked.delete(t)
    }
  }
}

export function isRevoked(token) {
  const exp = revoked.get(token)
  if (exp === undefined) return false
  if (exp <= Date.now()) {
    revoked.delete(token)
    return false
  }
  return true
}

export default { revokeToken, isRevoked }
