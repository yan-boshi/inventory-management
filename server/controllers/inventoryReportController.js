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

    // 查询时间范围内的所有入库退货单
    const [inboundReturnOrders] = await pool.query(
      'SELECT return_items FROM inbound_return_orders WHERE return_time BETWEEN ? AND ?',
      [startDate, endDate]
    )

    // 查询时间范围内的所有出库退货单
    const [outboundReturnOrders] = await pool.query(
      'SELECT return_items FROM outbound_return_orders WHERE return_time BETWEEN ? AND ?',
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

    // 汇总每个产品的入库退货数量
    const inboundReturnMap = {}
    for (const order of inboundReturnOrders) {
      try {
        const items = JSON.parse(order.return_items || '[]')
        for (const item of items) {
          const code = item.product_code
          if (!code) continue
          inboundReturnMap[code] = (inboundReturnMap[code] || 0) + (parseFloat(item.quantity) || 0)
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

    // 汇总每个产品的出库退货数量
    const outboundReturnMap = {}
    for (const order of outboundReturnOrders) {
      try {
        const items = JSON.parse(order.return_items || '[]')
        for (const item of items) {
          const code = item.product_code
          if (!code) continue
          outboundReturnMap[code] = (outboundReturnMap[code] || 0) + (parseFloat(item.quantity) || 0)
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

    // 查询时间范围之前的所有入库退货单（用于计算期初库存）
    const [allInboundReturnOrdersBefore] = await pool.query(
      'SELECT return_items FROM inbound_return_orders WHERE return_time < ?',
      [startDate]
    )

    // 查询时间范围之前的所有出库退货单（用于计算期初库存）
    const [allOutboundReturnOrdersBefore] = await pool.query(
      'SELECT return_items FROM outbound_return_orders WHERE return_time < ?',
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

    // 汇总时间范围之前的入库退货数量
    const inboundReturnBeforeMap = {}
    for (const order of allInboundReturnOrdersBefore) {
      try {
        const items = JSON.parse(order.return_items || '[]')
        for (const item of items) {
          const code = item.product_code
          if (!code) continue
          inboundReturnBeforeMap[code] = (inboundReturnBeforeMap[code] || 0) + (parseFloat(item.quantity) || 0)
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

    // 汇总时间范围之前的出库退货数量
    const outboundReturnBeforeMap = {}
    for (const order of allOutboundReturnOrdersBefore) {
      try {
        const items = JSON.parse(order.return_items || '[]')
        for (const item of items) {
          const code = item.product_code
          if (!code) continue
          outboundReturnBeforeMap[code] = (outboundReturnBeforeMap[code] || 0) + (parseFloat(item.quantity) || 0)
        }
      } catch (e) {
        // skip malformed items
      }
    }

    // 生成报表数据
    const report = products.map(product => {
      const code = product.product_code
      // 本期入库 = 入库 - 入库退货
      const inbound = (inboundMap[code] || 0) - (inboundReturnMap[code] || 0)
      // 本期出库 = 出库 - 出库退货
      const outbound = (outboundMap[code] || 0) - (outboundReturnMap[code] || 0)
      // 期初库存 = (之前入库 - 之前入库退货) - (之前出库 - 之前出库退货)
      const inboundBefore = (inboundBeforeMap[code] || 0) - (inboundReturnBeforeMap[code] || 0)
      const outboundBefore = (outboundBeforeMap[code] || 0) - (outboundReturnBeforeMap[code] || 0)
      const openingStock = inboundBefore - outboundBefore
      // 期末库存 = 期初 + 期间入库 - 期间出库
      const closingStock = openingStock + inbound - outbound
      const taxIncludedPrice = parseFloat(product.tax_included_price) || 0
      // 如果未税单价为空，则根据含税单价和默认税率(13%)计算
      const taxExcludedPrice = parseFloat(product.tax_excluded_price) || (taxIncludedPrice > 0 ? Math.round(taxIncludedPrice / 1.13 * 10000) / 10000 : 0)

      // 计算各项目的金额
      const openingStockIncludedAmount = Math.round(openingStock * taxIncludedPrice * 100) / 100
      const openingStockExcludedAmount = Math.round(openingStock * taxExcludedPrice * 100) / 100
      const inboundIncludedAmount = Math.round(inbound * taxIncludedPrice * 100) / 100
      const inboundExcludedAmount = Math.round(inbound * taxExcludedPrice * 100) / 100
      const outboundIncludedAmount = Math.round(outbound * taxIncludedPrice * 100) / 100
      const outboundExcludedAmount = Math.round(outbound * taxExcludedPrice * 100) / 100
      const closingIncludedAmount = Math.round(closingStock * taxIncludedPrice * 100) / 100
      const closingExcludedAmount = Math.round(closingStock * taxExcludedPrice * 100) / 100

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        product_code: product.product_code,
        model: product.model || '',
        unit: product.unit || '',
        // 期初
        opening_stock: Math.round(openingStock * 10000) / 10000,
        opening_stock_included_price: taxIncludedPrice,
        opening_stock_excluded_price: taxExcludedPrice,
        opening_stock_included_amount: openingStockIncludedAmount,
        opening_stock_excluded_amount: openingStockExcludedAmount,
        // 本期入库
        inbound_quantity: Math.round(inbound * 10000) / 10000,
        inbound_included_price: taxIncludedPrice,
        inbound_excluded_price: taxExcludedPrice,
        inbound_included_amount: inboundIncludedAmount,
        inbound_excluded_amount: inboundExcludedAmount,
        // 本期出库
        outbound_quantity: Math.round(outbound * 10000) / 10000,
        outbound_included_price: taxIncludedPrice,
        outbound_excluded_price: taxExcludedPrice,
        outbound_included_amount: outboundIncludedAmount,
        outbound_excluded_amount: outboundExcludedAmount,
        // 结余（期末）
        closing_stock: Math.round(closingStock * 10000) / 10000,
        closing_stock_included_price: taxIncludedPrice,
        closing_stock_excluded_price: taxExcludedPrice,
        closing_stock_included_amount: closingIncludedAmount,
        closing_stock_excluded_amount: closingExcludedAmount,
      }
    })

    res.json({ success: true, data: report })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
