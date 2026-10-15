// 金额舍入工具：四舍五入保留 4 位小数
// 与前端 src/utils/money.ts 的 round4 保持语义一致（half-away-from-zero），两处修改需同步

// 指数移位法，避免 toFixed 的浮点误差（如 (1.005).toFixed(2) === '1.00'）
function shift(value, exp) {
  const [mantissa, e = '0'] = String(value).split('e')
  return Number(`${mantissa}e${Number(e) + exp}`)
}

/**
 * 四舍五入保留 4 位小数（half-away-from-zero，负数对称）
 * round4(-1.00005) === -1.0001（Math.round 会得到 -1.0000）
 * NaN / null / undefined / 非有限数 → 0
 * @param {number|string|null|undefined} value
 * @returns {number}
 */
export function round4(value) {
  const num = typeof value === 'string' ? Number(value) : value
  if (num === null || num === undefined || !Number.isFinite(num)) return 0
  const sign = num < 0 ? -1 : 1
  return sign * shift(Math.round(shift(Math.abs(num), 4)), -4)
}

export default round4
