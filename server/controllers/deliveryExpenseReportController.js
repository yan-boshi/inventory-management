import pool from '../config/database.js'

export const getDeliveryExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate, orderNumber, salesOrderNumber, productKeyword } = req.query

    // 构建查询条件
    const conditions = []
    const params = []

    if (startDate) {
      conditions.push('do.delivery_time >= ?')
      params.push(startDate + ' 00:00:00')
    }

    if (endDate) {
      conditions.push('do.delivery_time <= ?')
      params.push(endDate + ' 23:59:59')
    }

    if (orderNumber) {
      conditions.push('do.order_number LIKE ?')
      params.push(`%${orderNumber}%`)
    }

    if (salesOrderNumber) {
      conditions.push('do.sales_order_number LIKE ?')
      params.push(`%${salesOrderNumber}%`)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 查询出库单
    const [deliveryOrders] = await pool.query(
      `SELECT do.delivery_order_id, do.order_number, do.sales_order_number,
              do.customer_name, do.delivery_items, do.delivery_time, do.total_amount,
              do.currency, do.delivery_person, do.contact_phone, do.remarks, do.expenses
       FROM delivery_orders do
       ${whereClause}
       ORDER BY do.delivery_time DESC, do.created_at DESC`,
      params
    )

    // 收集所有销售订单号，批量查询
    const salesOrderNumbers = [...new Set(
      deliveryOrders
        .map(o => o.sales_order_number)
        .filter(Boolean)
    )]

    let salesOrderMap = {}
    if (salesOrderNumbers.length > 0) {
      const [salesOrders] = await pool.query(
        `SELECT order_number, expenses FROM sales_orders WHERE order_number IN (?)`,
        [salesOrderNumbers]
      )
      for (const so of salesOrders) {
        salesOrderMap[so.order_number] = so
      }
    }

    // 组装报表数据
    const reportRows = []

    for (const order of deliveryOrders) {
      let deliveryItems = []
      try {
        deliveryItems = JSON.parse(order.delivery_items || '[]')
      } catch (e) {
        continue
      }

      // 商品关键字筛选
      let filteredItems = deliveryItems
      if (productKeyword) {
        const keyword = productKeyword.toLowerCase()
        filteredItems = deliveryItems.filter(item =>
          (item.product_name && item.product_name.toLowerCase().includes(keyword)) ||
          (item.product_code && item.product_code.toLowerCase().includes(keyword))
        )
      }

      if (filteredItems.length === 0) continue

      // 解析出库费用
      let deliveryExpenses = {}
      try {
        deliveryExpenses = JSON.parse(order.expenses || '{}')
      } catch (e) {
        deliveryExpenses = {}
      }

      // 解析销售费用
      let salesExpenses = {}
      const salesOrder = order.sales_order_number ? salesOrderMap[order.sales_order_number] : null
      if (salesOrder) {
        try {
          salesExpenses = JSON.parse(salesOrder.expenses || '{}')
        } catch (e) {
          salesExpenses = {}
        }
      }

      // 出库费用
      const expressDeliveryFee = parseFloat(deliveryExpenses.expressDeliveryFee) || 0
      const dlTransportationFee = parseFloat(deliveryExpenses.transportationFee) || 0
      const customsFee = parseFloat(deliveryExpenses.customsFee) || 0
      const dlOtherFee = parseFloat(deliveryExpenses.otherFee) || 0
      const deliveryExpenseSubtotal = expressDeliveryFee + dlTransportationFee + customsFee + dlOtherFee

      // 销售费用
      const soTransportationFee = parseFloat(salesExpenses.transportationFee) || 0
      const entertainmentFee = parseFloat(salesExpenses.entertainmentFee) || 0
      const giftFee = parseFloat(salesExpenses.giftFee) || 0
      const soOtherFee = parseFloat(salesExpenses.otherFee) || 0
      const salesExpenseSubtotal = soTransportationFee + entertainmentFee + giftFee + soOtherFee

      // 每个商品生成一行
      for (const item of filteredItems) {
        const quantity = parseFloat(item.quantity) || 0
        const taxIncludedPrice = parseFloat(item.tax_included_price) || 0
        const totalPrice = parseFloat(item.amount) || (quantity * taxIncludedPrice)

        reportRows.push({
          delivery_order_id: order.delivery_order_id,
          order_number: order.order_number,
          delivery_time: order.delivery_time,
          sales_order_number: order.sales_order_number || '',
          customer_name: order.customer_name || '',
          currency: order.currency || 'CNY',
          remarks: order.remarks || '',
          // 商品信息
          product_code: item.product_code || '',
          product_name: item.product_name || '',
          specification: item.specification || '',
          unit: item.unit || '',
          quantity,
          tax_included_price: taxIncludedPrice,
          total_price: Math.round(totalPrice * 100) / 100,
          // 出库费用
          express_delivery_fee: expressDeliveryFee,
          transportation_fee: dlTransportationFee,
          customs_fee: customsFee,
          delivery_other_fee: dlOtherFee,
          delivery_expense_subtotal: deliveryExpenseSubtotal,
          // 销售费用
          sales_transportation_fee: soTransportationFee,
          sales_entertainment_fee: entertainmentFee,
          sales_gift_fee: giftFee,
          sales_other_fee: soOtherFee,
          sales_expense_subtotal: salesExpenseSubtotal,
          // 费用合计
          total_expenses: deliveryExpenseSubtotal + salesExpenseSubtotal,
          // 出库人
          delivery_person: order.delivery_person || '',
        })
      }
    }

    res.json({ success: true, data: reportRows })
  } catch (error) {
    console.error('Delivery expense report error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}
