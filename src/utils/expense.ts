/**
 * 费用明细工具函数
 * 提供统一的费用解析、标签映射和显示功能
 */

// 费用键名到中文标签的映射
const EXPENSE_LABELS: Record<string, string> = {
  // 销售/采购费用
  transportationFee: '运输费',
  tariff: '关税',
  valueAddedTax: '增值税',
  handlingFee: '手续费',
  operatingExpenses: '运营费',
  // 入库/出库费用
  customsFee: '报关费',
  // 通用
  otherFee: '其他',
}

/**
 * 解析费用 JSON 字符串
 * @param expenses - 费用数据（JSON 字符串、对象或 null）
 * @returns 解析后的费用对象
 */
export function parseExpenses(expenses: string | object | null | undefined): Record<string, number> {
  if (!expenses) return {}
  if (typeof expenses === 'string') {
    try {
      return JSON.parse(expenses)
    } catch {
      return {}
    }
  }
  return expenses as Record<string, number>
}

/**
 * 获取费用项的中文标签
 * @param key - 费用键名（camelCase）
 * @returns 中文标签
 */
export function getExpenseLabel(key: string): string {
  return EXPENSE_LABELS[key] || key
}

/**
 * 获取有值的费用列表
 * @param expenses - 费用数据（JSON 字符串、对象或 null）
 * @returns 有值的费用数组，每项包含 key、label、value
 */
export function getValidExpenses(
  expenses: string | object | null | undefined
): Array<{ key: string; label: string; value: number }> {
  const parsed = parseExpenses(expenses)
  return Object.entries(parsed)
    .filter(([, value]) => value && value > 0)
    .map(([key, value]) => ({
      key,
      label: getExpenseLabel(key),
      value,
    }))
}
