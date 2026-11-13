// 只读验证：新报表口径（期初=initial_stock+之前净流入）的结余是否与 products.stock 严格对平
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
  const [products] = await conn.query('SELECT product_code, product_name, stock, initial_stock FROM products')
  const [wh] = await conn.query('SELECT warehousing_items FROM warehousing_orders')
  const [ir] = await conn.query('SELECT return_items FROM inbound_return_orders')
  const [dl] = await conn.query('SELECT delivery_items FROM delivery_orders')
  const [orr] = await conn.query('SELECT return_items FROM outbound_return_orders')

  const net = new Map()
  const push = (rows, kind, sign) => {
    for (const r of rows) {
      for (const it of toArr(r[kind])) {
        if (!it.product_code) continue
        net.set(it.product_code, (net.get(it.product_code) || 0) + sign * (parseFloat(it.quantity) || 0))
      }
    }
  }
  push(wh, 'warehousing_items', 1)
  push(ir, 'return_items', -1)
  push(dl, 'delivery_items', -1)
  push(orr, 'return_items', 1)

  console.log('产品 | 库存 | 初始库存 | 单据净 | 新口径结余(=初始+净) | 对账')
  let allOk = true
  for (const p of products) {
    const movements = net.get(p.product_code) || 0
    const closing = (parseFloat(p.initial_stock) || 0) + movements
    const ok = Math.abs(closing - (parseFloat(p.stock) || 0)) < 1e-6
    if (!ok) allOk = false
    console.log(
      `${p.product_code} | ${p.stock} | ${p.initial_stock} | ${movements} | ${Math.round(closing * 10000) / 10000} | ${ok ? '平 ✓' : '不平 ✗'}`
    )
  }
  console.log(allOk ? '=== 全部对平：报表结余 ≡ 产品库存 ===' : '=== 存在不平 ===')
} finally {
  conn.release()
  await pool.end()
}
