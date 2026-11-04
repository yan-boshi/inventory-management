// 只读数据一致性体检：全部 SELECT，不写库
// 用法：node db-consistency-audit.mjs
//
// 每项检查独立容错：表/列不存在（如服务器环境 schema 落后、迁移没跑全）时
// 记入「跳过」并说明缺什么，不让整个脚本崩溃。
import pool from './server/config/database.js'

const issues = []
const skipped = []
const add = (category, detail) => issues.push({ category, detail })

function toArr(v) {
  if (!v) return []
  const arr = typeof v === 'string' ? JSON.parse(v) : v
  return Array.isArray(arr) ? arr : []
}

function sumQty(items) {
  return toArr(items).reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0)
}

const conn = await pool.getConnection()
try {
  const [tables] = await conn.query('SHOW TABLES')
  const names = tables.map(t => Object.values(t)[0])
  console.log('数据库表数量:', names.length)

  // 预载全部表结构（information_schema，只读）
  const tableCols = new Map()
  for (const t of names) {
    const [rows] = await conn.query(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [t]
    )
    tableCols.set(t, new Set(rows.map(r => r.COLUMN_NAME)))
  }

  // 缺表/缺列返回原因字符串；齐全返回 null
  const requireCols = (table, cols) => {
    const have = tableCols.get(table)
    if (!have) return `表 ${table} 不存在`
    const missing = cols.filter(c => !have.has(c))
    return missing.length ? `${table} 缺列: ${missing.join(', ')}` : null
  }

  // 独立容错执行一项检查
  const runCheck = async (label, precheck, fn) => {
    const skip = precheck ? precheck() : null
    if (skip) {
      skipped.push(`${label} → 跳过（${skip}，多为迁移未跑全，请补跑 server/migrations/）`)
      return
    }
    try {
      await fn()
    } catch (e) {
      skipped.push(`${label} → 执行出错: ${e.message}`)
    }
  }

  // ---------- 1. 孤儿计划（历史 bug 残留） ----------
  for (const t of ['outbound_plans', 'purchase_plans']) {
    await runCheck(
      `孤儿计划检查(${t})`,
      () => requireCols(t, ['plan_number', 'sales_order_id']) || requireCols('sales_orders', ['sales_order_id']),
      async () => {
        const [rows] = await conn.query(
          `SELECT plan_number, sales_order_id FROM ${t}
           WHERE sales_order_id IS NOT NULL AND sales_order_id <> ''
             AND sales_order_id NOT IN (SELECT sales_order_id FROM sales_orders)`
        )
        for (const r of rows) add('孤儿计划', `${t} ${r.plan_number} 的销售订单 ${r.sales_order_id} 已不存在`)
      }
    )
  }

  // ---------- 2. 海关汇率生效月不是每月 1 日 ----------
  await runCheck(
    '汇率生效月检查',
    () => requireCols('customs_exchange_rates', ['source_currency', 'target_currency', 'effective_month']),
    async () => {
      const [rows] = await conn.query(
        'SELECT source_currency, target_currency, effective_month FROM customs_exchange_rates WHERE DAY(effective_month) <> 1'
      )
      for (const r of rows) {
        const d = r.effective_month instanceof Date ? r.effective_month.toISOString().slice(0, 10) : String(r.effective_month).slice(0, 10)
        add('汇率生效月非月初', `${r.source_currency}->${r.target_currency} 生效月=${d}`)
      }
    }
  )

  // ---------- 3. 单据编号重复 ----------
  const dupChecks = [
    ['sales_orders', 'order_number'], ['delivery_orders', 'order_number'],
    ['purchase_orders', 'order_number'], ['warehousing_orders', 'order_number'],
    ['outbound_plans', 'plan_number'], ['purchase_plans', 'plan_number']
  ]
  for (const [t, col] of dupChecks) {
    await runCheck(
      `编号重复检查(${t})`,
      () => requireCols(t, [col]),
      async () => {
        const [rows] = await conn.query(`SELECT ${col} n, COUNT(*) c FROM ${t} GROUP BY ${col} HAVING c > 1`)
        for (const r of rows) add('编号重复', `${t}.${col} = ${r.n} 出现 ${r.c} 次`)
      }
    )
  }

  // ---------- 4. 计划原始数量 != 销售订单数量；计划剩余 != 订单剩余 ----------
  await runCheck(
    '计划数量一致性检查',
    () => requireCols('sales_orders', ['sales_order_id', 'order_number', 'sales_items'])
      || requireCols('outbound_plans', ['sales_order_id', 'plan_items']),
    async () => {
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
  )

  // ---------- 5. 出库数量超发 / 与出库单明细不一致 ----------
  await runCheck(
    '出库数量同步检查',
    () => requireCols('sales_orders', ['sales_order_id', 'order_number', 'sales_items'])
      || requireCols('delivery_orders', ['delivery_order_id', 'order_number', 'sales_order_id', 'contract_number', 'delivery_items']),
    async () => {
      const [orders] = await conn.query('SELECT sales_order_id, order_number, sales_items FROM sales_orders')
      const [delivs] = await conn.query('SELECT delivery_order_id, order_number, sales_order_id, contract_number, delivery_items FROM delivery_orders')
      const delivSum = new Map()
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
  )

  // ---------- 6. 计划扣减记录引用了不存在的计划 ----------
  for (const [t, planTable, key] of [
    ['delivery_orders', 'outbound_plans', 'outbound_plan_id'],
    ['warehousing_orders', 'inbound_plans', 'inbound_plan_id'],
    ['purchase_orders', 'purchase_plans', 'purchase_plan_id']
  ]) {
    await runCheck(
      `扣减引用检查(${t})`,
      () => requireCols(t, ['order_number', 'plan_deductions']) || requireCols(planTable, [key]),
      async () => {
        const [rows] = await conn.query(`SELECT order_number, plan_deductions FROM ${t} WHERE plan_deductions IS NOT NULL`)
        const [plans] = await conn.query(`SELECT ${key} FROM ${planTable}`)
        const planIds = new Set(plans.map(p => p[key]))
        for (const r of rows) {
          for (const d of toArr(r.plan_deductions)) {
            const pid = d[key] || d.plan_id
            if (pid && !planIds.has(pid)) add('扣减引用悬空', `${t} ${r.order_number} 的 plan_deductions 引用了不存在的计划 ${pid}（删单回补会失败）`)
          }
        }
      }
    )
  }

  // ---------- 7. 负库存 ----------
  await runCheck(
    '负库存检查',
    () => requireCols('products', ['product_code', 'product_name', 'stock']),
    async () => {
      const [rows] = await conn.query('SELECT product_code, product_name, stock FROM products WHERE stock < 0')
      for (const r of rows) add('负库存', `${r.product_name}(${r.product_code}) 库存=${r.stock}`)
    }
  )

  // ---------- 8. 核销金额超过单据金额（多收/预收属正常，请人工甄别） ----------
  await runCheck(
    '核销超额检查',
    () => requireCols('write_off_items', ['write_off_id', 'source_type', 'source_bill_id', 'write_off_amount'])
      || requireCols('write_off_documents', ['write_off_id', 'write_off_number'])
      || requireCols('delivery_orders', ['order_number', 'total_amount']),
    async () => {
      const [rows] = await conn.query(
        `SELECT wd.write_off_number, wi.source_bill_id, SUM(wi.write_off_amount) AS total, d.total_amount
         FROM write_off_items wi
         JOIN write_off_documents wd ON wd.write_off_id = wi.write_off_id
         JOIN delivery_orders d ON d.order_number = wi.source_bill_id
         WHERE wi.source_type = 1
         GROUP BY wd.write_off_number, wi.source_bill_id, d.total_amount
         HAVING total > d.total_amount + 0.0001`
      )
      for (const r of rows) {
        add('核销超额(多收/预收属正常,请甄别)', `核销单 ${r.write_off_number} 对单据 ${r.source_bill_id} 核销 ${r.total} > 单据金额 ${r.total_amount}`)
      }
    }
  )

  // ---------- 汇总 ----------
  if (skipped.length > 0) {
    console.log(`\n===== 跳过 ${skipped.length} 项检查 =====`)
    for (const s of skipped) console.log('  -', s)
  }

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
