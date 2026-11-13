// 只读摸底：入库/退货流水的归属信息分布，决定修复脚本的归因规则
import pool from './server/config/database.js'

const conn = await pool.getConnection()
try {
  const [whs] = await conn.query('SELECT warehousing_order_id, order_number, purchase_order_id, contract_number, warehousing_items FROM warehousing_orders')
  const [irs] = await conn.query('SELECT inbound_return_id, order_number, source_order_id, contract_number, return_items FROM inbound_return_orders')
  const [pos] = await conn.query('SELECT purchase_order_id, order_number, contract_number, purchase_items FROM purchase_orders')

  const byContract = new Map()
  for (const p of pos) {
    const c = p.contract_number || '(无合同)'
    byContract.set(c, (byContract.get(c) || 0) + 1)
  }

  let whNull = 0, whLinked = 0
  console.log('=== 入库单归属分布 ===')
  for (const w of whs) {
    if (w.purchase_order_id) { whLinked++; continue }
    whNull++
    console.log(`  无 purchase_order_id: ${w.order_number} 合同=${w.contract_number || '(空)'} 合同下采购单数=${byContract.get(w.contract_number || '(无合同)') || 0}`)
  }
  console.log(`有 purchase_order_id: ${whLinked} 条 / 无: ${whNull} 条 / 总: ${whs.length} 条`)

  console.log('\n=== 入库退货单归属分布 ===')
  for (const r of irs) {
    console.log(`  ${r.order_number}: source_order_id=${r.source_order_id || '(空)'} 合同=${r.contract_number || '(空)'}`)
  }

  console.log('\n=== 采购单合同分布（>1 即无法按合同精确归因） ===')
  for (const [c, n] of byContract) {
    if (n > 1) console.log(`  合同 ${c}: ${n} 张采购单`)
  }

  console.log('\n=== 采购单已入库明细（含超收） ===')
  for (const p of pos) {
    for (const it of (Array.isArray(p.purchase_items) ? p.purchase_items : JSON.parse(p.purchase_items || '[]'))) {
      const q = parseFloat(it.quantity) || 0
      const inn = parseFloat(it.inbound_quantity) || 0
      if (inn > q + 1e-6) console.log(`  超收: ${p.order_number} ${it.product_code}: 采购${q} 已入库${inn}`)
    }
  }
} finally {
  conn.release()
  await pool.end()
}
