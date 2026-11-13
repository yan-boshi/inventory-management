// 只读对账：入库计划(采购数量/待入库数量) × 采购订单(采购数量/已入库) × 入库单实际入库
// 检查三个恒等式：
//   A. 计划采购数量合计 == 采购订单采购数量合计
//   B. 计划待入库合计 == 采购数量 - 已入库（R-B1 重建时维护的口径）
//   C. 采购单已入库数量 == 实际入库（入库单 - 入库退货）
import pool from './server/config/database.js'

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
  const [plans] = await conn.query('SELECT inbound_plan_id, plan_number, purchase_order_id, contract_number, plan_items FROM inbound_plans')
  const [pos] = await conn.query('SELECT purchase_order_id, order_number, contract_number, purchase_items FROM purchase_orders')
  const [whs] = await conn.query('SELECT purchase_order_id, contract_number, warehousing_items FROM warehousing_orders')
  const [irs] = await conn.query('SELECT source_order_id, contract_number, return_items FROM inbound_return_orders')

  // 实际入库 = 入库单 - 入库退货（按采购订单聚合，无关联的按合同聚合做旁证）
  const receivedByPO = new Map()
  const receivedByContract = new Map()
  const add = (map, key, qty) => { if (key) map.set(key, (map.get(key) || 0) + qty) }
  for (const w of whs) {
    const qty = toArr(w.warehousing_items).reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0)
    add(receivedByPO, w.purchase_order_id, qty)
    add(receivedByContract, w.contract_number, qty)
  }
  for (const r of irs) {
    const qty = toArr(r.return_items).reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0)
    add(receivedByPO, r.source_order_id, -qty)
    add(receivedByContract, r.contract_number, -qty)
  }

  const poById = new Map(pos.map(p => [p.purchase_order_id, p]))
  const poQty = new Map(), poIn = new Map()
  for (const p of pos) {
    const items = toArr(p.purchase_items)
    poQty.set(p.purchase_order_id, items.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0))
    poIn.set(p.purchase_order_id, items.reduce((s, it) => s + (parseFloat(it.inbound_quantity) || 0), 0))
  }

  let badA = 0, badB = 0, badC = 0
  console.log('=== 逐计划对账（A 计划采购数量 vs PO；B 计划待入库 vs PO剩余）===')
  for (const pl of plans) {
    const items = toArr(pl.plan_items)
    const pQty = items.reduce((s, it) => s + (parseFloat(it.purchase_quantity ?? it.quantity) || 0), 0)
    const pRem = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0)
    const po = poById.get(pl.purchase_order_id)
    const q = po ? poQty.get(pl.purchase_order_id) : null
    const inn = po ? poIn.get(pl.purchase_order_id) : null
    const okA = po ? Math.abs(pQty - q) < 1e-6 : null
    const okB = po ? Math.abs(pRem - (q - inn)) < 1e-6 : null
    if (okA === false) badA++
    if (okB === false) badB++
    if (okA === false || okB === false) {
      console.log(`  ✗ ${pl.plan_number}: 计划采购${pQty} 待入库${pRem} | PO采购${q} 已入库${inn} ${okA ? '' : '[A不平]'}${okB ? '' : '[B不平]'}`)
    }
  }
  console.log(`A 不平: ${badA} 个计划；B 不平: ${badB} 个计划`)

  console.log('\n=== 采购单对账（C PO已入库 vs 实际入库流水）===')
  // 旧流水没有 purchase_order_id 时无法逐单比较，按"合同合计"口径：
  // 合同下所有采购单的已入库合计 == 合同下全部入库/退货流水合计
  const contractPoIn = new Map()
  for (const p of pos) {
    const c = p.contract_number || ''
    contractPoIn.set(c, (contractPoIn.get(c) || 0) + (poIn.get(p.purchase_order_id) || 0))
  }
  for (const [c, total] of contractPoIn) {
    const actual = receivedByContract.get(c) || 0
    const okC = Math.abs(total - actual) < 1e-6
    if (!okC) {
      badC++
      console.log(`  ✗ 合同 ${c}: 采购单已入库合计${total} vs 流水合计${r4(actual)}`)
    }
  }
  console.log(`C 不平: ${badC} 个合同（逐单归因口径见 db-fix-plan-reconcile.mjs）`)
  if (!badA && !badB && !badC) console.log('\n=== 三本账全部对平 ===')
} finally {
  conn.release()
  await pool.end()
}
