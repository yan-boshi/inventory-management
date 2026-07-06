import pool from '../config/database.js'

export const getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate, contractNumber, customerName, productCode, page = 1, pageSize = 50 } = req.query

    // 构建查询条件
    const conditions = []
    const params = []

    if (startDate) {
      conditions.push('do.entry_date >= ?')
      params.push(startDate)
    }

    if (endDate) {
      conditions.push('do.entry_date <= ?')
      params.push(endDate)
    }

    if (contractNumber) {
      conditions.push('do.contract_number LIKE ?')
      params.push(`%${contractNumber}%`)
    }

    if (customerName) {
      conditions.push('do.customer_name LIKE ?')
      params.push(`%${customerName}%`)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 查询总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM delivery_orders do ${whereClause}`,
      params
    )
    const total = countResult[0]?.total || 0

    // 查询出库单（分页）
    const validPage = Math.max(1, parseInt(page) || 1)
    const validPageSize = Math.min(500, Math.max(1, parseInt(pageSize) || 50))
    const offset = (validPage - 1) * validPageSize

    const [deliveryOrders] = await pool.query(
      `SELECT do.delivery_order_id, do.order_number, do.contract_number,
              do.customer_name, do.delivery_items, do.delivery_date, do.entry_date,
              do.total_amount, do.currency, do.expenses, do.remarks
       FROM delivery_orders do
       ${whereClause}
       ORDER BY do.entry_date DESC, do.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, validPageSize, offset]
    )

    if (deliveryOrders.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: validPage, pageSize: validPageSize, totalPages: 0 }
      })
    }

    // 收集销售合同编号，批量查询销售订单
    const contractNumbers = [...new Set(
      deliveryOrders.map(o => o.contract_number).filter(Boolean)
    )]

    let salesOrderMap = {}
    if (contractNumbers.length > 0) {
      const [salesOrders] = await pool.query(
        `SELECT sales_order_id, contract_number, customer_name, payment_method,
                sales_person, sales_items, expenses
         FROM sales_orders WHERE contract_number IN (?)`,
        [contractNumbers]
      )
      for (const so of salesOrders) {
        salesOrderMap[so.contract_number] = so
      }
    }

    // 收集销售订单ID，批量查询采购订单
    const salesOrderIds = Object.values(salesOrderMap).map(so => so.sales_order_id).filter(Boolean)

    let purchaseOrderMap = {} // sales_order_id -> [purchase_orders]
    if (salesOrderIds.length > 0) {
      const [purchaseOrders] = await pool.query(
        `SELECT purchase_order_id, order_number, contract_number, purchase_person,
                purchase_items, expenses, related_sales_order_id
         FROM purchase_orders WHERE related_sales_order_id IN (?)`,
        [salesOrderIds]
      )
      for (const po of purchaseOrders) {
        const soId = po.related_sales_order_id
        if (!purchaseOrderMap[soId]) purchaseOrderMap[soId] = []
        purchaseOrderMap[soId].push(po)
      }
    }

    // 收集采购合同编号，批量查询入库单
    const purchaseContractNumbers = [...new Set(
      Object.values(purchaseOrderMap).flat().map(po => po.contract_number).filter(Boolean)
    )]

    let warehousingOrderMap = {} // contract_number -> [warehousing_orders]
    if (purchaseContractNumbers.length > 0) {
      const [warehousingOrders] = await pool.query(
        `SELECT warehousing_order_id, contract_number, warehousing_items,
                entry_date, expenses
         FROM warehousing_orders WHERE contract_number IN (?)`,
        [purchaseContractNumbers]
      )
      for (const wo of warehousingOrders) {
        const cn = wo.contract_number
        if (!warehousingOrderMap[cn]) warehousingOrderMap[cn] = []
        warehousingOrderMap[cn].push(wo)
      }
    }

    // 收集产品代码，批量查询产品信息（用于兜底成本和分类）
    const allProductCodes = new Set()
    for (const order of deliveryOrders) {
      try {
        const items = JSON.parse(order.delivery_items || '[]')
        for (const item of items) {
          if (item.product_code) allProductCodes.add(item.product_code)
        }
      } catch (e) { /* ignore */ }
    }

    let productMap = {}
    if (allProductCodes.size > 0) {
      const [products] = await pool.query(
        `SELECT product_code, product_name, model, description, unit,
                tax_excluded_price, product_classification
         FROM products WHERE product_code IN (?)`,
        [Array.from(allProductCodes)]
      )
      for (const p of products) {
        productMap[p.product_code] = p
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

      // 商品代码筛选
      let filteredItems = deliveryItems
      if (productCode) {
        const keyword = productCode.toLowerCase()
        filteredItems = deliveryItems.filter(item =>
          item.product_code && item.product_code.toLowerCase().includes(keyword)
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

      // 获取销售订单
      const salesOrder = order.contract_number ? salesOrderMap[order.contract_number] : null

      // 解析销售费用
      let salesExpenses = {}
      if (salesOrder) {
        try {
          salesExpenses = JSON.parse(salesOrder.expenses || '{}')
        } catch (e) {
          salesExpenses = {}
        }
      }

      // 获取采购订单（可能有多个）
      const purchaseOrders = salesOrder ? (purchaseOrderMap[salesOrder.sales_order_id] || []) : []

      // 解析销售订单商品行（用于获取结算状态）
      let salesItems = []
      if (salesOrder) {
        try {
          salesItems = JSON.parse(salesOrder.sales_items || '[]')
        } catch (e) {
          salesItems = []
        }
      }

      // 计算出库单总金额（用于费用分摊）
      const orderTotalAmount = filteredItems.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0
        const price = parseFloat(item.tax_included_price) || 0
        const amount = parseFloat(item.amount) || (qty * price)
        return sum + amount
      }, 0) || 1 // 避免除以0

      // 出库费用总额
      const dlExpressFee = parseFloat(deliveryExpenses.expressDeliveryFee) || 0
      const dlTransportationFee = parseFloat(deliveryExpenses.transportationFee) || 0
      const dlCustomsFee = parseFloat(deliveryExpenses.customsFee) || 0
      const dlOtherFee = parseFloat(deliveryExpenses.otherFee) || 0
      const deliveryExpenseTotal = dlExpressFee + dlTransportationFee + dlCustomsFee + dlOtherFee

      // 销售费用总额
      const slTransportationFee = parseFloat(salesExpenses.transportationFee) || 0
      const slHandlingFee = parseFloat(salesExpenses.handlingFee) || 0
      const slOtherFee = parseFloat(salesExpenses.otherFee) || 0
      const salesExpenseTotal = slTransportationFee + slHandlingFee + slOtherFee

      // 汇总所有采购订单的费用和入库数据
      let purchaseExpenseTotal = 0
      let poTransportationFee = 0
      let poOperatingExpenses = 0
      let poValueAddedTax = 0
      let poHandlingFee = 0
      let poOtherFee = 0

      for (const po of purchaseOrders) {
        let poExpenses = {}
        try {
          poExpenses = JSON.parse(po.expenses || '{}')
        } catch (e) {
          poExpenses = {}
        }
        poTransportationFee += parseFloat(poExpenses.transportationFee) || 0
        poOperatingExpenses += parseFloat(poExpenses.operatingExpenses) || 0
        poValueAddedTax += parseFloat(poExpenses.valueAddedTax) || 0
        poHandlingFee += parseFloat(poExpenses.handlingFee) || 0
        poOtherFee += parseFloat(poExpenses.otherFee) || 0
      }
      purchaseExpenseTotal = poTransportationFee + poOperatingExpenses + poValueAddedTax + poHandlingFee + poOtherFee

      // 获取入库数据
      let warehousingExpensesTotal = { tariff: 0, transportationFee: 0, customsFee: 0, otherFee: 0 }
      let warehousingItemMap = {} // product_code -> { quantity, tax_included_price, entry_date }
      let warehousingDate = null

      for (const po of purchaseOrders) {
        const woList = po.contract_number ? (warehousingOrderMap[po.contract_number] || []) : []
        for (const wo of woList) {
          // 入库费用
          let woExpenses = {}
          try {
            woExpenses = JSON.parse(wo.expenses || '{}')
          } catch (e) {
            woExpenses = {}
          }
          warehousingExpensesTotal.tariff += parseFloat(woExpenses.tariff) || 0
          warehousingExpensesTotal.transportationFee += parseFloat(woExpenses.transportationFee) || 0
          warehousingExpensesTotal.customsFee += parseFloat(woExpenses.customsFee) || 0
          warehousingExpensesTotal.otherFee += parseFloat(woExpenses.otherFee) || 0

          if (wo.entry_date && !warehousingDate) {
            warehousingDate = wo.entry_date
          }

          // 入库商品
          let woItems = []
          try {
            woItems = JSON.parse(wo.warehousing_items || '[]')
          } catch (e) {
            woItems = []
          }
          for (const wi of woItems) {
            const code = wi.product_code
            if (!code) continue
            if (!warehousingItemMap[code]) {
              warehousingItemMap[code] = { quantity: 0, total_price: 0, tax_included_price: 0 }
            }
            const wiQty = parseFloat(wi.quantity) || 0
            const wiPrice = parseFloat(wi.tax_included_price) || 0
            warehousingItemMap[code].quantity += wiQty
            warehousingItemMap[code].total_price += parseFloat(wi.total_price) || (wiQty * wiPrice)
            warehousingItemMap[code].tax_included_price = wiPrice // 取最后一次的单价
          }
        }
      }

      const warehousingExpenseTotal = warehousingExpensesTotal.tariff +
        warehousingExpensesTotal.transportationFee +
        warehousingExpensesTotal.customsFee +
        warehousingExpensesTotal.otherFee

      // 每个商品生成一行
      for (const item of filteredItems) {
        const productCode = item.product_code || ''
        const quantity = parseFloat(item.quantity) || 0
        const taxIncludedPrice = parseFloat(item.tax_included_price) || 0
        const amount = parseFloat(item.amount) || (quantity * taxIncludedPrice)
        const taxRate = 13 // 默认税率
        const unitPriceExcluded = taxIncludedPrice / (1 + taxRate / 100)
        const amountExcluded = quantity * unitPriceExcluded

        // 匹配销售商品行获取结算信息
        const matchedSalesItem = salesItems.find(si => si.product_code === productCode)
        const settlementStatus = matchedSalesItem?.settlement_status || '未结算'
        const settlementDate = matchedSalesItem?.settlement_date || null

        // 匹配入库数据
        const whItem = warehousingItemMap[productCode]
        const hasWarehousing = whItem && whItem.quantity > 0

        let warehousingQuantity = 0
        let warehousingUnitPriceExcluded = 0
        let warehousingAmount = 0

        if (hasWarehousing) {
          warehousingQuantity = whItem.quantity
          warehousingUnitPriceExcluded = (whItem.tax_included_price || 0) / (1 + taxRate / 100)
          warehousingAmount = whItem.total_price / (1 + taxRate / 100)
        } else {
          // 兜底：使用产品表的移动平均未税单价
          const product = productMap[productCode]
          if (product) {
            warehousingQuantity = quantity
            warehousingUnitPriceExcluded = parseFloat(product.tax_excluded_price) || 0
            warehousingAmount = quantity * warehousingUnitPriceExcluded
          }
        }

        // 费用分摊（按金额比例）
        const itemRatio = orderTotalAmount > 0 ? amount / orderTotalAmount : 0

        // 采购合同编号和采购员（取第一个采购订单的）
        const firstPO = purchaseOrders[0]
        const purchaseContractNumber = firstPO?.contract_number || ''
        const purchasePerson = firstPO?.purchase_person || ''

        // 产品信息
        const product = productMap[productCode]
        let classification = ''
        if (product?.product_classification) {
          try {
            const cls = JSON.parse(product.product_classification)
            classification = cls.classification_name || product.product_classification || ''
          } catch {
            classification = product.product_classification || ''
          }
        }
        const description = product?.description || ''

        // 毛利 = 出库额(未税) - 入库金额 - 入库费用中的关税
        const tariffPerItem = hasWarehousing
          ? warehousingExpensesTotal.tariff * itemRatio
          : 0
        const grossProfit = amountExcluded - warehousingAmount - tariffPerItem

        reportRows.push({
          // 出货信息
          delivery_date: order.entry_date || order.delivery_date || '',
          settlement_status: settlementStatus,
          settlement_date: settlementDate,
          sales_contract_number: order.contract_number || '',
          sales_person: salesOrder?.sales_person || '',
          customer_name: order.customer_name || salesOrder?.customer_name || '',
          payment_method: salesOrder?.payment_method || '',
          classification: classification,
          // 商品信息
          product_name: item.product_name || '',
          product_code: productCode,
          model: item.model || '',
          description: description,
          unit: item.unit || '',
          delivery_quantity: quantity,
          // 销售信息
          unit_price: taxIncludedPrice,
          sales_amount_included: Math.round(amount * 100) / 100,
          unit_price_excluded: Math.round(unitPriceExcluded * 10000) / 10000,
          sales_amount_excluded: Math.round(amountExcluded * 100) / 100,
          // 采购信息
          purchase_contract_number: purchaseContractNumber,
          purchase_person: purchasePerson,
          warehousing_date: warehousingDate || '',
          warehousing_quantity: warehousingQuantity,
          warehousing_unit_price_excluded: Math.round(warehousingUnitPriceExcluded * 10000) / 10000,
          warehousing_amount: Math.round(warehousingAmount * 100) / 100,
          // 采购费用明细
          po_expense_transportation: Math.round(poTransportationFee * itemRatio * 100) / 100,
          po_expense_operating: Math.round(poOperatingExpenses * itemRatio * 100) / 100,
          po_expense_vat: Math.round(poValueAddedTax * itemRatio * 100) / 100,
          po_expense_handling: Math.round(poHandlingFee * itemRatio * 100) / 100,
          po_expense_other: Math.round(poOtherFee * itemRatio * 100) / 100,
          po_expense_total: Math.round(purchaseExpenseTotal * itemRatio * 100) / 100,
          // 销售费用明细
          sl_expense_transportation: Math.round(slTransportationFee * itemRatio * 100) / 100,
          sl_expense_handling: Math.round(slHandlingFee * itemRatio * 100) / 100,
          sl_expense_other: Math.round(slOtherFee * itemRatio * 100) / 100,
          sl_expense_total: Math.round(salesExpenseTotal * itemRatio * 100) / 100,
          // 入库费用明细
          wh_expense_tariff: Math.round(warehousingExpensesTotal.tariff * itemRatio * 100) / 100,
          wh_expense_transportation: Math.round(warehousingExpensesTotal.transportationFee * itemRatio * 100) / 100,
          wh_expense_customs: Math.round(warehousingExpensesTotal.customsFee * itemRatio * 100) / 100,
          wh_expense_other: Math.round(warehousingExpensesTotal.otherFee * itemRatio * 100) / 100,
          wh_expense_total: Math.round(warehousingExpenseTotal * itemRatio * 100) / 100,
          // 出库费用明细
          dl_expense_express: Math.round(dlExpressFee * itemRatio * 100) / 100,
          dl_expense_transportation: Math.round(dlTransportationFee * itemRatio * 100) / 100,
          dl_expense_customs: Math.round(dlCustomsFee * itemRatio * 100) / 100,
          dl_expense_other: Math.round(dlOtherFee * itemRatio * 100) / 100,
          dl_expense_total: Math.round(deliveryExpenseTotal * itemRatio * 100) / 100,
          // 毛利
          gross_profit: Math.round(grossProfit * 100) / 100,
          // 预留字段
          commission_rate: null,
          commission_amount: null,
          remarks: order.remarks || '',
        })
      }
    }

    const totalPages = Math.ceil(total / validPageSize)

    res.json({
      success: true,
      data: reportRows,
      pagination: {
        total,
        page: validPage,
        pageSize: validPageSize,
        totalPages
      }
    })
  } catch (error) {
    console.error('毛利表查询失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}
