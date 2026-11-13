// 服务器数据全面巡检（只读，走 HTTP API）
// 覆盖：计划链 / 单据链 / 账款链 / 扣减记录 / 基础数据 / 字段健康
const BASE = process.env.BASE_URL || 'http://47.115.77.82'

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

const findings = []
const add = (sev, cat, msg) => findings.push({ sev, cat, msg })

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.API_USER || 'admin', password: process.env.API_PASS || 'admin123' })
  })
  const body = await res.json()
  if (!res.ok || !body?.data?.token) throw new Error('登录失败: ' + res.status)
  return body.data.token
}

const token = await login()
console.log(`✅ 已登录 ${BASE}`)

async function getAll(path) {
  const out = []
  for (let page = 1; page <= 200; page++) {
    const res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}page=${page}&pageSize=100`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`${path} HTTP ${res.status}`)
    const body = await res.json()
    const rows = body.data || []
    out.push(...rows)
    if (out.length >= (body.pagination?.total ?? out.length) || rows.length === 0) break
  }
  return out
}

const [
  salesOrders, deliveryOrders, outboundPlans, outboundReturns,
  purchaseOrders, warehousingOrders, inboundPlans, inboundReturns,
  products, receivables, payables, writeOffs
] = await Promise.all([
  getAll('/api/sales-orders'), getAll('/api/delivery-orders'), getAll('/api/outbound-plans'), getAll('/api/outbound-returns'),
  getAll('/api/purchase-orders'), getAll('/api/warehousing-orders'), getAll('/api/inbound-plans'), getAll('/api/inbound-returns'),
  getAll('/api/products'), getAll('/api/receivables'), getAll('/api/payables'), getAll('/api/write-off')
])
console.log(`数据量：销售单${salesOrders.length} 出库单${deliveryOrders.length} 出库计划${outboundPlans.length} 出库退货${outboundReturns.length} | 采购单${purchaseOrders.length} 入库单${warehousingOrders.length} 入库计划${inboundPlans.length} 入库退货${inboundReturns.length} | 产品${products.length} 应收${receivables.length} 应付${payables.length} 核销${writeOffs.length}\n`)

// ========== 1. 计划链 ==========
const soById = new Map(salesOrders.map(s => [s.sales_order_id, s]))
const poById = new Map(purchaseOrders.map(p => [p.purchase_order_id, p]))

const checkPlanChain = (plans, orders, orderById, idField, label, qtyField, doneField) => {
  let bad = 0
  for (const pl of plans) {
    const order = orderById.get(pl[idField])
    if (!pl[idField]) {
      add('中', '计划链', `${label} ${pl.plan_number} 未关联${label === '出库计划' ? '销售' : '采购'}单（空关联）`)
      bad++
      continue
    }
    if (!order) {
      add('高', '计划链', `${label} ${pl.plan_number} 关联的单据已删除（悬空引用 ${String(pl[idField]).slice(0, 8)}…）`)
      bad++
      continue
    }
    const pItems = toArr(pl.plan_items)
    const oItems = toArr(order[qtyField === 'sales_quantity' ? 'sales_items' : 'purchase_items'])
    const pQty = pItems.reduce((s, it) => s + num(it.purchase_quantity ?? it.sales_quantity ?? it.quantity), 0)
    const pRem = pItems.reduce((s, it) => s + num(it.quantity), 0)
    const oQty = oItems.reduce((s, it) => s + num(it.quantity), 0)
    const oDone = oItems.reduce((s, it) => s + num(it[doneField]), 0)
    if (Math.abs(pQty - oQty) > 1e-6) {
      add('中', '计划链', `${label} ${pl.plan_number}: 采购/销售数量 ${pQty} ≠ 单据 ${oQty}`)
      bad++
    }
    const expectRem = Math.max(0, oQty - oDone)
    if (Math.abs(pRem - expectRem) > 1e-6) {
      add('高', '计划链', `${label} ${pl.plan_number}: 待办 ${pRem} ≠ 应为 ${r4(expectRem)}（单据已办 ${oDone}）`)
      bad++
    }
  }
  return bad
}
// 采购计划的"已办"口径 = 采购单对该计划的扣减量（不是销售出库量）
const dedByPlanProduct = new Map()
for (const po of purchaseOrders) {
  for (const d of toArr(po.plan_deductions)) {
    const pid = d.plan_id || d.purchase_plan_id
    if (!pid) continue
    const key = `${pid}|${d.product_code || ''}`
    dedByPlanProduct.set(key, (dedByPlanProduct.get(key) || 0) + num(d.quantity))
  }
}
const checkPurchasePlanChain = (plans) => {
  let bad = 0
  for (const pl of plans) {
    const order = soById.get(pl.sales_order_id)
    if (!pl.sales_order_id) { add('中', '计划链', `采购计划 ${pl.plan_number} 未关联销售订单（空关联）`); bad++; continue }
    if (!order) { add('高', '计划链', `采购计划 ${pl.plan_number} 关联的销售单已删除（悬空引用）`); bad++; continue }
    const pItems = toArr(pl.plan_items)
    const oItems = toArr(order.sales_items)
    const pQty = pItems.reduce((s, it) => s + num(it.sales_quantity ?? it.quantity), 0)
    const pRem = pItems.reduce((s, it) => s + num(it.quantity), 0)
    const oQty = oItems.reduce((s, it) => s + num(it.quantity), 0)
    if (Math.abs(pQty - oQty) > 1e-6) { add('中', '计划链', `采购计划 ${pl.plan_number}: 销售数量 ${pQty} ≠ 销售单 ${oQty}`); bad++ }
    const deducted = pItems.reduce((s, it) => s + num(dedByPlanProduct.get(`${pl.purchase_plan_id}|${it.product_code || ''}`)), 0)
    const expectRem = Math.max(0, oQty - deducted)
    if (Math.abs(pRem - expectRem) > 1e-6) { add('高', '计划链', `采购计划 ${pl.plan_number}: 待采购 ${pRem} ≠ 应为 ${r4(expectRem)}（采购单已扣减 ${r4(deducted)}`); bad++ }
  }
  return bad
}
const b1 = checkPlanChain(inboundPlans, purchaseOrders, poById, 'purchase_order_id', '入库计划', 'purchase_quantity', 'inbound_quantity')
const b2 = checkPlanChain(outboundPlans, salesOrders, soById, 'sales_order_id', '出库计划', 'sales_quantity', 'outbound_quantity')
const b3 = checkPurchasePlanChain(await getAll('/api/purchase-plans'))
console.log(`1. 计划链：异常 ${b1 + b2 + b3} 项`)

// ========== 2. 单据链（订单数量 vs 流水） ==========
const sumItems = (rows, field, sign) => {
  const m = new Map()
  for (const row of rows) {
    for (const it of toArr(row[field])) {
      if (!it.product_code) continue
      m.set(it.product_code, (m.get(it.product_code) || 0) + sign * num(it.quantity))
    }
  }
  return m
}
// 按 合同 → 商品 两级聚合流水
const flowByContract = (rows, field, sign) => {
  const m = new Map()
  for (const row of rows) {
    const c = row.contract_number || ''
    if (!m.has(c)) m.set(c, new Map())
    const pm = m.get(c)
    for (const it of toArr(row[field])) {
      if (!it.product_code) continue
      pm.set(it.product_code, (pm.get(it.product_code) || 0) + sign * num(it.quantity))
    }
  }
  return m
}
const mergeFlow = (target, src) => {
  for (const [c, pm] of src) {
    if (!target.has(c)) target.set(c, new Map())
    const t = target.get(c)
    for (const [k, v] of pm) t.set(k, (t.get(k) || 0) + v)
  }
  return target
}
// 销售链（按合同）
const salesByContract = new Map()
for (const s of salesOrders) {
  const c = s.contract_number || ''
  if (!salesByContract.has(c)) salesByContract.set(c, { ordered: new Map() })
  const g = salesByContract.get(c).ordered
  for (const [k, v] of sumItems([s], 'sales_items', 1)) g.set(k, (g.get(k) || 0) + v)
}
const delivFlow = flowByContract(deliveryOrders, 'delivery_items', 1)
mergeFlow(delivFlow, flowByContract(outboundReturns, 'return_items', -1))
for (const [c, g] of salesByContract) {
  const actual = delivFlow.get(c) || new Map()
  for (const [code, qty] of g.ordered) {
    const a = actual.get(code) || 0
    if (a - qty > 1e-6) add('高', '单据链', `合同 ${c || '(空)'} ${code}: 出库流水 ${r4(a)} > 销售数量 ${qty}（超发）`)
    else if (a < -1e-6) add('高', '单据链', `合同 ${c || '(空)'} ${code}: 出库流水为负 ${r4(a)}（退货超量残留）`)
  }
}
// 采购链（按合同）
const purByContract = new Map()
for (const p of purchaseOrders) {
  const c = p.contract_number || ''
  if (!purByContract.has(c)) purByContract.set(c, { ordered: new Map() })
  const g = purByContract.get(c).ordered
  for (const [k, v] of sumItems([p], 'purchase_items', 1)) g.set(k, (g.get(k) || 0) + v)
}
const purFlow = flowByContract(warehousingOrders, 'warehousing_items', 1)
mergeFlow(purFlow, flowByContract(inboundReturns, 'return_items', -1))
for (const [c, g] of purByContract) {
  const actual = purFlow.get(c) || new Map()
  for (const [code, qty] of g.ordered) {
    const a = actual.get(code) || 0
    if (a - qty > 1e-6) add('高', '单据链', `合同 ${c || '(空)'} ${code}: 入库流水 ${r4(a)} > 采购数量 ${qty}（超收）`)
    else if (a < -1e-6) add('高', '单据链', `合同 ${c || '(空)'} ${code}: 入库流水为负 ${r4(a)}（退货超量残留）`)
  }
  // 已入库合计 vs 流水
  const inTotal = purchaseOrders.filter(p => (p.contract_number || '') === c)
    .reduce((s, p) => s + toArr(p.purchase_items).reduce((x, it) => x + num(it.inbound_quantity), 0), 0)
  const flowTotal = [...actual.values()].reduce((s, v) => s + v, 0)
  if (Math.abs(inTotal - flowTotal) > 1e-6) add('高', '单据链', `合同 ${c || '(空)'}: 采购单已入库合计 ${r4(inTotal)} ≠ 入库流水 ${r4(flowTotal)}`)
}
// 出库侧：订单已出库合计 vs 流水
for (const [c, g] of salesByContract) {
  const outTotal = salesOrders.filter(s => (s.contract_number || '') === c)
    .reduce((s, x) => s + toArr(x.sales_items).reduce((t, it) => t + num(it.outbound_quantity), 0), 0)
  const flowTotal = [...(delivFlow.get(c) || new Map()).values()].reduce((s, v) => s + v, 0)
  if (Math.abs(outTotal - flowTotal) > 1e-6) add('高', '单据链', `合同 ${c || '(空)'}: 销售单已出库合计 ${r4(outTotal)} ≠ 出库流水 ${r4(flowTotal)}`)
}
console.log('2. 单据链：检查完成')

// ========== 3. 账款链 ==========
const dOrderNos = new Set(deliveryOrders.map(d => d.order_number))
const wOrderNos = new Set(warehousingOrders.map(w => w.order_number))
const receivableIds = new Set(receivables.map(r => r.receivable_id))
for (const r of receivables) {
  if (!dOrderNos.has(r.source_bill_id)) add('中', '账款链', `应收 ${r.source_bill_id} 的出库单已不存在（孤儿应收）`)
  const total = num(r.amount) + num(r.handling_fee) - num(r.received_amount)
  if (Math.abs(num(r.balance_amount) - total) > 0.01) add('中', '账款链', `应收 ${r.source_bill_id}: 余额 ${r.balance_amount} ≠ 金额+手续费-已收 ${r4(total)}`)
}
for (const p of payables) {
  if (!wOrderNos.has(p.source_bill_id)) add('中', '账款链', `应付 ${p.source_bill_id} 的入库单已不存在（孤儿应付）`)
  const total = num(p.amount) + num(p.handling_fee) - num(p.received_amount)
  if (Math.abs(num(p.balance_amount) - total) > 0.01) add('中', '账款链', `应付 ${p.source_bill_id}: 余额 ${p.balance_amount} ≠ 金额+手续费-已付 ${r4(total)}`)
}
// 核销明细悬空/超额
for (const w of writeOffs) {
  const res = await fetch(`${BASE}/api/write-off/${w.write_off_id}`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json()
  const items = body.data?.items || []
  const perSource = new Map()
  for (const it of items) {
    if (!receivableIds.has(it.source_id) && w.type === 1) add('高', '账款链', `核销单 ${w.write_off_number} 明细指向已不存在的应收（悬空）`)
    if (w.type === 1) perSource.set(it.source_id, (perSource.get(it.source_id) || 0) + num(it.write_off_amount))
  }
}
console.log('3. 账款链：检查完成')

// ========== 4. 扣减记录 ==========
const planIdSets = {
  outbound: new Set(outboundPlans.map(p => p.outbound_plan_id)),
  inbound: new Set(inboundPlans.map(p => p.inbound_plan_id)),
  purchase: new Set((await getAll('/api/purchase-plans')).map(p => p.purchase_plan_id))
}
const checkDeductions = (rows, idSet, label, key) => {
  for (const row of rows) {
    if (row.plan_deductions == null) continue
    for (const d of toArr(row.plan_deductions)) {
      const pid = d[key] || d.plan_id
      if (pid && !idSet.has(pid)) add('高', '扣减记录', `${label} ${row.order_number} 的扣减记录指向不存在的计划 ${String(pid).slice(0, 8)}…（删单回补会丢量）`)
    }
  }
}
checkDeductions(deliveryOrders, planIdSets.outbound, '出库单', 'outbound_plan_id')
checkDeductions(warehousingOrders, planIdSets.inbound, '入库单', 'inbound_plan_id')
checkDeductions(purchaseOrders, planIdSets.purchase, '采购单', 'purchase_plan_id')
console.log('4. 扣减记录：检查完成')

// ========== 5. 基础数据 ==========
const codeCount = new Map()
for (const p of products) {
  codeCount.set(p.product_code, (codeCount.get(p.product_code) || 0) + 1)
  if (num(p.stock) < 0) add('高', '基础数据', `产品 ${p.product_code} 库存为负: ${p.stock}`)
}
for (const [code, n] of codeCount) if (n > 1) add('中', '基础数据', `产品代码重复: ${code} ×${n}`)
const dupNo = (rows, field, label) => {
  const m = new Map()
  for (const r of rows) m.set(r[field], (m.get(r[field]) || 0) + 1)
  for (const [n, c] of m) if (c > 1) add('高', '基础数据', `${label} 编号重复: ${n} ×${c}`)
}
dupNo(salesOrders, 'order_number', '销售单'); dupNo(deliveryOrders, 'order_number', '出库单')
dupNo(purchaseOrders, 'order_number', '采购单'); dupNo(warehousingOrders, 'order_number', '入库单')
dupNo(outboundPlans, 'plan_number', '出库计划'); dupNo(inboundPlans, 'plan_number', '入库计划')
// 明细数量非正/空明细（仅单据类；计划行的 quantity 是"剩余待办"，0 属正常完成态）
const badQty = (rows, field, label) => {
  for (const r of rows) {
    const items = toArr(r[field])
    if (items.length === 0) add('低', '基础数据', `${label} ${r.order_number || r.plan_number} 明细为空`)
    for (const it of items) {
      if (num(it.quantity) <= 0) add('中', '基础数据', `${label} ${r.order_number || r.plan_number} 明细 ${it.product_code || '?'} 数量非正: ${it.quantity}`)
    }
  }
}
badQty(salesOrders, 'sales_items', '销售单'); badQty(deliveryOrders, 'delivery_items', '出库单')
badQty(purchaseOrders, 'purchase_items', '采购单'); badQty(warehousingOrders, 'warehousing_items', '入库单')
// 时间为空
const badTime = (rows, field, label) => {
  for (const r of rows) if (!r[field]) add('低', '基础数据', `${label} ${r.order_number || r.plan_number} ${field} 为空（报表会漏统计）`)
}
badTime(deliveryOrders, 'delivery_time', '出库单'); badTime(warehousingOrders, 'warehousing_time', '入库单')
console.log('5. 基础数据：检查完成')

// ========== 汇总 ==========
const { writeFileSync } = await import('node:fs')
console.log(`\n===== 共 ${findings.length} 项 =====`)
const order = { '高': 0, '中': 1, '低': 2 }
findings.sort((a, b) => order[a.sev] - order[b.sev])
const bySev = { '高': [], '中': [], '低': [] }
for (const f of findings) bySev[f.sev].push(f)
const lines = []
for (const sev of ['高', '中', '低']) {
  if (!bySev[sev].length) continue
  lines.push(`【${sev}】${bySev[sev].length} 项`)
  for (const f of bySev[sev]) lines.push(`  [${f.cat}] ${f.msg}`)
}
writeFileSync('srv-audit-findings.txt', lines.join('\n'))
console.log(`完整清单已写入 srv-audit-findings.txt（${findings.length} 项）`)
for (const sev of ['高', '中', '低']) {
  if (!bySev[sev].length) continue
  console.log(`\n【${sev}】${bySev[sev].length} 项（各分类前 5 条）`)
  const byCat = new Map()
  for (const f of bySev[sev]) {
    if (!byCat.has(f.cat)) byCat.set(f.cat, [])
    byCat.get(f.cat).push(f)
  }
  for (const [cat, list] of byCat) {
    console.log(`  <${cat}> ${list.length} 条`)
    for (const f of list.slice(0, 5)) console.log(`    ${f.msg}`)
  }
}
if (!findings.length) console.log('✅ 未发现数据问题')
