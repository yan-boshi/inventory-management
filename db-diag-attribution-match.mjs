// 只读：对 7 条无主入库单做"数量配对"归因分析（能否唯一对上某张采购单）
import pool from './server/config/database.js'

const toArr = v => {
  try {
    const a = typeof v === 'string' ? JSON.parse(v) : v
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

const conn = await pool.getConnection()
try {
  const [pos] = await conn.query('SELECT purchase_order_id, order_number, contract_number, purchase_items FROM purchase_orders')
  const [whs] = await conn.query('SELECT warehousing_order_id, order_number, purchase_order_id, contract_number, warehousing_items, warehousing_time, created_at FROM warehousing_orders ORDER BY warehousing_time, order_number')
  const [plans] = await conn.query('SELECT inbound_plan_id, purchase_order_id, plan_number, plan_items FROM inbound_plans')

  console.log('=== 合同下采购单的商品/数量清单 ===')
  for (const p of pos) {
    const items = toArr(p.purchase_items).map(it => `${it.product_code}×${it.quantity}(已入库${it.inbound_quantity ?? 0})`).join(' | ')
    console.log(`  [${p.contract_number}] ${p.order_number}: ${items}`)
  }

  console.log('\n=== 无主入库单明细（含时间，供人工/数量配对） ===')
  for (const w of whs) {
    if (w.purchase_order_id) continue
    const items = toArr(w.warehousing_items).map(it => `${it.product_code}×${it.quantity}`).join(' | ')
    console.log(`  ${w.order_number} 时间=${String(w.warehousing_time || w.created_at).slice(0, 16)} [${w.contract_number}] ${items}`)
  }

  console.log('\n=== 数量配对候选（入库单商品×数量 是否唯一命中某采购单的采购量/计划行） ===')
  for (const w of whs) {
    if (w.purchase_order_id) continue
    for (const it of toArr(w.warehousing_items)) {
      const qty = parseFloat(it.quantity) || 0
      const cands = pos.filter(p => p.contract_number === w.contract_number)
        .filter(p => toArr(p.purchase_items).some(pi => pi.product_code === it.product_code && Math.abs((parseFloat(pi.quantity) || 0) - qty) < 1e-6))
        .map(p => p.order_number)
      console.log(`  ${w.order_number} ${it.product_code}×${qty} → 数量恰好匹配: ${cands.length ? cands.join(', ') : '(无唯一/无匹配)'}`)
    }
  }

  console.log('\n=== 计划行现状（重建历史的旁证） ===')
  for (const pl of plans) {
    const items = toArr(pl.plan_items).map(it => `${it.product_code}: 采购${it.purchase_quantity ?? '?'} 待入库${it.quantity}`).join(' | ')
    console.log(`  ${pl.plan_number} → PO=${pl.purchase_order_id ? pos.find(p => p.purchase_order_id === pl.purchase_order_id)?.order_number : '(无)'}`)
    console.log(`    ${items}`)
  }
} finally {
  conn.release()
  await pool.end()
}
