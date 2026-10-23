// 单据与计划明细之间的数量同步工具
//
// 计划生成单据时按行顺序从 plan_items[].quantity（剩余待办数量）扣减；
// 扣减记录写入单据的 plan_deductions 字段（[{plan_id, item_index, product_code, quantity}]），
// 删除单据时按记录原路回补；单行封顶原始数量（purchase_quantity / sales_quantity），
// 保证异常重试不会重复回补。
// 历史单据没有 plan_deductions 字段，回补时退化为按合同编号猜行的旧逻辑。

// 入库/出库/采购计划的字段映射
export const INBOUND_PLAN_KEYS = {
  idField: 'inbound_plan_id',
  itemsField: 'plan_items',
  capField: 'purchase_quantity',
  rowStatusField: 'inbound_status',
  rowDone: 'completed',
  planDone: 'completed'
}

export const OUTBOUND_PLAN_KEYS = {
  idField: 'outbound_plan_id',
  itemsField: 'plan_items',
  capField: 'sales_quantity',
  rowStatusField: 'outbound_status',
  rowDone: 'completed',
  planDone: 'completed'
}

export const PURCHASE_PLAN_KEYS = {
  idField: 'purchase_plan_id',
  itemsField: 'plan_items',
  capField: 'sales_quantity',
  rowStatusField: 'purchase_status',
  rowDone: 'purchased',
  planDone: 'purchased'
}

// 由行数量推导行状态：剩余 <= 0 已完成；回补到原始数量 待处理；其余 部分
const deriveRowStatus = (row, keys) => {
  const quantity = Number(row.quantity) || 0
  const cap = Number(row[keys.capField]) || 0
  if (quantity <= 0) return keys.rowDone
  if (cap > 0 && quantity >= cap) return 'pending'
  return 'partial'
}

// 由明细行推导计划整体状态
const derivePlanStatus = (items, keys) => {
  if (items.every((row) => (Number(row.quantity) || 0) <= 0)) return keys.planDone
  if (items.every((row) => {
    const cap = Number(row[keys.capField]) || 0
    return cap > 0 && (Number(row.quantity) || 0) >= cap
  })) return 'pending'
  return 'partial'
}

// 解析计划明细
const parsePlanItems = (plan, keys) => {
  try {
    return JSON.parse(plan[keys.itemsField] || '[]')
  } catch {
    return []
  }
}

// 按商品代码汇总单据明细数量
const sumItemsByProduct = (documentItems) => {
  const pendingMap = new Map()
  for (const item of documentItems) {
    if (!item || !item.product_code) continue
    const qty = Number(item.quantity) || 0
    if (qty <= 0) continue
    pendingMap.set(item.product_code, (pendingMap.get(item.product_code) || 0) + qty)
  }
  return pendingMap
}

/**
 * 生成单据时按来源计划行扣减待办数量（同一商品按行顺序分配单据数量）
 * @param {Array} planRows - 生成来源行 [{plan_id, item_index, product_code, quantity}]
 * @param {Array} documentItems - 单据实际商品明细
 * @returns {Array} 扣减记录 [{plan_id, item_index, product_code, quantity}]，写入单据 plan_deductions
 */
export const applyPlanDeductions = async (Model, keys, planRows, documentItems, conn) => {
  const record = []
  if (!Array.isArray(planRows) || planRows.length === 0) return record

  const pendingMap = sumItemsByProduct(documentItems)
  if (pendingMap.size === 0) return record

  // 批量加载涉及的计划
  const planIds = [...new Set(planRows.map((row) => row && row.plan_id).filter(Boolean))]
  const planMap = new Map()
  for (const planId of planIds) {
    const plan = await Model.findById(planId, conn)
    if (!plan) continue
    planMap.set(planId, { plan, items: parsePlanItems(plan, keys), dirty: false })
  }

  for (const row of planRows) {
    if (!row || !row.plan_id) continue
    const code = row.product_code || ''
    const left = pendingMap.get(code) || 0
    if (left <= 0) continue

    const entry = planMap.get(row.plan_id)
    if (!entry) continue

    const line = entry.items[Number(row.item_index)]
    if (!line || line.product_code !== code) continue

    const available = Number(line.quantity) || 0
    const deduct = Math.min(available, left)
    if (deduct <= 0) continue

    line.quantity = available - deduct
    line[keys.rowStatusField] = deriveRowStatus(line, keys)
    pendingMap.set(code, left - deduct)
    entry.dirty = true

    record.push({
      plan_id: row.plan_id,
      item_index: Number(row.item_index),
      product_code: code,
      quantity: deduct
    })
  }

  for (const entry of planMap.values()) {
    if (!entry.dirty) continue
    await Model.update(entry.plan[keys.idField], {
      status: derivePlanStatus(entry.items, keys),
      [keys.itemsField]: entry.items
    }, conn)
  }

  return record
}

