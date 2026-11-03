// 按合同编号查找订单明细的通用工具
//
// 注意：同一合同编号可能对应多张订单（分批采购/销售会生成多张订单），
// contract_number 不是唯一索引，不能用 findOne/LIMIT 1 只取一张，
// 否则会拿到不含该商品的订单，误报"商品不在订单中"或把数量同步到错误的订单上。

// 采购订单/销售订单的字段映射（明细数量字段分别为入库/出库数量）
export const PURCHASE_ORDER_KEYS = {
  idField: 'purchase_order_id',
  itemsField: 'purchase_items',
  qtyField: 'inbound_quantity'
}

export const SALES_ORDER_KEYS = {
  idField: 'sales_order_id',
  itemsField: 'sales_items',
  qtyField: 'outbound_quantity'
}

// 解析订单明细
export const parseOrderItems = (row, keys) => {
  try {
    return JSON.parse(row[keys.itemsField] || '[]')
  } catch {
    return []
  }
}

// 按合同编号加载全部订单及其明细（forUpdate 行锁：调用方均在事务内做读-改-写，防止并发丢失更新）
export const loadContractOrders = async (Model, contractNumber, keys, conn) => {
  const orders = await Model.findAll({
    where: 'contract_number = ?',
    params: [contractNumber],
    forUpdate: true
  }, conn)
  const itemsMap = new Map()
  for (const order of orders) {
    itemsMap.set(order[keys.idField], parseOrderItems(order, keys))
  }
  return { orders, itemsMap }
}

// 在该合同下的多张订单中查找包含指定商品的明细行
// 优先匹配剩余可入/出库数量大于 0 的订单/行，避免把数量同步到已完成的行上；
// 若前端明确指定了订单（preferOrderId），优先使用该订单中仍有剩余量的行，
// 该订单同商品行已满时回落到其他订单（原来是命中即返回，会把量堆到已满的行上超量）
export const findItemByProduct = (orders, itemsMap, productCode, keys, preferOrderId) => {
  const remainingOf = (item) => (Number(item.quantity) || 0) - (Number(item[keys.qtyField]) || 0)
  // 同商品多行时按行顺序取第一个还有剩余量的行
  const pickRowWithCapacity = (items) =>
    items.filter((it) => it.product_code === productCode).find((it) => remainingOf(it) > 0) || null

  if (preferOrderId && itemsMap.has(preferOrderId)) {
    const items = itemsMap.get(preferOrderId) || []
    const item = pickRowWithCapacity(items)
    if (item) {
      return {
        order: orders.find((o) => o[keys.idField] === preferOrderId),
        items,
        targetItem: item
      }
    }
    // 指定订单的同商品行已出满，继续走下面的全合同查找
  }

  let fallback = null
  for (const order of orders) {
    const items = itemsMap.get(order[keys.idField]) || []
    const candidates = items.filter((it) => it.product_code === productCode)
    if (candidates.length === 0) continue
    const item = candidates.find((it) => remainingOf(it) > 0)
    const match = { order, items, targetItem: item || candidates[0] }
    if (item) return match
    if (!fallback) fallback = match
  }
  return fallback
}

// 删除/退货回退数量时，优先回退到已入/出库数量大于 0 的订单（即真正收/发过货的订单），
// 否则会扣到从未入/出库的订单上，把它的状态误改成已完成；
// preferOrderId 为创建单据时定位到的具体订单，优先回退到同一张订单，避免加到 A 单却从 B 单回退
export const findItemForRollback = (orders, itemsMap, productCode, keys, preferOrderId) => {
  // 同商品多行时按行顺序取第一个实际发/收过货的行
  const pickRowWithShipped = (items) =>
    items.filter((it) => it.product_code === productCode).find((it) => (Number(it[keys.qtyField]) || 0) > 0) || null

  if (preferOrderId && itemsMap.has(preferOrderId)) {
    const items = itemsMap.get(preferOrderId) || []
    const item = pickRowWithShipped(items)
    if (item) {
      return {
        order: orders.find((o) => o[keys.idField] === preferOrderId),
        items,
        targetItem: item
      }
    }
    // 指定订单没发/收过货，走全合同查找真正发/收过货的订单
  }

  let fallback = null
  for (const order of orders) {
    const items = itemsMap.get(order[keys.idField]) || []
    const candidates = items.filter((it) => it.product_code === productCode)
    if (candidates.length === 0) continue
    const item = candidates.find((it) => (Number(it[keys.qtyField]) || 0) > 0)
    const match = { order, items, targetItem: item || candidates[0] }
    if (item) return match
    if (!fallback) fallback = match
  }
  return fallback
}

