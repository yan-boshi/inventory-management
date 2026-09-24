import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'abc1234!',
  database: process.env.DB_NAME || 'inventory_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function up() {
  let connection = null
  try {
    console.log('Connecting to database...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    // 1. 查询所有有 related_sales_orders 的采购订单
    const [purchaseOrders] = await connection.query(`
      SELECT purchase_order_id, related_sales_orders, purchase_items
      FROM purchase_orders
      WHERE related_sales_orders IS NOT NULL AND related_sales_orders != '[]' AND related_sales_orders != 'null'
    `)

    console.log(`Found ${purchaseOrders.length} purchase orders with related_sales_orders`)

    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const po of purchaseOrders) {
      try {
        let relatedList = []
        try {
          relatedList = typeof po.related_sales_orders === 'string'
            ? JSON.parse(po.related_sales_orders)
            : po.related_sales_orders
        } catch { continue }

        if (!Array.isArray(relatedList) || relatedList.length === 0) continue

        // 检查是否已经有 product_code
        if (relatedList.some(rel => rel.product_code)) {
          skippedCount++
          continue
        }

        // 解析采购商品
        let purchaseItems = []
        try {
          purchaseItems = typeof po.purchase_items === 'string'
            ? JSON.parse(po.purchase_items)
            : po.purchase_items
        } catch { }

        // 获取产品代码列表
        const productCodes = [...new Set(
          (purchaseItems || [])
            .map(item => item.product_code)
            .filter(Boolean)
        )]

        if (productCodes.length === 0) {
          skippedCount++
          continue
        }

        if (productCodes.length === 1) {
          // 只有一个产品：所有条目都添加该产品代码
          const updatedList = relatedList.map(rel => ({
            ...rel,
            product_code: productCodes[0]
          }))

          await connection.query(
            `UPDATE purchase_orders SET related_sales_orders = ? WHERE purchase_order_id = ?`,
            [JSON.stringify(updatedList), po.purchase_order_id]
          )
          updatedCount++
          console.log(`✓ Updated PO ${po.purchase_order_id}: added product_code=${productCodes[0]} to ${relatedList.length} entries`)
        } else {
          // 多个产品：无法自动确定，跳过
          skippedCount++
          console.log(`⚠ Skipped PO ${po.purchase_order_id}: has ${productCodes.length} products (${productCodes.join(', ')}), needs manual update`)
        }
      } catch (err) {
        errorCount++
        console.error(`✗ Error processing PO ${po.purchase_order_id}:`, err.message)
      }
    }

    console.log('\n--- Summary ---')
    console.log(`Updated: ${updatedCount}`)
    console.log(`Skipped: ${skippedCount}`)
    console.log(`Errors: ${errorCount}`)
    console.log('\nFor skipped POs with multiple products, please manually update related_sales_orders:')
    console.log('Format: [{"sales_order_id":"xxx", "quantity":100, "product_code":"A00001"}, ...]')

    console.log('\nMigration completed successfully!')
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
    console.error('Full error:', error)
    throw error
  } finally {
    if (connection) connection.release()
    await pool.end()
  }
}

async function down() {
  let connection = null
  try {
    console.log('Connecting to database...')
    connection = await pool.getConnection()
    console.log('Database connected successfully')

    // 移除 product_code 字段
    const [purchaseOrders] = await connection.query(`
      SELECT purchase_order_id, related_sales_orders
      FROM purchase_orders
      WHERE related_sales_orders IS NOT NULL AND related_sales_orders != '[]' AND related_sales_orders != 'null'
    `)

    let revertedCount = 0

    for (const po of purchaseOrders) {
      try {
        let relatedList = []
        try {
          relatedList = typeof po.related_sales_orders === 'string'
            ? JSON.parse(po.related_sales_orders)
            : po.related_sales_orders
        } catch { continue }

        if (!Array.isArray(relatedList) || relatedList.length === 0) continue

        // 检查是否有 product_code
        if (!relatedList.some(rel => rel.product_code)) continue

        // 移除 product_code 字段
        const revertedList = relatedList.map(({ product_code, ...rest }) => rest)

        await connection.query(
          `UPDATE purchase_orders SET related_sales_orders = ? WHERE purchase_order_id = ?`,
          [JSON.stringify(revertedList), po.purchase_order_id]
        )
        revertedCount++
      } catch (err) {
        console.error(`✗ Error reverting PO ${po.purchase_order_id}:`, err.message)
      }
    }

    console.log(`✓ Reverted ${revertedCount} purchase orders`)
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
  down()
    .then(() => { console.log('Done'); process.exit(0) })
    .catch((err) => { console.error('Failed:', err.message); process.exit(1) })
} else {
  up()
    .then(() => { console.log('Done'); process.exit(0) })
    .catch((err) => { console.error('Failed:', err.message); process.exit(1) })
}