/**
 * 删除单据时按 plan_deductions 记录原路回补待办数量
 * @param {Array|String|null} deductions - 单据上的扣减记录
 * @returns {{restoredPlans: number, restoredQty: number, unmatchedQty: number}}
 */
export const restorePlanDeductions = async (Model, keys, deductions, conn) => {
  const result = { restoredPlans: 0, restoredQty: 0, unmatchedQty: 0 }
  let list = deductions
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      list = null
    }
  }
  if (!Array.isArray(list) || list.length === 0) return result

  // 按计划分组，保持行顺序回补
  const byPlan = new Map()
  for (const item of list) {
    if (!item || !item.plan_id) continue
    if (!byPlan.has(item.plan_id)) byPlan.set(item.plan_id, [])
    byPlan.get(item.plan_id).push(item)
  }

  for (const [planId, entries] of byPlan) {
    const plan = await Model.findById(planId, conn)
    if (!plan) {
      // 计划已被删除（例如销售订单更新时重新生成），数量无法回补
      for (const entry of entries) result.unmatchedQty += Number(entry.quantity) || 0
      continue
    }

    const items = parsePlanItems(plan, keys)
    let planDirty = false
    for (const entry of entries) {
      const row = items[Number(entry.item_index)]
      const qty = Number(entry.quantity) || 0
      if (!row || row.product_code !== (entry.product_code || row.product_code)) {
        result.unmatchedQty += qty
        continue
      }

      // 单行封顶原始数量，保证异常重试不会重复回补
      const cap = Number(row[keys.capField]) || 0
      const current = Number(row.quantity) || 0
      const room = cap > 0 ? Math.max(0, cap - current) : Infinity
      const add = Math.min(qty, room)
      if (add < qty) result.unmatchedQty += qty - add
      if (add <= 0) continue

      row.quantity = current + add
      row[keys.rowStatusField] = deriveRowStatus(row, keys)
      result.restoredQty += add
      planDirty = true
    }

    if (!planDirty) continue

    await Model.update(planId, {
      status: derivePlanStatus(items, keys),
      [keys.itemsField]: items
    }, conn)
    result.restoredPlans += 1
  }

  return result
}

/**
 * 历史单据兜底：没有 plan_deductions 记录时，按合同编号把数量回补到计划明细。
 * 同一合同可能对应多张计划、同商品可能多行：按计划创建顺序 + 行顺序补到未满的行
 */
export const restoreQuantitiesToPlans = async (Model, keys, contractNumber, documentItems, conn) => {
  const result = { restoredPlans: 0, restoredQty: 0, unmatchedQty: 0 }
  if (!contractNumber || !Array.isArray(documentItems) || documentItems.length === 0) {
    return result
  }

  const pendingMap = sumItemsByProduct(documentItems)
  if (pendingMap.size === 0) return result

  const plans = await Model.findByContractNumber(contractNumber, conn)

  for (const plan of plans) {
    // 已取消的计划不回补
    if (plan.status === 'cancelled') continue

    const items = parsePlanItems(plan, keys)
    let planDirty = false
    for (const row of items) {
      if (!row || !row.product_code) continue
      const remaining = pendingMap.get(row.product_code)
      if (!remaining || remaining <= 0) continue

      // 未满的行才有回补空间；原始数量缺失的历史数据不封顶
      const cap = Number(row[keys.capField]) || 0
      const current = Number(row.quantity) || 0
      const room = cap > 0 ? Math.max(0, cap - current) : Infinity
      const add = Math.min(remaining, room)
      if (add <= 0) continue

      row.quantity = current + add
      row[keys.rowStatusField] = deriveRowStatus(row, keys)
      pendingMap.set(row.product_code, remaining - add)
      result.restoredQty += add
      planDirty = true
    }

    if (!planDirty) continue

    const status = derivePlanStatus(items, keys)
    await Model.update(plan[keys.idField], {
      status,
      [keys.itemsField]: items
    }, conn)
    result.restoredPlans += 1
  }

  for (const remaining of pendingMap.values()) {
    if (remaining > 0) result.unmatchedQty += remaining
  }
  return result
}