// 将明细整体转为差量：factor = 1 表示全部累加，-1 表示全部回退
export const itemsToDeltaMap = (items, factor = 1) => {
  const deltaMap = new Map()
  for (const item of items) {
    if (!item || !item.product_code) continue
    deltaMap.set(
      item.product_code,
      (deltaMap.get(item.product_code) || 0) + factor * (parseFloat(item.quantity) || 0)
    )
  }
  return deltaMap
}

// 计算编辑单据时的商品数量差量（new - old）
// sign = -1 可用于退货单：退货数量增加意味着订单上的入/出库数量减少
export const buildQuantityDeltaMap = (oldItems, newItems, sign = 1) => {
  const deltaMap = itemsToDeltaMap(newItems, sign)
  for (const [productCode, qty] of itemsToDeltaMap(oldItems, -sign)) {
    deltaMap.set(productCode, (deltaMap.get(productCode) || 0) + qty)
  }
  return deltaMap
}

// 按差量同步入/出库数量到合同下的订单（编辑单据时调用）
// deltaMap: productCode -> 正数累加、负数回退；正数优先加到剩余数量 > 0 的订单，
// 负数优先从入/出库数量 > 0 的订单回退，随后重算明细行和订单整体状态
export const syncQuantityDeltaToOrders = async (Model, keys, contractNumber, deltaMap, preferOrderId, conn) => {
  if (!contractNumber) return
  const { orders, itemsMap } = await loadContractOrders(Model, contractNumber, keys, conn)
  if (orders.length === 0) return

  const touchedOrders = new Map()
  for (const [productCode, delta] of deltaMap) {
    if (!productCode || !delta) continue
    const match = delta > 0
      ? findItemByProduct(orders, itemsMap, productCode, keys, preferOrderId)
      : findItemForRollback(orders, itemsMap, productCode, keys, preferOrderId)
    if (!match) continue

    const current = Number(match.targetItem[keys.qtyField]) || 0
    const quantity = Number(match.targetItem.quantity) || 0
    // 双向封顶：下限 0、上限订单数量（已超发的历史数据保留存量但不继续扩大），
    // 被截断的差量记日志，不再静默吞掉
    const raw = current + delta
    const next = Math.min(Math.max(0, raw), Math.max(quantity, current))
    if (Math.abs(next - raw) > 1e-6) {
      console.warn(`订单 ${match.order[keys.idField]} 商品 ${productCode} 入/出库差量被截断：目标 ${raw}，实际 ${next}`)
    }
    match.targetItem[keys.qtyField] = next

    // 更新行状态（浮点容差比较）
    if (Math.abs(next) < 1e-6) {
      match.targetItem.status = 1 // 未入/出库
    } else if (next >= quantity - 1e-6) {
      match.targetItem.status = 2 // 已全部入/出库
    } else {
      match.targetItem.status = 3 // 已部分入/出库
    }

    touchedOrders.set(match.order[keys.idField], match)
  }

  // 重算订单整体状态并更新
  for (const match of touchedOrders.values()) {
    const statuses = match.items.map((item) => item.status || 1)
    let orderStatus = 1
    if (statuses.every((s) => s === 2)) {
      orderStatus = 2
    } else if (statuses.some((s) => s === 2 || s === 3)) {
      orderStatus = 3
    }

    await Model.update(match.order[keys.idField], {
      [keys.itemsField]: JSON.stringify(match.items),
      status: orderStatus
    }, conn)
  }
}
