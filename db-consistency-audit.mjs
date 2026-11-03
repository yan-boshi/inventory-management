// 只读数据一致性体检：全部 SELECT，不写库
// 用法：node db-consistency-audit.mjs
import pool from './server/config/database.js'

const issues = []
const add = (category, detail) => issues.push({ category, detail })

function sumQty(items) {
  if (!items) return 0
  const arr = typeof items === 'string' ? JSON.parse(items) : items
  return (Array.isArray(arr) ? arr : []).reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0)
}

function toArr(v) {
  if (!v) return []
  const arr = typeof v === 'string' ? JSON.parse(v) : v
  return Array.isArray(arr) ? arr : []
}

const conn = await pool.getConnection()
try {
  const [tables] = await conn.query('SHOW TABLES')
  const names = tables.map(t => Object.values(t)[0])
  console.log('数据库表数量:', names.length)

  // ---------- 1. 孤儿计划（历史 bug 残留） ----------
  for (const t of ['outbound_plans', 'purchase_plans']) {
    if (!names.includes(t)) continue
    const [rows] = await conn.query(
      `SELECT plan_number, sales_order_id FROM ${t}
       WHERE sales_order_id IS NOT NULL AND sales_order_id <> ''
         AND sales_order_id NOT IN (SELECT sales_order_id FROM sales_orders)`
    )
    for (const r of rows) add('孤儿计划', `${t} ${r.plan_number} 的销售订单 ${r.sales_order_id} 已不存在`)
  }

  // ---------- 2. 海关汇率生效月不是每月 1 日 ----------
  if (names.includes('customs_exchange_rates')) {
    const [rows] = await conn.query(
      "SELECT source_currency, target_currency, effective_month FROM customs_exchange_rates WHERE DAY(effective_month) <> 1"
    )
    for (const r of rows) {
      const d = r.effective_month instanceof Date ? r.effective_month.toISOString().slice(0, 10) : String(r.effective_month).slice(0, 10)
      add('汇率生效月非月初', `${r.source_currency}->${r.target_currency} 生效月=${d}`)
    }
  }

  // ---------- 3. 单据编号重复 ----------
  const dupChecks = [
    ['sales_orders', 'order_number'], ['delivery_orders', 'order_number'],
    ['purchase_orders', 'order_number'], ['warehousing_orders', 'order_number'],
    ['outbound_plans', 'plan_number'], ['purchase_plans', 'plan_number']
  ]
  for (const [t, col] of dupChecks) {
    if (!names.includes(t)) continue
    const [rows] = await conn.query(
      `SELECT ${col} n, COUNT(*) c FROM ${t} GROUP BY ${col} HAVING c > 1`
    )
    for (const r of rows) add('编号重复', `${t}.${col} = ${r.n} 出现 ${r.c} 次`)
  }

  // ---------- 4. 计划原始数量 != 销售订单数量；计划剩余 != 订单剩余 ----------
  if (names.includes('outbound_plans') && names.includes('sales_orders')) {
    const [orders] = await conn.query('SELECT sales_order_id, order_number, sales_items FROM sales_orders')
    const [plans] = await conn.query('SELECT sales_order_id, plan_number, plan_items FROM outbound_plans WHERE sales_order_id IS NOT NULL')
    // plan_items.quantity=剩余待出库，sales_quantity=原始销售数量
    const planOrig = new Map(), planLeft = new Map()
    for (const p of plans) {
      const items = toArr(p.plan_items)
      planOrig.set(p.sales_order_id, (planOrig.get(p.sales_order_id) || 0) + items.reduce((s, it) => s + (parseFloat(it.sales_quantity ?? it.quantity) || 0), 0))
      planLeft.set(p.sales_order_id, (planLeft.get(p.sales_order_id) || 0) + sumQty(p.plan_items))
    }
    for (const o of orders) {
      const items = toArr(o.sales_items)
      const so = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0)
      const soLeft = items.reduce((s, it) => s + Math.max(0, (parseFloat(it.quantity) || 0) - (parseFloat(it.outbound_quantity) || 0)), 0)
      const po = planOrig.get(o.sales_order_id) || 0
      const pl = planLeft.get(o.sales_order_id) || 0
      if (Math.abs(so - po) > 1e-6) add('计划原始数量不一致', `订单 ${o.order_number}: 销售数量 ${so} vs 计划原始数量 ${po}`)
      else if (Math.abs(soLeft - pl) > 1e-6) add('计划剩余数量不一致', `订单 ${o.order_number}: 订单剩余 ${soLeft} vs 计划剩余 ${pl}`)
    }
  }

  // ---------- 5. 出库数量超发 / 与出库单明细不一致 ----------
  if (names.includes('delivery_orders') && names.includes('sales_orders')) {
    const [orders] = await conn.query('SELECT sales_order_id, order_number, sales_items FROM sales_orders')
    const [delivs] = await conn.query('SELECT delivery_order_id, order_number, sales_order_id, contract_number, delivery_items FROM delivery_orders')
    // 每张销售订单：明细里 outbound_quantity 之和 vs 出库单实际发过货数量之和
    const delivSum = new Map() // key: sales_order_id
    for (const d of delivs) {
      const key = d.sales_order_id || `contract:${d.contract_number}`
      delivSum.set(key, (delivSum.get(key) || 0) + sumQty(d.delivery_items))
    }
    for (const o of orders) {
      const items = toArr(o.sales_items)
      let recorded = 0
      for (const it of items) {
        const out = parseFloat(it.outbound_quantity) || 0
        recorded += out
        if (out - (parseFloat(it.quantity) || 0) > 1e-6) {
          add('超发出库', `订单 ${o.order_number} 商品 ${it.product_code || it.product_name}: 数量 ${it.quantity} 已出库 ${out}`)
        }
      }
      const actual = delivSum.get(o.sales_order_id) || 0
      if (delivs.some(d => d.sales_order_id === o.sales_order_id) && Math.abs(recorded - actual) > 1e-6) {
        add('出库数量不同步', `订单 ${o.order_number}: 订单上记录已出库 ${recorded} vs 出库单实际 ${actual}`)
      }
    }
  }

  // ---------- 6. 计划扣减记录引用了不存在的计划 ----------
  for (const [t, key] of [['delivery_orders', 'outbound_plan_id'], ['warehousing_orders', 'inbound_plan_id'], ['purchase_orders', 'purchase_plan_id']]) {
    if (!names.includes(t)) continue
    const planTable = t === 'delivery_orders' ? 'outbound_plans' : t === 'warehousing_orders' ? 'inbound_plans' : 'purchase_plans'
    if (!names.includes(planTable)) continue
    const [rows] = await conn.query(`SELECT order_number, plan_deductions FROM ${t} WHERE plan_deductions IS NOT NULL`)
    const [plans] = await conn.query(`SELECT * FROM ${planTable}`)
    const planIds = new Set(plans.map(p => p[Object.keys(p).find(k => k.endsWith('_plan_id'))]))
    for (const r of rows) {
      for (const d of toArr(r.plan_deductions)) {
        const pid = d[key] || d.plan_id
        if (pid && !planIds.has(pid)) add('扣减引用悬空', `${t} ${r.order_number} 的 plan_deductions 引用了不存在的计划 ${pid}（删单回补会失败）`)
      }
    }
  }

  // ---------- 7. 负库存 ----------
  if (names.includes('products')) {
    const [rows] = await conn.query('SELECT product_code, product_name, stock FROM products WHERE stock < 0')
    for (const r of rows) add('负库存', `${r.product_name}(${r.product_code}) 库存=${r.stock}`)
  }

  // ---------- 8. 核销金额超过单据金额 ----------
  if (names.includes('write_off_items') && names.includes('delivery_orders')) {
    const [rows] = await conn.query(
      `SELECT w.write_off_number, w.source_bill_id, SUM(w.amount) total, d.total_amount
       FROM write_off_items w JOIN delivery_orders d ON d.order_number = w.source_bill_id
       WHERE w.source_bill_type = 1 GROUP BY w.write_off_number, w.source_bill_id, d.total_amount
       HAVING total > d.total_amount + 0.0001`
    ).catch(() => [[]])
    for (const r of rows || []) add('核销超额', `核销单 ${r.write_off_number} 对单据 ${r.source_bill_id} 核销 ${r.total} > 单据金额 ${r.total_amount}`)
  }

  // ---------- 汇总 ----------
  console.log(`\n===== 发现 ${issues.length} 个数据问题 =====`)
  const byCat = new Map()
  for (const i of issues) {
    if (!byCat.has(i.category)) byCat.set(i.category, [])
    byCat.get(i.category).push(i.detail)
  }
  for (const [cat, list] of byCat) {
    console.log(`\n【${cat}】${list.length} 条`)
    for (const d of list.slice(0, 15)) console.log('  -', d)
    if (list.length > 15) console.log(`  ...另有 ${list.length - 15} 条`)
  }
} finally {
  conn.release()
  await pool.end()
}
