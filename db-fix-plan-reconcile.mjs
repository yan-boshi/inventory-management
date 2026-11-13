// 三本账数据修复：按入库/退货流水重算 采购单.inbound_quantity 与 入库计划.待入库数量
//
// 归因规则（每条明细行归到具体采购单）：
//   1. 入库单.purchase_order_id 直连（新数据）
//   2. 入库单.plan_deductions → inbound_plans.purchase_order_id（从计划生成的单据）
//   3. 合同内唯一商品匹配：该合同下只有一张采购单含此商品 → 归它
//   4. 仍含糊 → 不动、列入报告（宁可不修，不瞎猜）
//
// 用法：node db-fix-plan-reconcile.mjs          （dry-run，只打印将要改什么）
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
const r4 = x => Math.round(x * 10000) / 10000

const conn = await pool.getConnection()
try {
  const [pos] = await conn.query('SELECT purchase_order_id, order_number, contract_number, purchase_items FROM purchase_orders')
  const [plans] = await conn.query('SELECT inbound_plan_id, purchase_order_id, plan_number, plan_items FROM inbound_plans')
  const [whs] = await conn.query('SELECT warehousing_order_id, order_number, purchase_order_id, contract_number, warehousing_items, plan_deductions FROM warehousing_orders')
  const [irs] = await conn.query('SELECT inbound_return_id, order_number, source_order_id, contract_number, return_items FROM inbound_return_orders')

  // ---- 归因辅助 ----
  const poById = new Map(pos.map(p => [p.purchase_order_id, p]))
  const planPoById = new Map(plans.map(pl => [pl.inbound_plan_id, pl.purchase_order_id]))
  const posByContract = new Map()
  for (const p of pos) {
    const c = p.contract_number || ''
    if (!posByContract.has(c)) posByContract.set(c, [])
    posByContract.get(c).push(p)
  }
  // 合同 + 商品 → 唯一采购单（含该商品的采购单只有一张时才可归因）
  const uniquePoForProduct = (contract, productCode) => {
    const candidates = (posByContract.get(contract || '') || []).filter(p =>
      toArr(p.purchase_items).some(it => it.product_code === productCode)
    )
    return candidates.length === 1 ? candidates[0].purchase_order_id : null
  }

  // ---- 逐行归因，累计 received[po][product] ----
  const received = new Map() // poId -> Map(product -> qty)
  const addReceived = (poId, code, qty) => {
    if (!received.has(poId)) received.set(poId, new Map())
    const m = received.get(poId)
    m.set(code, (m.get(code) || 0) + qty)
  }
  const ambiguous = []
  const attributeItems = (row, items, sign, kind) => {
    // 行级直连：purchase_order_id / 退货的 source_order_id→入库单→purchase_order_id
    let rowPo = row.purchase_order_id || null
    if (!rowPo && row.source_order_id) {
      const src = whs.find(w => w.warehousing_order_id === row.source_order_id)
      rowPo = src?.purchase_order_id || null
    }
    // 行级备选：plan_deductions 里出现过的计划 → 采购单
    const deducedPo = new Set()
    for (const d of toArr(row.plan_deductions)) {
      const po = planPoById.get(d.plan_id)
      if (po) deducedPo.add(po)
    }
    for (const it of items) {
      if (!it.product_code) continue
      const qty = sign * (parseFloat(it.quantity) || 0)
      let poId = rowPo
      if (!poId && deducedPo.size === 1) poId = [...deducedPo][0]
      if (!poId) poId = uniquePoForProduct(row.contract_number, it.product_code)
      if (!poId) {
        ambiguous.push(`${kind} ${row.order_number} 商品 ${it.product_code}（无法归因到具体采购单）`)
        continue
      }
      addReceived(poId, it.product_code, qty)
    }
  }
  for (const w of whs) attributeItems(w, toArr(w.warehousing_items), 1, '入库单')
  for (const r of irs) attributeItems(r, toArr(r.return_items), -1, '入库退货单')

  // ---- 计算变更 ----
  // 保守口径：
  //  - 采购单已入库：只修"有明细被成功归因"的采购单的商品行；完全无法归因的保持原值（不瞎猜、不清零）
  //  - 入库计划待入库：按 采购数量 - 采购单已入库(修复后) 重算，口径确定、无需归因
  const changes = []
  for (const p of pos) {
    const items = toArr(p.purchase_items)
    const perProduct = received.get(p.purchase_order_id) || new Map()
    if (perProduct.size === 0) continue // 无任何可归因流水 → 不动
    const newItems = items.map((it, idx) => {
      const code = it.product_code
      // 同商品多行：只有第一行承接该商品的已入库总量，其余行归 0（与同步逻辑同口径）
      const isFirst = items.findIndex(x => x.product_code === code) === idx
      const inn = perProduct.has(code) && isFirst ? r4(perProduct.get(code)) : (parseFloat(it.inbound_quantity) || 0)
      return { ...it, inbound_quantity: inn }
    })
    const changed = newItems.some((it, i) => Math.abs((parseFloat(it.inbound_quantity) || 0) - (parseFloat(items[i].inbound_quantity) || 0)) > 1e-6)
    if (changed) {
      changes.push({
        type: 'purchase_order',
        id: p.purchase_order_id,
        label: p.order_number,
        before: items.map(it => `${it.product_code}:${it.inbound_quantity ?? 0}`).join(', '),
        after: newItems.map(it => `${it.product_code}:${it.inbound_quantity}`).join(', '),
        payload: newItems
      })
    }
  }
  for (const pl of plans) {
    const po = poById.get(pl.purchase_order_id)
    // 口径：待入库 = 采购数量 - 采购单已入库（与入库计划重建一致），按采购单记录重算，无需流水归因
    const poItems = po ? toArr(po.purchase_items) : []
    const receivedFromPo = new Map()
    for (const it of poItems) {
      if (!it.product_code) continue
      receivedFromPo.set(it.product_code, (receivedFromPo.get(it.product_code) || 0) + (parseFloat(it.inbound_quantity) || 0))
    }
    const items = toArr(pl.plan_items)
    const newItems = items.map((it, idx) => {
      const code = it.product_code
      const isFirst = items.findIndex(x => x.product_code === code) === idx
      const purchaseQty = parseFloat(it.purchase_quantity ?? it.quantity) || 0
      let remaining
      if (isFirst && po) {
        remaining = Math.min(purchaseQty, Math.max(0, purchaseQty - (receivedFromPo.get(code) || 0)))
      } else if (!po) {
        remaining = parseFloat(it.quantity) || 0 // 采购单不存在则不动
      } else {
        remaining = 0
      }
      const status = remaining <= 0 ? 'completed' : (remaining < purchaseQty ? 'partial' : 'pending')
      return { ...it, purchase_quantity: purchaseQty, quantity: r4(remaining), inbound_status: status }
    })
    const planStatus = newItems.every(i => i.inbound_status === 'completed')
      ? 'completed'
      : newItems.every(i => i.inbound_status === 'pending') ? 'pending' : 'partial'
    const changed = newItems.some((it, i) => Math.abs((parseFloat(it.quantity) || 0) - (parseFloat(items[i].quantity) || 0)) > 1e-6)
    if (changed) {
      changes.push({
        type: 'inbound_plan',
        id: pl.inbound_plan_id,
        label: pl.plan_number,
        before: items.map(it => `${it.product_code}:${it.quantity}`).join(', '),
        after: newItems.map(it => `${it.product_code}:${it.quantity}`).join(', '),
        payload: { items: newItems, status: planStatus },
        poExists: !!po
      })
    }
  }

  // ---- 输出 ----
  console.log(`归因统计：入库单/退货明细中无法归因 ${ambiguous.length} 条`)
  for (const a of ambiguous) console.log('  ⚠ ' + a)
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
        if (c.type === 'purchase_order') {
          await conn.query('UPDATE purchase_orders SET purchase_items = ? WHERE purchase_order_id = ?',
            [JSON.stringify(c.payload), c.id])
        } else {
          await conn.query('UPDATE inbound_plans SET plan_items = ?, status = ? WHERE inbound_plan_id = ?',
            [JSON.stringify(c.payload.items), c.payload.status, c.id])
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
