// 三本账数据修复（全链路·两遍归因版）
//
// 采购链：入库/退货流水 → 采购单.inbound_quantity → 入库计划(purchase_quantity/quantity)
// 销售链：出库/退货流水 → 销售单.outbound_quantity → 出库计划(sales_quantity/quantity)
// 采购计划：sales_quantity 对齐销售单；待采购 = 销售数量 - 采购单对该计划的已扣减量
//
// 流水归因（每条明细归到具体订单）：
//   1. 行直连（purchase_order_id / sales_order_id / 退货经来源单据回溯）
//   2. plan_deductions → 计划 → 订单
//   3. 精确数量匹配（合同内 商品+数量 唯一命中）
//   4. 剩余归因（合同该商品只剩一张有余量的订单）
//   5. 仍含糊 → 不动、列入报告
// 悬空计划（关联订单已删）按 合同+商品+数量 唯一匹配重挂。
//
// 用法：node db-fix-plan-reconcile.mjs          （dry-run，只打印）
//       node db-fix-plan-reconcile.mjs --apply  （事务内落库）
import pool from './server/config/database.js'

const APPLY = process.argv.includes('--apply')
const toArr = v => {
  try {
    const a = typeof v === 'string' ? JSON.parse(v) : v
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}
const r4 = x => Math.round((+x || 0) * 10000) / 10000
const num = v => parseFloat(v) || 0

const conn = await pool.getConnection()
try {
  const [purchaseOrders] = await conn.query('SELECT purchase_order_id, order_number, contract_number, purchase_items, plan_deductions FROM purchase_orders')
  const [inboundPlans] = await conn.query('SELECT inbound_plan_id, purchase_order_id, plan_number, contract_number, plan_items FROM inbound_plans')
  const [whs] = await conn.query('SELECT warehousing_order_id, order_number, purchase_order_id, contract_number, warehousing_items, plan_deductions FROM warehousing_orders')
  const [irs] = await conn.query('SELECT inbound_return_id, order_number, source_order_id, contract_number, return_items FROM inbound_return_orders')
  const [salesOrders] = await conn.query('SELECT sales_order_id, order_number, contract_number, sales_items FROM sales_orders')
  const [outboundPlans] = await conn.query('SELECT outbound_plan_id, sales_order_id, plan_number, contract_number, plan_items FROM outbound_plans')
  const [dls] = await conn.query('SELECT delivery_order_id, order_number, sales_order_id, contract_number, delivery_items, plan_deductions FROM delivery_orders')
  const [ors] = await conn.query('SELECT outbound_return_id, order_number, source_order_id, contract_number, return_items FROM outbound_return_orders')
  const [purchasePlans] = await conn.query('SELECT purchase_plan_id, sales_order_id, plan_number, contract_number, plan_items FROM purchase_plans')

  const poById = new Map(purchaseOrders.map(p => [p.purchase_order_id, p]))
  const soById = new Map(salesOrders.map(s => [s.sales_order_id, s]))
  const inboundPlanPo = new Map(inboundPlans.map(pl => [pl.inbound_plan_id, pl.purchase_order_id]))
  const outboundPlanSo = new Map(outboundPlans.map(pl => [pl.outbound_plan_id, pl.sales_order_id]))
  const whPoById = new Map(whs.map(w => [w.warehousing_order_id, w.purchase_order_id]))
  const dlSoById = new Map(dls.map(d => [d.delivery_order_id, d.sales_order_id]))

  // ===== 归因引擎 =====
  // moves: [{ kind, rowNo, contract, code, qty, orderId }]
  const runAttribution = (moves, orders, qtyField, itemsField, planToOrder) => {
    // 合同+商品 → 订单候选
    const byContractProduct = new Map()
    const orderQty = new Map() // orderId -> Map(code -> 数量)
    for (const o of orders) {
      const m = new Map()
      for (const it of toArr(o[itemsField])) {
        if (!it.product_code) continue
        m.set(it.product_code, (m.get(it.product_code) || 0) + num(it.quantity))
        const key = `${o.contract_number || ''}|${it.product_code}`
        if (!byContractProduct.has(key)) byContractProduct.set(key, [])
        byContractProduct.get(key).push(o)
      }
      orderQty.set(o[qtyField], m)
    }
    const attributed = new Map()
    const add = (id, code, qty) => {
      if (!attributed.has(id)) attributed.set(id, new Map())
      const m = attributed.get(id)
      m.set(code, (m.get(code) || 0) + qty)
    }
    const taken = new Map()
    const take = (id, code, qty) => {
      if (!taken.has(id)) taken.set(id, new Map())
      const m = taken.get(id)
      m.set(code, (m.get(code) || 0) + qty)
    }
    const takenQty = (id, code) => (taken.get(id) || new Map()).get(code) || 0

    for (const mv of moves) {
      if (!mv.orderId && mv.deduced && mv.deduced.size === 1) mv.orderId = [...mv.deduced][0]
    }
    const unresolved = []
    for (const mv of moves) {
      if (mv.orderId) { add(mv.orderId, mv.code, mv.qty); take(mv.orderId, mv.code, Math.abs(mv.qty)); continue }
      const cands = (byContractProduct.get(`${mv.contract}|${mv.code}`) || []).filter(o => {
        const cap = orderQty.get(o[qtyField])?.get(mv.code) || 0
        return Math.abs(cap - Math.abs(mv.qty)) < 1e-6 && takenQty(o[qtyField], mv.code) < 1e-6
      })
      if (cands.length === 1) {
        mv.orderId = cands[0][qtyField]
        add(mv.orderId, mv.code, mv.qty)
        take(mv.orderId, mv.code, Math.abs(mv.qty))
      } else {
        unresolved.push(mv)
      }
    }
    const still = []
    for (const mv of unresolved) {
      const cands = (byContractProduct.get(`${mv.contract}|${mv.code}`) || []).filter(o => {
        const cap = orderQty.get(o[qtyField])?.get(mv.code) || 0
        return takenQty(o[qtyField], mv.code) < cap - 1e-6
      })
      if (cands.length === 1) {
        mv.orderId = cands[0][qtyField]
        add(mv.orderId, mv.code, mv.qty)
        take(mv.orderId, mv.code, Math.abs(mv.qty))
      } else {
        still.push(mv)
      }
    }
    return { attributed, orderQty, unresolved: still }
  }

  const collectMoves = (rows, itemField, sign, kind, linkFn, deduceMap) => {
    const moves = []
    for (const row of rows) {
      const orderId = linkFn(row)
      const deduced = new Set()
      for (const d of toArr(row.plan_deductions)) {
        const pid = d.plan_id || d.purchase_plan_id || d.outbound_plan_id
        const oid = deduceMap?.get(pid)
        if (oid) deduced.add(oid)
      }
      for (const it of toArr(row[itemField])) {
        const qty = sign * num(it.quantity)
        if (!it.product_code || Math.abs(qty) < 1e-9) continue
        moves.push({ kind, rowNo: row.order_number, contract: row.contract_number || '', code: it.product_code, qty, orderId: orderId || null, deduced })
      }
    }
    return moves
  }

  // ===== 采购链归因 =====
  const purMoves = [
    ...collectMoves(whs, 'warehousing_items', 1, '入库单', w => w.purchase_order_id || whPoById.get(w.warehousing_order_id) || null, inboundPlanPo),
    ...collectMoves(irs, 'return_items', -1, '入库退货单', r => r.source_order_id ? (whPoById.get(r.source_order_id) || null) : null, inboundPlanPo)
  ]
  const pur = runAttribution(purMoves, purchaseOrders, 'purchase_order_id', 'purchase_items', inboundPlanPo)

  // ===== 销售链归因 =====
  const salesMoves = [
    ...collectMoves(dls, 'delivery_items', 1, '出库单', d => d.sales_order_id || null, outboundPlanSo),
    ...collectMoves(ors, 'return_items', -1, '出库退货单', r => r.source_order_id ? (dlSoById.get(r.source_order_id) || null) : null, outboundPlanSo)
  ]
  const sales = runAttribution(salesMoves, salesOrders, 'sales_order_id', 'sales_items', outboundPlanSo)

  // ===== 生成变更 =====
  const changes = []
  const relinkPlan = (plan, orders, qtyField, itemsField, contractOf) => {
    // 悬空计划重挂：合同+商品+数量 唯一匹配
    const items0 = toArr(plan.plan_items)
    const first = items0[0]
    if (!first || !plan.contract_number) return null
    const wantQty = num(first.purchase_quantity ?? first.sales_quantity ?? first.quantity)
    const cands = orders.filter(o =>
      (o.contract_number || '') === plan.contract_number &&
      toArr(o[itemsField]).some(it => it.product_code === first.product_code && Math.abs(num(it.quantity) - wantQty) < 1e-6)
    )
    return cands.length === 1 ? cands[0] : null
  }

  const orderChanges = (orders, qtyField, itemsField, attributed, label, fieldName) => {
    for (const o of orders) {
      const items = toArr(o[itemsField])
      const per = attributed.get(o[qtyField]) || new Map()
      if (per.size === 0) continue
      const newItems = items.map((it, idx) => {
        const code = it.product_code
        const isFirst = items.findIndex(x => x.product_code === code) === idx
        const val = per.has(code) && isFirst ? r4(per.get(code)) : (num(it[fieldName]))
        return { ...it, [fieldName]: val }
      })
      const changed = newItems.some((it, i) => Math.abs(num(it[fieldName]) - num(items[i][fieldName])) > 1e-6)
      if (changed) {
        changes.push({
          type: label,
          id: o[qtyField],
          label: o.order_number,
          before: items.map(it => `${it.product_code}:${it[fieldName] ?? 0}`).join(', '),
          after: newItems.map(it => `${it.product_code}:${it[fieldName]}`).join(', '),
          payload: newItems
        })
      }
    }
  }

  const planChanges = (plans, orders, qtyField, itemsField, attributed, cfg) => {
    for (const pl of plans) {
      let order = orders.find(o => o[qtyField] === pl[cfg.planLinkField])
      let relinkId = null
      if (!order) {
        const r = relinkPlan(pl, orders, qtyField, itemsField)
        if (r) { order = r; relinkId = r[qtyField] }
      }
      const items = toArr(pl.plan_items)
      const orderItems = order ? toArr(order[itemsField]) : []
      const per = attributed.get(order?.[qtyField]) || new Map()
      const qtyByProduct = new Map()
      for (const it of orderItems) {
        if (!it.product_code) continue
        qtyByProduct.set(it.product_code, (qtyByProduct.get(it.product_code) || 0) + num(it.quantity))
      }
      const receivedByProduct = new Map()
      for (const it of orderItems) {
        if (!it.product_code) continue
        const val = per.has(it.product_code) ? per.get(it.product_code) : num(it[cfg.doneField])
        receivedByProduct.set(it.product_code, (receivedByProduct.get(it.product_code) || 0) + val)
      }
      const newItems = items.map((it, idx) => {
        const code = it.product_code
        const isFirst = items.findIndex(x => x.product_code === code) === idx
        const total = order && isFirst
          ? (qtyByProduct.get(code) ?? num(it[cfg.capField] ?? it.quantity))
          : num(it[cfg.capField] ?? it.quantity)
        let remaining
        if (!order) {
          remaining = num(it.quantity)
        } else if (isFirst) {
          remaining = Math.min(total, Math.max(0, total - (receivedByProduct.get(code) || 0)))
        } else {
          remaining = 0
        }
        const status = remaining <= 0 ? cfg.done : (remaining < total ? 'partial' : 'pending')
        return { ...it, [cfg.capField]: total, quantity: r4(remaining), [cfg.statusField]: status }
      })
      const planStatus = newItems.every(i => i[cfg.statusField] === cfg.done)
        ? cfg.done
        : newItems.every(i => i[cfg.statusField] === 'pending') ? 'pending' : 'partial'
      const changed = newItems.some((it, i) =>
        Math.abs(num(it.quantity) - num(items[i].quantity)) > 1e-6 ||
        Math.abs(num(it[cfg.capField]) - num(items[i][cfg.capField] ?? items[i].quantity)) > 1e-6
      )
      if (changed || relinkId) {
        changes.push({
          type: cfg.label,
          id: pl[cfg.idField],
          label: `${pl.plan_number}${relinkId ? `（重挂 → ${order.order_number}）` : ''}`,
          before: items.map(it => `${it.product_code}:${it.quantity}`).join(', '),
          after: newItems.map(it => `${it.product_code}:${it.quantity}`).join(', '),
          payload: { items: newItems, status: planStatus, linkId: relinkId }
        })
      }
    }
  }

  orderChanges(purchaseOrders, 'purchase_order_id', 'purchase_items', pur.attributed, 'purchase_order', 'inbound_quantity')
  planChanges(inboundPlans, purchaseOrders, 'purchase_order_id', 'purchase_items', pur.attributed, {
    idField: 'inbound_plan_id', planLinkField: 'purchase_order_id', capField: 'purchase_quantity',
    doneField: 'inbound_quantity', statusField: 'inbound_status', done: 'completed', label: 'inbound_plan'
  })
  orderChanges(salesOrders, 'sales_order_id', 'sales_items', sales.attributed, 'sales_order', 'outbound_quantity')
  planChanges(outboundPlans, salesOrders, 'sales_order_id', 'sales_items', sales.attributed, {
    idField: 'outbound_plan_id', planLinkField: 'sales_order_id', capField: 'sales_quantity',
    doneField: 'outbound_quantity', statusField: 'outbound_status', done: 'completed', label: 'outbound_plan'
  })

  // ===== 采购计划：A 对齐销售单 + B 按采购单扣减记录重算待采购 =====
  const dedByPlanProduct = new Map() // plan_id -> Map(product -> 已扣减合计)
  for (const po of purchaseOrders) {
    for (const d of toArr(po.plan_deductions)) {
      const pid = d.plan_id || d.purchase_plan_id
      if (!pid) continue
      const key = `${pid}|${d.product_code || ''}`
      dedByPlanProduct.set(key, (dedByPlanProduct.get(key) || 0) + num(d.quantity))
    }
  }
  for (const pl of purchasePlans) {
    let so = soById.get(pl.sales_order_id)
    let relinkId = null
    if (!so) {
      const r = relinkPlan(pl, salesOrders, 'sales_order_id', 'sales_items')
      if (r) { so = r; relinkId = r.sales_order_id }
    }
    const items = toArr(pl.plan_items)
    const soItems = so ? toArr(so.sales_items) : []
    const qtyByProduct = new Map()
    for (const it of soItems) {
      if (!it.product_code) continue
      qtyByProduct.set(it.product_code, (qtyByProduct.get(it.product_code) || 0) + num(it.quantity))
    }
    const newItems = items.map((it, idx) => {
      const code = it.product_code
      const isFirst = items.findIndex(x => x.product_code === code) === idx
      const total = so && isFirst
        ? (qtyByProduct.get(code) ?? num(it.sales_quantity ?? it.quantity))
        : num(it.sales_quantity ?? it.quantity)
      let remaining
      if (!so) {
        remaining = num(it.quantity)
      } else if (isFirst) {
        const deducted = num(dedByPlanProduct.get(`${pl.purchase_plan_id}|${code}`))
        remaining = Math.min(total, Math.max(0, total - deducted))
      } else {
        remaining = 0
      }
      const status = remaining <= 0 ? 'purchased' : (remaining < total ? 'partial' : 'pending')
      return { ...it, sales_quantity: total, quantity: r4(remaining), purchase_status: status }
    })
    const planStatus = newItems.every(i => i.purchase_status === 'purchased')
      ? 'purchased'
      : newItems.every(i => i.purchase_status === 'pending') ? 'pending' : 'partial'
    const changed = newItems.some((it, i) =>
      Math.abs(num(it.quantity) - num(items[i].quantity)) > 1e-6 ||
      Math.abs(num(it.sales_quantity) - num(items[i].sales_quantity ?? items[i].quantity)) > 1e-6
    )
    if (changed || relinkId) {
      changes.push({
        type: 'purchase_plan',
        id: pl.purchase_plan_id,
        label: `${pl.plan_number}${relinkId ? `（重挂 → ${so.order_number}）` : ''}`,
        before: items.map(it => `${it.product_code}:${it.quantity}`).join(', '),
        after: newItems.map(it => `${it.product_code}:${it.quantity}`).join(', '),
        payload: { items: newItems, status: planStatus, linkId: relinkId }
      })
    }
  }

  // ===== 输出 =====
  const totalMoves = purMoves.length + salesMoves.length
  const totalUnresolved = pur.unresolved.length + sales.unresolved.length
  console.log(`归因统计：明细 ${totalMoves} 条，成功 ${totalMoves - totalUnresolved} 条，仍含糊 ${totalUnresolved} 条`)
  for (const mv of [...pur.unresolved, ...sales.unresolved]) {
    console.log(`  ⚠ ${mv.kind} ${mv.rowNo} ${mv.code}×${mv.qty}（无法归因，未动）`)
  }
  console.log(`\n待修复记录：${changes.length} 条`)
  for (const c of changes) {
    console.log(`  [${c.type}] ${c.label}`)
    console.log(`    修复前: ${c.before}`)
    console.log(`    修复后: ${c.after}`)
  }

  if (!APPLY) {
    console.log('\n（dry-run，未写库。确认无误后加 --apply 执行）')
  } else if (changes.length === 0) {
    console.log('\n无需变更')
  } else {
    await conn.beginTransaction()
    try {
      for (const c of changes) {
        switch (c.type) {
          case 'purchase_order':
            await conn.query('UPDATE purchase_orders SET purchase_items = ? WHERE purchase_order_id = ?', [JSON.stringify(c.payload), c.id])
            break
          case 'sales_order':
            await conn.query('UPDATE sales_orders SET sales_items = ? WHERE sales_order_id = ?', [JSON.stringify(c.payload), c.id])
            break
          case 'inbound_plan':
          case 'outbound_plan':
          case 'purchase_plan': {
            const table = c.type === 'inbound_plan' ? 'inbound_plans' : c.type === 'outbound_plan' ? 'outbound_plans' : 'purchase_plans'
            const linkCol = c.type === 'inbound_plan' ? 'purchase_order_id' : 'sales_order_id'
            const idCol = c.type === 'inbound_plan' ? 'inbound_plan_id' : c.type === 'outbound_plan' ? 'outbound_plan_id' : 'purchase_plan_id'
            if (c.payload.linkId) {
              await conn.query(
                `UPDATE ${table} SET plan_items = ?, status = ?, ${linkCol} = ? WHERE ${idCol} = ?`,
                [JSON.stringify(c.payload.items), c.payload.status, c.payload.linkId, c.id]
              )
            } else {
              await conn.query(
                `UPDATE ${table} SET plan_items = ?, status = ? WHERE ${idCol} = ?`,
                [JSON.stringify(c.payload.items), c.payload.status, c.id]
              )
            }
            break
          }
        }
      }
      await conn.commit()
      console.log(`\n✅ 已落库：${changes.length} 条`)
    } catch (e) {
      await conn.rollback()
      throw e
    }
  }
} finally {
  conn.release()
  await pool.end()
}
