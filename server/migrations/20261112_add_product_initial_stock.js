import mysql from 'mysql2/promise'
import '../loadEnv.js'

// 迁移：products 表新增 initial_stock（建档初始库存）
//
// 背景：进销存明细表的期初/结余只累计单据流水，而 products.stock 里包含
// 建档时录入的初始库存，导致「报表结余 = 产品库存 − 初始库存」永远差一截
// （表现为报表结余为负、产品库存应 0 非 0）。
//
// 本迁移把建档初始库存显式落档：
//   initial_stock = stock − 全部单据净流入（入库 − 入库退货 − 出库 + 出库退货）
// 回填后恒等式成立：stock = initial_stock + 单据净流入，报表期初改为
//   期初 = initial_stock + 之前单据净流入
// 结余即与产品库存严格对账。
//
// 用法：node 20261112_add_product_initial_stock.js        （执行）
//       node 20261112_add_product_initial_stock.js down   （回滚）

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'inventory_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

function toArr(v) {
  if (!v) return []
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// 全量单据净流入（入库+ / 入库退货− / 出库− / 出库退货+），时间为空的行同样计入
async function computeNetMovements(connection) {
  const [wh] = await connection.query('SELECT warehousing_items FROM warehousing_orders')
  const [ir] = await connection.query('SELECT return_items FROM inbound_return_orders')
  const [dl] = await connection.query('SELECT delivery_items FROM delivery_orders')
  const [orr] = await connection.query('SELECT return_items FROM outbound_return_orders')

  const net = new Map()
  const push = (rows, kind, sign) => {
    for (const row of rows) {
      for (const it of toArr(row[kind])) {
        if (!it.product_code) continue
        net.set(it.product_code, (net.get(it.product_code) || 0) + sign * (parseFloat(it.quantity) || 0))
      }
    }
  }
  push(wh, 'warehousing_items', 1)
  push(ir, 'return_items', -1)
  push(dl, 'delivery_items', -1)
  push(orr, 'return_items', 1)
  return net
}

async function up() {
  let connection = null
  try {
    console.log('Connecting to database...')
    connection = await pool.getConnection()
    await connection.beginTransaction()

    await connection.query(
      `ALTER TABLE products ADD COLUMN initial_stock DECIMAL(15,4) NOT NULL DEFAULT 0 COMMENT '建档初始库存（不含单据流水）'`
    )
    console.log('✓ products.initial_stock 列已添加')

    const [products] = await connection.query('SELECT product_id, product_name, product_code, stock FROM products')
    const net = await computeNetMovements(connection)

    let updated = 0
    for (const p of products) {
      const movements = net.get(p.product_code) || 0
      const initial = Math.round(((parseFloat(p.stock) || 0) - movements) * 10000) / 10000
      await connection.query('UPDATE products SET initial_stock = ? WHERE product_id = ?', [initial, p.product_id])
      console.log(`  回填 ${p.product_code} ${p.product_name || ''}: 初始库存=${initial}（库存 ${p.stock} − 单据净 ${movements}）`)
      updated++
    }
    console.log(`✓ 回填完成：${updated} 个产品`)

    await connection.commit()
    console.log('✓ 迁移完成！恒等式 stock = initial_stock + 单据净流入 已成立')
  } catch (error) {
    if (connection) {
      try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
    }
    console.error('✗ Migration failed:', error.message)
    throw error
  } finally {
    if (connection) connection.release()
    await pool.end()
  }
}

async function down() {
  let connection = null
  try {
    connection = await pool.getConnection()
    await connection.query('ALTER TABLE products DROP COLUMN initial_stock')
    console.log('✓ products.initial_stock 列已删除')
  } catch (error) {
    console.error('✗ Rollback failed:', error.message)
    throw error
  } finally {
    if (connection) connection.release()
    await pool.end()
  }
}

const action = process.argv[2]

if (action === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1))
} else {
  up().then(() => process.exit(0)).catch(() => process.exit(1))
}
