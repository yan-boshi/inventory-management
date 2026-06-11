import pool from '../config/database.js'

export const getInventoryReport = async (req, res) => {
  try {
    const { year, month } = req.query

    if (!year) {
      return res.status(400).json({ success: false, message: '请选择查询年份' })
    }

    // 确定查询时间范围
    let startDate, endDate
    if (month) {
      const m = parseInt(month)
      const lastDay = new Date(parseInt(year), m, 0).getDate()
      startDate = `${year}-${String(m).padStart(2, '0')}-01 00:00:00`
      endDate = `${year}-${String(m).padStart(2, '0')}-${lastDay} 23:59:59`
    } else {
      startDate = `${year}-01-01 00:00:00`
      endDate = `${year}-12-31 23:59:59`
    }

    // 查询所有产品
    const [products] = await pool.query(
      'SELECT product_id, product_name, product_code, model, unit, stock, tax_included_price, tax_excluded_price FROM products ORDER BY product_name'
    )

    // 查询时间范围内的所有入库单
    const [warehousingOrders] = await pool.query(
      'SELECT warehousing_items FROM warehousing_orders WHERE warehousing_time BETWEEN ? AND ?',
      [startDate, endDate]
    )

    // 查询时间范围内的所有出库单
    const [deliveryOrders] = await pool.query(
      'SELECT delivery_items FROM delivery_orders WHERE delivery_time BETWEEN ? AND ?',
      [startDate, endDate]
    )

    // 汇总每个产品的入库数量
    const inboundMap = {}
    for (const order of warehousingOrders) {
      try {
        const items = JSON.parse(order.warehousing_items || '[]')
        for (const item of items) {
          const code = item.product_code
          if (!code) continue
          inboundMap[code] = (inboundMap[code] || 0) + (parseFloat(item.quantity) || 0)
        }
      } catch (e) {
        // skip malformed items
      }
    }

    // 汇总每个产品的出库数量
    const outboundMap = {}
    for (const order of deliveryOrders) {
      try {
        const items = JSON.parse(order.delivery_items || '[]')
        for (const item of items) {
          const code = item.product_code
          if (!code) continue
          outboundMap[code] = (outboundMap[code] || 0) + (parseFloat(item.quantity) || 0)
        }
      } catch (e) {
        // skip malformed items
      }
    }

    // 查询时间范围之前的所有入库单（用于计算期初库存）
    const [allWarehousingOrdersBefore] = await pool.query(
      'SELECT warehousing_items FROM warehousing_orders WHERE warehousing_time < ?',
      [startDate]
    )

    // 查询时间范围之前的所有出库单（用于计算期初库存）
    const [allDeliveryOrdersBefore] = await pool.query(
      'SELECT delivery_items FROM delivery_orders WHERE delivery_time < ?',
      [startDate]
    )

    // 汇总时间范围之前的入库数量
    const inboundBeforeMap = {}
    for (const order of allWarehousingOrdersBefore) {
      try {
        const items = JSON.parse(order.warehousing_items || '[]')
        for (const item of items) {
          const code = item.product_code
          if (!code) continue
          inboundBeforeMap[code] = (inboundBeforeMap[code] || 0) + (parseFloat(item.quantity) || 0)
        }
      } catch (e) {
        // skip malformed items
      }
    }

    // 汇总时间范围之前的出库数量
    const outboundBeforeMap = {}
    for (const order of allDeliveryOrdersBefore) {
      try {
        const items = JSON.parse(order.delivery_items || '[]')
        for (const item of items) {
          const code = item.product_code
          if (!code) continue
          outboundBeforeMap[code] = (outboundBeforeMap[code] || 0) + (parseFloat(item.quantity) || 0)
        }
      } catch (e) {
        // skip malformed items
      }
    }

    // 生成报表数据
    const report = products.map(product => {
      const currentStock = parseFloat(product.stock) || 0
      const totalInboundBefore = inboundBeforeMap[product.product_code] || 0
      const totalOutboundBefore = outboundBeforeMap[product.product_code] || 0
      // 期初库存 = 当前总库存 - 期间之前的入库 + 期间之前的出库
      // 即：期初库存 = 当前库存 - (总入库 - 期初后入库) + (总出库 - 期初后出库)
      // 简化：期初库存 = 当前库存 - 期间入库总量(全部) + 期间出库总量(全部)
      // 但实际上：期初库存 = 当前库存 - 期间入库 + 期间出库
      // 当前库存 = 期初库存 + 期间入库 - 期间出库
      // 期初库存 = 当前库存 - 期间入库 + 期间出库
      const inbound = inboundMap[product.product_code] || 0
      const outbound = outboundMap[product.product_code] || 0
      const openingStock = currentStock - inbound + outbound
      const closingStock = currentStock
      const taxIncludedPrice = parseFloat(product.tax_included_price) || 0
      const taxExcludedPrice = parseFloat(product.tax_excluded_price) || 0

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        product_code: product.product_code,
        model: product.model || '',
        unit: product.unit || '',
        opening_stock: Math.round(openingStock * 10000) / 10000,
        inbound_quantity: Math.round(inbound * 10000) / 10000,
        outbound_quantity: Math.round(outbound * 10000) / 10000,
        closing_stock: Math.round(closingStock * 10000) / 10000,
        tax_included_price: taxIncludedPrice,
        tax_excluded_price: taxExcludedPrice,
        tax_included_amount: Math.round(closingStock * taxIncludedPrice * 100) / 100,
        tax_excluded_amount: Math.round(closingStock * taxExcludedPrice * 100) / 100,
      }
    })

    res.json({ success: true, data: report })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
