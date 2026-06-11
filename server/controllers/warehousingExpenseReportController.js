import pool from '../config/database.js'

export const getWarehousingExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate, orderNumber, purchaseOrderNumber, productKeyword } = req.query

    // 构建查询条件
    const conditions = []
    const params = []

    if (startDate) {
      conditions.push('wo.warehousing_time >= ?')
      params.push(startDate + ' 00:00:00')
    }

    if (endDate) {
      conditions.push('wo.warehousing_time <= ?')
      params.push(endDate + ' 23:59:59')
    }

    if (orderNumber) {
      conditions.push('wo.order_number LIKE ?')
      params.push(`%${orderNumber}%`)
    }

    if (purchaseOrderNumber) {
      conditions.push('wo.purchase_order_number LIKE ?')
      params.push(`%${purchaseOrderNumber}%`)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 查询入库单
    const [warehousingOrders] = await pool.query(
      `SELECT wo.warehousing_order_id, wo.order_number, wo.purchase_order_number,
              wo.warehousing_items, wo.warehousing_time, wo.total_amount, wo.currency,
              wo.warehousing_person, wo.contact_phone, wo.remarks, wo.expenses
       FROM warehousing_orders wo
       ${whereClause}
       ORDER BY wo.warehousing_time DESC, wo.created_at DESC`,
      params
    )

    // 收集所有采购订单号，批量查询
    const purchaseOrderNumbers = [...new Set(
      warehousingOrders
        .map(o => o.purchase_order_number)
        .filter(Boolean)
    )]

    let purchaseOrderMap = {}
    if (purchaseOrderNumbers.length > 0) {
      const [purchaseOrders] = await pool.query(
        `SELECT order_number, expenses FROM purchase_orders WHERE order_number IN (?)`,
        [purchaseOrderNumbers]
      )
      for (const po of purchaseOrders) {
        purchaseOrderMap[po.order_number] = po
      }
    }

    // 组装报表数据
    const reportRows = []

    for (const order of warehousingOrders) {
      let warehousingItems = []
      try {
        warehousingItems = JSON.parse(order.warehousing_items || '[]')
      } catch (e) {
        continue
      }

      // 商品关键字筛选
      let filteredItems = warehousingItems
      if (productKeyword) {
        const keyword = productKeyword.toLowerCase()
        filteredItems = warehousingItems.filter(item =>
          (item.product_name && item.product_name.toLowerCase().includes(keyword)) ||
          (item.product_code && item.product_code.toLowerCase().includes(keyword))
        )
      }

      if (filteredItems.length === 0) continue

      // 解析入库费用
      let warehousingExpenses = {}
      try {
        warehousingExpenses = JSON.parse(order.expenses || '{}')
      } catch (e) {
        warehousingExpenses = {}
      }

      // 解析采购费用
      let purchaseExpenses = {}
      const purchaseOrder = order.purchase_order_number ? purchaseOrderMap[order.purchase_order_number] : null
      if (purchaseOrder) {
        try {
          purchaseExpenses = JSON.parse(purchaseOrder.expenses || '{}')
        } catch (e) {
          purchaseExpenses = {}
        }
      }

      // 入库费用
      const expressDeliveryFee = parseFloat(warehousingExpenses.expressDeliveryFee) || 0
      const whTransportationFee = parseFloat(warehousingExpenses.transportationFee) || 0
      const customsFee = parseFloat(warehousingExpenses.customsFee) || 0
      const whOtherFee = parseFloat(warehousingExpenses.otherFee) || 0
      const warehousingExpenseSubtotal = expressDeliveryFee + whTransportationFee + customsFee + whOtherFee

      // 采购费用
      const poTransportationFee = parseFloat(purchaseExpenses.transportationFee) || 0
      const entertainmentFee = parseFloat(purchaseExpenses.entertainmentFee) || 0
      const giftFee = parseFloat(purchaseExpenses.giftFee) || 0
      const poOtherFee = parseFloat(purchaseExpenses.otherFee) || 0
      const purchaseExpenseSubtotal = poTransportationFee + entertainmentFee + giftFee + poOtherFee

      // 每个商品生成一行
      for (const item of filteredItems) {
        const quantity = parseFloat(item.quantity) || 0
        const taxIncludedPrice = parseFloat(item.tax_included_price) || 0
        const totalPrice = parseFloat(item.total_price) || (quantity * taxIncludedPrice)

        reportRows.push({
          warehousing_order_id: order.warehousing_order_id,
          order_number: order.order_number,
          warehousing_time: order.warehousing_time,
          purchase_order_number: order.purchase_order_number || '',
          currency: order.currency || 'CNY',
          remarks: order.remarks || '',
          // 商品信息
          product_code: item.product_code || '',
          product_name: item.product_name || '',
          model: item.model || '',
          unit: item.unit || '',
          quantity,
          tax_included_price: taxIncludedPrice,
          total_price: Math.round(totalPrice * 100) / 100,
          // 入库费用
          express_delivery_fee: expressDeliveryFee,
          transportation_fee: whTransportationFee,
          customs_fee: customsFee,
          warehousing_other_fee: whOtherFee,
          warehousing_expense_subtotal: warehousingExpenseSubtotal,
          // 采购费用
          purchase_transportation_fee: poTransportationFee,
          purchase_entertainment_fee: entertainmentFee,
          purchase_gift_fee: giftFee,
          purchase_other_fee: poOtherFee,
          purchase_expense_subtotal: purchaseExpenseSubtotal,
          // 费用合计
          total_expenses: warehousingExpenseSubtotal + purchaseExpenseSubtotal,
          // 入库人
          warehousing_person: order.warehousing_person || '',
        })
      }
    }

    res.json({ success: true, data: reportRows })
  } catch (error) {
    console.error('Warehousing expense report error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}
