// 金额/单价非负校验（S-M8）
// 数量已有 > 0 校验，金额类字段此前无校验，负数金额可被用来操纵财务统计。
// 只校验传入的字段：undefined / null / 空字符串视为缺省，不拦截。

// 字段中文名（报错文案用）
const FIELD_LABELS = {
  tax_included_price: '含税单价',
  tax_excluded_price: '未税单价',
  tax_included_amount: '含税金额',
  tax_excluded_amount: '未税金额',
  tax_amount: '税额',
  total_price: '总价',
  total_amount: '总金额',
  handling_fee: '手续费',
  amount: '金额',
  amount_with_tax: '含税金额'
}

/**
 * 单值判断：缺省（undefined/null/空串）视为合法；
 * 其余必须是有限数字且 >= 0（NaN、Infinity、非数字字符串一律拒绝）
 */
export function isNonNegativeAmount(value) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  const num = Number(value)
  return Number.isFinite(num) && num >= 0
}

/**
 * 明细批量校验：items 为明细数组，fields 为要校验的金额字段名。
 * 返回中文错误文案，全部合法（或缺省）返回 null
 */
export function validateNonNegativeAmounts(items, fields) {
  for (const item of items || []) {
    for (const field of fields) {
      if (!isNonNegativeAmount(item?.[field])) {
        const label = FIELD_LABELS[field] || field
        return `商品 ${item.product_name || item.product_code || '未知'} 的${label}必须为非负数字`
      }
    }
  }
  return null
}

/**
 * 单据级字段校验：obj 为单据（或请求体），fields 为要校验的金额字段名。
 * 返回中文错误文案，全部合法（或缺省）返回 null
 */
export function validateNonNegativeFields(obj, fields) {
  for (const field of fields) {
    if (!isNonNegativeAmount(obj?.[field])) {
      const label = FIELD_LABELS[field] || field
      return `${label}必须为非负数字`
    }
  }
  return null
}
