// 删除单据时把商品数量回补到计划单明细的通用工具
//
// 计划生成单据时前端按行顺序从行首扣减 plan_items[].quantity（剩余待办数量），
// 回补是其逆操作：按计划创建顺序 + 行顺序，把数量补到未满的行；
// 单行封顶原始数量（purchase_quantity / sales_quantity），保证删除重试不会重复回补。

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

// 按合同编号把单据商品数量回补到计划明细（删除单据时调用）
// 同一合同可能对应多张计划、同商品可能多行：按计划创建顺序 + 行顺序补到未满的行
// 返回 { restoredPlans, restoredQty, unmatchedQty }，unmatchedQty 为未匹配到计划明细的数量
export const restoreQuantitiesToPlans = async (Model, keys, contractNumber, documentItems) => {
  const result = { restoredPlans: 0, restoredQty: 0, unmatchedQty: 0 }
  if (!contractNumber || !Array.isArray(documentItems) || documentItems.length === 0) {
    return result
  }

  // 单据明细按商品编码汇总待回补数量
  const pendingMap = new Map()
  for (const item of documentItems) {
    if (!item || !item.product_code) continue
    const qty = Number(item.quantity) || 0
    if (qty <= 0) continue
    pendingMap.set(item.product_code, (pendingMap.get(item.product_code) || 0) + qty)
  }
  if (pendingMap.size === 0) return result

  const plans = await Model.findByContractNumber(contractNumber)

  for (const plan of plans) {
    // 已取消的计划不回补
    if (plan.status === 'cancelled') continue

    let items
    try {
      items = JSON.parse(plan[keys.itemsField] || '[]')
    } catch {
      continue
    }

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
    })
    result.restoredPlans += 1
  }

  for (const remaining of pendingMap.values()) {
    if (remaining > 0) result.unmatchedQty += remaining
  }
  return result
}
