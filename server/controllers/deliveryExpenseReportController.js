import pool from '../config/database.js'

export const getDeliveryExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate, orderNumber, contractNumber, productKeyword } = req.query

    // 构建出库单查询条件
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

    if (contractNumber) {
      conditions.push('do.contract_number LIKE ?')
      params.push(`%${contractNumber}%`)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 查询出库单
    const [deliveryOrders] = await pool.query(
      `SELECT do.delivery_order_id, do.order_number, do.contract_number,
              do.customer_name, do.delivery_items, do.delivery_time, do.total_amount,
              do.currency, do.delivery_person, do.contact_phone, do.remarks, do.expenses
       FROM delivery_orders do
       ${whereClause}
       ORDER BY do.delivery_time DESC, do.created_at DESC`,
      params
    )

    // 构建出库退货单查询条件
    const returnConditions = []
    const returnParams = []

    if (startDate) {
      returnConditions.push('oro.return_time >= ?')
      returnParams.push(startDate)
    }

    if (endDate) {
      returnConditions.push('oro.return_time <= ?')
      returnParams.push(endDate)
    }

    if (orderNumber) {
      returnConditions.push('oro.order_number LIKE ?')
      returnParams.push(`%${orderNumber}%`)
    }

    if (contractNumber) {
      returnConditions.push('oro.contract_number LIKE ?')
      returnParams.push(`%${contractNumber}%`)
    }

    const returnWhereClause = returnConditions.length > 0 ? 'WHERE ' + returnConditions.join(' AND ') : ''

    // 查询出库退货单
    const [outboundReturnOrders] = await pool.query(
      `SELECT oro.outbound_return_id, oro.order_number, oro.contract_number,
              oro.customer_name, oro.return_items, oro.return_time, oro.total_amount,
              oro.currency, oro.return_person, oro.reason, oro.remarks
       FROM outbound_return_orders oro
       ${returnWhereClause}
       ORDER BY oro.return_time DESC, oro.created_at DESC`,
      returnParams
    )

    // 收集所有销售合同编号，批量查询
    const contractNumbers = [...new Set([
      ...deliveryOrders.map(o => o.contract_number),
      ...outboundReturnOrders.map(o => o.contract_number)
    ].filter(Boolean))]

    let salesOrderMap = {}
    if (contractNumbers.length > 0) {
      const [salesOrders] = await pool.query(
        `SELECT contract_number, expenses FROM sales_orders WHERE contract_number IN (?)`,
        [contractNumbers]
      )
      for (const so of salesOrders) {
        salesOrderMap[so.contract_number] = so
      }
    }

    // 组装报表数据
    const reportRows = []

    // 处理出库单
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
      const salesOrder = order.contract_number ? salesOrderMap[order.contract_number] : null
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
      const handlingFee = parseFloat(salesExpenses.handlingFee) || 0
      const soOtherFee = parseFloat(salesExpenses.otherFee) || 0
      const salesExpenseSubtotal = soTransportationFee + handlingFee + soOtherFee

      // 每个商品生成一行
      for (let itemIndex = 0; itemIndex < filteredItems.length; itemIndex++) {
        const item = filteredItems[itemIndex]
        const quantity = parseFloat(item.quantity) || 0
        const taxIncludedPrice = parseFloat(item.tax_included_price) || 0
        const totalPrice = parseFloat(item.amount) || (quantity * taxIncludedPrice)

        reportRows.push({
          row_key: `${order.delivery_order_id}_${itemIndex}`,
          delivery_order_id: order.delivery_order_id,
          order_number: order.order_number,
          order_type: '出库',
          delivery_time: order.delivery_time,
          contract_number: order.contract_number || '',
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
          sales_handling_fee: handlingFee,
          sales_other_fee: soOtherFee,
          sales_expense_subtotal: salesExpenseSubtotal,
          // 费用合计
          total_expenses: deliveryExpenseSubtotal + salesExpenseSubtotal,
          // 出库人
          delivery_person: order.delivery_person || '',
        })
      }
    }

    // 处理出库退货单（数量为负）
    for (const order of outboundReturnOrders) {
      let returnItems = []
      try {
        returnItems = JSON.parse(order.return_items || '[]')
      } catch (e) {
        continue
      }

      // 商品关键字筛选
      let filteredItems = returnItems
      if (productKeyword) {
        const keyword = productKeyword.toLowerCase()
        filteredItems = returnItems.filter(item =>
          (item.product_name && item.product_name.toLowerCase().includes(keyword)) ||
          (item.product_code && item.product_code.toLowerCase().includes(keyword))
        )
      }

      if (filteredItems.length === 0) continue

      // 解析销售费用
      let salesExpenses = {}
      const salesOrder = order.contract_number ? salesOrderMap[order.contract_number] : null
      if (salesOrder) {
        try {
          salesExpenses = JSON.parse(salesOrder.expenses || '{}')
        } catch (e) {
          salesExpenses = {}
        }
      }

      // 销售费用
      const soTransportationFee = parseFloat(salesExpenses.transportationFee) || 0
      const handlingFee = parseFloat(salesExpenses.handlingFee) || 0
      const soOtherFee = parseFloat(salesExpenses.otherFee) || 0
      const salesExpenseSubtotal = soTransportationFee + handlingFee + soOtherFee

      // 每个商品生成一行（数量为负）
      for (let itemIndex = 0; itemIndex < filteredItems.length; itemIndex++) {
        const item = filteredItems[itemIndex]
        const quantity = -(parseFloat(item.quantity) || 0) // 负数
        const taxIncludedPrice = parseFloat(item.unit_price || item.tax_included_price) || 0
        const totalPrice = quantity * taxIncludedPrice

        reportRows.push({
          row_key: `return_${order.outbound_return_id}_${itemIndex}`,
          delivery_order_id: order.outbound_return_id,
          order_number: order.order_number,
          order_type: '出库退货',
          delivery_time: order.return_time,
          contract_number: order.contract_number || '',
          customer_name: order.customer_name || '',
          currency: order.currency || 'CNY',
          remarks: order.remarks || '',
          // 商品信息
          product_code: item.product_code || '',
          product_name: item.product_name || '',
          specification: item.specifications || item.specification || '',
          unit: item.unit || '',
          quantity,
          tax_included_price: taxIncludedPrice,
          total_price: Math.round(totalPrice * 100) / 100,
          // 出库费用（退货单无出库费用）
          express_delivery_fee: 0,
          transportation_fee: 0,
          customs_fee: 0,
          delivery_other_fee: 0,
          delivery_expense_subtotal: 0,
          // 销售费用
          sales_transportation_fee: soTransportationFee,
          sales_handling_fee: handlingFee,
          sales_other_fee: soOtherFee,
          sales_expense_subtotal: salesExpenseSubtotal,
          // 费用合计
          total_expenses: salesExpenseSubtotal,
          // 出库人
          delivery_person: order.return_person || '',
        })
      }
    }

    // 按时间排序
    reportRows.sort((a, b) => {
      const timeA = new Date(a.delivery_time || 0).getTime()
      const timeB = new Date(b.delivery_time || 0).getTime()
      return timeB - timeA
    })

    res.json({ success: true, data: reportRows })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
