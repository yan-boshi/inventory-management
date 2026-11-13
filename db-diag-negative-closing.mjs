// 只读诊断：进销存明细表「结余为负」与产品库存「应 0 非 0」的成因分析
// 全部 SELECT，不写库
import pool from './server/config/database.js'

function toArr(v) {
  if (!v) return []
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

const conn = await pool.getConnection()
try {
  const [products] = await conn.query(
    'SELECT product_id, product_name, product_code, stock, tax_included_price FROM products'
  )

  // 全量单据（含时间），与报表同口径：入库+、入库退货-、出库-、出库退货+
  const [whRows] = await conn.query(
    'SELECT warehousing_items, warehousing_time FROM warehousing_orders'
  )
  const [dlRows] = await conn.query(
    'SELECT delivery_items, delivery_time FROM delivery_orders'
  )
  const [irRows] = await conn.query(
    'SELECT return_items, return_time FROM inbound_return_orders'
  )
  const [orRows] = await conn.query(
    'SELECT return_items, return_time FROM outbound_return_orders'
  )

  // 按产品累计：全量净流入、期间(2026)净流入、NULL 时间的“隐身”数量、无编码行数量
  const agg = new Map() // code -> { net, net2026, nullTimeQty, noCodeQty, name }
  const push = (rows, timeField, sign, kind) => {
    for (const row of rows) {
      const t = row[timeField]
      for (const it of toArr(row[kind])) {
        const qty = parseFloat(it.quantity) || 0
        const code = it.product_code
        if (!code) {
          for (const a of agg.values()) a.noCodeQty += qty
          continue
        }
        if (!agg.has(code)) agg.set(code, { net: 0, net2026: 0, nullTimeQty: 0, noCodeQty: 0, name: it.product_name || '' })
        const a = agg.get(code)
        if (!t) {
          a.nullTimeQty += sign * qty // 时间为 NULL 的行被报表的 BETWEEN / < 全部漏掉
          continue
        }
        a.net += sign * qty
        const y = String(t).slice(0, 4)
        if (y === '2026') a.net2026 += sign * qty
      }
    }
  }
  push(whRows, 'warehousing_time', 1, 'warehousing_items')
  push(irRows, 'return_time', -1, 'return_items')
  push(dlRows, 'delivery_time', -1, 'delivery_items')
  push(orRows, 'return_time', 1, 'return_items')

  // 报表口径：期初(2026 之前净流入) + 本期(2026)净流入 = 全量净流入（即 net）
  // 结余(2026) = net（全量）；结余(某月) 另算，这里先看年度/全量两个口径
  const negatives = []
  const drift = []
  for (const p of products) {
    const a = agg.get(p.product_code) || { net: 0, net2026: 0, nullTimeQty: 0, noCodeQty: 0, name: '' }
    const stock = parseFloat(p.stock) || 0
    const impliedInitial = stock - a.net // 产品库存与单据事实的差 = 建档初始库存 + 历史漂移
    // 年度结余（报表 2026 年口径）= 2026 年前净流入(期初) + 2026 净流入 = net
    if (a.net < -1e-6) {
      negatives.push({ code: p.product_code, name: p.product_name, closing2026: a.net, stock, impliedInitial, nullTimeQty: a.nullTimeQty })
    }
    if (Math.abs(impliedInitial) > 1e-6) {
      drift.push({ code: p.product_code, name: p.product_name, stock, net: a.net, impliedInitial, nullTimeQty: a.nullTimeQty })
    }
  }

  console.log('=== 产品总数:', products.length, '===')
  console.log(`\n=== A. 报表结余(2026 全量口径)为负的产品：${negatives.length} 个 ===`)
  for (const n of negatives.slice(0, 15)) {
    console.log(`  ${n.code} ${n.name}: 结余=${n.closing2026} 产品库存=${n.stock} 库存-单据=${n.impliedInitial} NULL时间单据量=${n.nullTimeQty}`)
  }

  console.log(`\n=== B. 产品库存 ≠ 单据推算值（建档初始库存或历史漂移）：${drift.length} 个 ===`)
  for (const d of drift.slice(0, 15)) {
    console.log(`  ${d.code} ${d.name}: 库存=${d.stock} 单据净=${d.net} 差值(≈初始/漂移)=${d.impliedInitial}`)
  }

  // C. “应 0 不为 0”：单据已全部走完（净=0 或 负）但库存>0
  const shouldZero = drift.filter(d => d.stock > 1e-6 && d.net <= 1e-6)
  console.log(`\n=== C. 单据净流入<=0 但库存>0（应 0 不为 0 候选）：${shouldZero.length} 个 ===`)
  for (const d of shouldZero.slice(0, 15)) {
    console.log(`  ${d.code} ${d.name}: 库存=${d.stock} 单据净=${d.net} 差值=${d.impliedInitial}`)
  }

  // D. 时间为 NULL 的单据行（报表完全看不见它们）
  const nullTime = drift.filter(d => Math.abs(d.nullTimeQty) > 1e-6)
  console.log(`\n=== D. 存在时间为空的单据行（报表两头都不算）：${nullTime.length} 个产品受影响 ===`)
  for (const d of nullTime.slice(0, 10)) {
    console.log(`  ${d.code} ${d.name}: 隐身量=${d.nullTimeQty}`)
  }
} finally {
  conn.release()
  await pool.end()
}
