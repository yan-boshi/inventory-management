// 金额工具：四舍五入保留 4 位小数、格式化显示、金额大写
// round4 与后端 server/utils/round.js 保持语义一致（half-away-from-zero），两处修改需同步

export type MoneyInput = number | string | null | undefined

// 指数移位法，避免 toFixed 的浮点误差（如 (1.005).toFixed(2) === '1.00'）
function shift(value: number, exp: number): number {
  const [mantissa, e = '0'] = String(value).split('e')
  return Number(`${mantissa}e${Number(e) + exp}`)
}

/**
 * 四舍五入保留 4 位小数（half-away-from-zero，负数对称）
 * round4(-1.00005) === -1.0001（Math.round 会得到 -1.0000）
 * NaN / null / undefined / 非有限数 → 0
 */
export function round4(value: MoneyInput): number {
  const num = typeof value === 'string' ? Number(value) : value
  if (num === null || num === undefined || !Number.isFinite(num)) return 0
  const sign = num < 0 ? -1 : 1
  return sign * shift(Math.round(shift(Math.abs(num), 4)), -4)
}

/**
 * 金额格式化：四舍五入后补零显示 4 位小数（12.3 → '12.3000'）
 * @param placeholder 无效值（null/undefined/''/NaN）返回的占位符，默认 '0.0000'
 */
export function formatMoney4(value: MoneyInput, placeholder = '0.0000'): string {
  if (value === null || value === undefined || value === '') return placeholder
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return placeholder
  return round4(num).toFixed(4)
}

/** 同 formatMoney4，但带千分位（1234.5 → '1,234.5000'） */
export function formatMoney4Grouped(value: MoneyInput, placeholder = '0.0000'): string {
  if (value === null || value === undefined || value === '') return placeholder
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return placeholder
  return round4(num).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}

// ============ 金额大写（元角分厘毫，4 位小数） ============

const CN_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const CN_UNITS = ['', '拾', '佰', '仟']
const CN_SECTIONS = ['', '万', '亿', '万亿']
const CN_FRAC_UNITS = ['角', '分', '厘', '毫']

function integerToChinese(numStr: string): string {
  // 从右向左每 4 位分节
  const groups: string[] = []
  let s = numStr
  while (s.length > 0) {
    groups.unshift(s.slice(-4))
    s = s.slice(0, -4)
  }

  let result = ''
  let zeroPending = false
  let started = false

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    const sectionIndex = groups.length - 1 - i
    let groupHasNonZero = false

    for (let j = 0; j < group.length; j++) {
      const d = parseInt(group[j], 10)
      const unitIndex = group.length - 1 - j
      if (d === 0) {
        if (started) zeroPending = true
      } else {
        if (zeroPending) {
          result += '零'
          zeroPending = false
        }
        result += CN_DIGITS[d] + CN_UNITS[unitIndex]
        started = true
        groupHasNonZero = true
      }
    }

    if (groupHasNonZero) {
      result += CN_SECTIONS[sectionIndex] || ''
    }
  }
  return result
}

/**
 * 中文大写金额（支持 4 位小数：元角分厘毫）
 * 规则：小数只发非零位，跳过的零位在相邻非零位之间压成一个「零」，不发尾随零；
 *       小数末位（毫）非零时结尾为该位，否则以「整」收尾
 * amountToChinese(12.3) → 壹拾贰元叁角整
 * amountToChinese(12.3005) → 壹拾贰元叁角零伍毫
 * amountToChinese(12.3456) → 壹拾贰元叁角肆分伍厘陆毫
 * amountToChinese(10.05) → 壹拾元零伍分整
 * amountToChinese(1001) → 壹仟零壹元整
 */
export function amountToChinese(value: MoneyInput): string {
  const n = round4(value)
  if (n === 0) return '零元整'
  const sign = n < 0 ? '负' : ''
  const abs = Math.abs(n)
  const [intPart, fracPart] = abs.toFixed(4).split('.')

  let str = sign
  if (intPart === '0') {
    // 纯小数不写「零元」
  } else {
    str += integerToChinese(intPart) + '元'
  }

  if (fracPart === '0000') {
    return str + '整'
  }

  let zeroPending = false
  let emitted = false
  for (let i = 0; i < fracPart.length; i++) {
    const d = parseInt(fracPart[i], 10)
    if (d === 0) {
      zeroPending = true
    } else {
      if (zeroPending) {
        // 整数部分已有内容、或前面已发过小数位时，跳过的零压成一个「零」
        if (str !== '' && (emitted || intPart !== '0')) str += '零'
        zeroPending = false
      }
      str += CN_DIGITS[d] + CN_FRAC_UNITS[i]
      emitted = true
    }
  }

  // 末位（毫）为 0 时以「整」收尾
  return str + (fracPart[3] === '0' ? '整' : '')
}

// ============ 英文金额 ============

const EN_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
const EN_TEENS = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function enHundreds(n: number): string {
  let result = ''
  if (n >= 100) {
    result += EN_ONES[Math.floor(n / 100)] + ' Hundred '
    n %= 100
  }
  if (n >= 10 && n < 20) {
    result += EN_TEENS[n - 10]
  } else {
    if (n >= 20) {
      result += EN_TENS[Math.floor(n / 10)] + ' '
      n %= 10
    }
    if (n > 0) {
      result += EN_ONES[n]
    }
  }
  return result.trim()
}

function enInteger(num: number): string {
  if (num === 0) return 'Zero'
  let result = ''
  if (num >= 1000000) {
    result += enHundreds(Math.floor(num / 1000000)) + ' Million '
  }
  if (num >= 1000) {
    result += enHundreds(Math.floor((num % 1000000) / 1000)) + ' Thousand '
  }
  if (num % 1000 > 0 || num === 0) {
    result += enHundreds(num % 1000)
  }
  return result.trim()
}

/**
 * 英文金额（4 位小数逐位读）
 * amountToEnglish(12.3456) → 'Twelve Point Three Four Five Six'
 */
export function amountToEnglish(value: MoneyInput): string {
  const n = round4(value)
  if (n === 0) return 'Zero'
  const sign = n < 0 ? 'Negative ' : ''
  const abs = Math.abs(n)
  const [intPart, fracPart] = abs.toFixed(4).split('.')

  let result = sign + enInteger(parseInt(intPart, 10))
  if (fracPart !== '0000') {
    const digitWords = fracPart
      .split('')
      .map((d) => EN_ONES[parseInt(d, 10)])
      .join(' ')
    result += ' Point ' + digitWords
  }
  return result
}
