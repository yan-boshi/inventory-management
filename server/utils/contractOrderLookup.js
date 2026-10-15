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

// 按合同编号加载全部订单及其明细
export const loadContractOrders = async (Model, contractNumber, keys) => {
  const orders = await Model.findAll({
    where: 'contract_number = ?',
    params: [contractNumber]
  })
  const itemsMap = new Map()
  for (const order of orders) {
    itemsMap.set(order[keys.idField], parseOrderItems(order, keys))
  }
  return { orders, itemsMap }
}

// 在该合同下的多张订单中查找包含指定商品的明细行
// 优先匹配剩余可入/出库数量大于 0 的订单，避免把数量同步到已完成的订单上；
// 若前端明确指定了订单（preferOrderId），则优先使用该订单
export const findItemByProduct = (orders, itemsMap, productCode, keys, preferOrderId) => {
  if (preferOrderId && itemsMap.has(preferOrderId)) {
    const items = itemsMap.get(preferOrderId) || []
    const item = items.find((it) => it.product_code === productCode)
    if (item) {
      return {
        order: orders.find((o) => o[keys.idField] === preferOrderId),
        items,
        targetItem: item
      }
    }
  }

  let fallback = null
  for (const order of orders) {
    const items = itemsMap.get(order[keys.idField]) || []
    const item = items.find((it) => it.product_code === productCode)
    if (!item) continue
    const match = { order, items, targetItem: item }
    const remaining = (Number(item.quantity) || 0) - (Number(item[keys.qtyField]) || 0)
    if (remaining > 0) return match
    if (!fallback) fallback = match
  }
  return fallback
}

// 删除/退货回退数量时，优先回退到已入/出库数量大于 0 的订单（即真正收/发过货的订单），
// 否则会扣到从未入/出库的订单上，把它的状态误改成已完成
export const findItemForRollback = (orders, itemsMap, productCode, keys) => {
  let fallback = null
  for (const order of orders) {
    const items = itemsMap.get(order[keys.idField]) || []
    const item = items.find((it) => it.product_code === productCode)
    if (!item) continue
    const match = { order, items, targetItem: item }
    if ((Number(item[keys.qtyField]) || 0) > 0) return match
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
export const syncQuantityDeltaToOrders = async (Model, keys, contractNumber, deltaMap, preferOrderId) => {
  if (!contractNumber) return
  const { orders, itemsMap } = await loadContractOrders(Model, contractNumber, keys)
  if (orders.length === 0) return

  const touchedOrders = new Map()
  for (const [productCode, delta] of deltaMap) {
    if (!productCode || !delta) continue
    const match = delta > 0
      ? findItemByProduct(orders, itemsMap, productCode, keys, preferOrderId)
      : findItemForRollback(orders, itemsMap, productCode, keys)
    if (!match) continue

    const current = Number(match.targetItem[keys.qtyField]) || 0
    const next = Math.max(0, current + delta)
    match.targetItem[keys.qtyField] = next

    // 更新行状态
    const quantity = Number(match.targetItem.quantity) || 0
    if (next === 0) {
      match.targetItem.status = 1 // 未入/出库
    } else if (next >= quantity) {
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
    })
  }
}
