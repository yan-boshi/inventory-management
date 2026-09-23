import pool from '../config/database.js'

/**
 * 毛利表Controller - 严格按照规划文档实现
 * 核心公式：毛利 = 销售收入(未税) - 采购成本(未税) - 费用合计
 */

// 格式化日期为 YYYY-MM-DD 字符串
function formatDateStr(date) {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取周一日期字符串
function getMondayStr(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  return formatDateStr(monday)
}

// 获取月份第一天日期字符串（用于匹配 effective_month）
function getMonthStr(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  // effective_month 存储的是月份第一天，如 '2026-09-01'
  return `${year}-${month}-01`
}

export const getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate, contractNumber, customerName, productCode, page = 1, pageSize = 50 } = req.query

    // 构建查询条件
    const conditions = []
    const params = []

    // 过滤掉委外加工单（合同编号以Owork开头）
    conditions.push('(do.contract_number IS NULL OR do.contract_number NOT LIKE ?)')
    params.push('Owork%')

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
              do.total_amount, do.currency, do.exchange_rate, do.expenses, do.remarks
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

    // ============ 1. 批量查询销售订单 ============
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

    // ============ 2. 批量查询采购订单 ============
    const salesOrderIds = Object.values(salesOrderMap).map(so => so.sales_order_id).filter(Boolean)

    let purchaseOrderMap = {} // sales_order_id -> [purchase_orders]
    if (salesOrderIds.length > 0) {
      const jsonConditions = salesOrderIds.map(() => `JSON_CONTAINS(related_sales_orders, JSON_OBJECT('sales_order_id', ?))`).join(' OR ')
      const [purchaseOrders] = await pool.query(
        `SELECT purchase_order_id, order_number, contract_number, purchase_person,
                purchase_items, expenses, related_sales_order_id, related_sales_orders
         FROM purchase_orders WHERE related_sales_order_id IN (?) OR (${jsonConditions})`,
        [salesOrderIds, ...salesOrderIds]
      )
      const matchedIds = new Set()
      for (const po of purchaseOrders) {
        if (po.related_sales_order_id && salesOrderIds.includes(po.related_sales_order_id)) {
          if (!purchaseOrderMap[po.related_sales_order_id]) purchaseOrderMap[po.related_sales_order_id] = []
          const key = `${po.purchase_order_id}_direct`
          if (!matchedIds.has(key)) {
            matchedIds.add(key)
            purchaseOrderMap[po.related_sales_order_id].push(po)
          }
        }
        if (po.related_sales_orders) {
          let relatedList = []
          try {
            relatedList = typeof po.related_sales_orders === 'string'
              ? JSON.parse(po.related_sales_orders)
              : po.related_sales_orders
          } catch {}
          for (const rel of relatedList) {
            if (rel.sales_order_id && salesOrderIds.includes(rel.sales_order_id)) {
              if (!purchaseOrderMap[rel.sales_order_id]) purchaseOrderMap[rel.sales_order_id] = []
              const key = `${po.purchase_order_id}_${rel.sales_order_id}`
              if (!matchedIds.has(key)) {
                matchedIds.add(key)
                purchaseOrderMap[rel.sales_order_id].push(po)
              }
            }
          }
        }
      }
    }

    // ============ 3. 批量查询入库单 ============
    const purchaseContractNumbers = [...new Set(
      Object.values(purchaseOrderMap).flat().map(po => po.contract_number).filter(Boolean)
    )]

    let warehousingOrderMap = {}
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

    // ============ 4. 批量查询产品信息 ============
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
                tax_included_price, tax_excluded_price, product_classification
         FROM products WHERE product_code IN (?)`,
        [Array.from(allProductCodes)]
      )
      for (const p of products) {
        productMap[p.product_code] = p
      }
    }

    // ============ 5. 批量查询汇率 ============
    // 收集所有出库日期，计算涉及的周一和月份
    const weekSet = new Set()
    const monthSet = new Set()
    let maxEntryDate = null
    for (const order of deliveryOrders) {
      if (order.entry_date) {
        const week = getMondayStr(order.entry_date)
        const month = getMonthStr(order.entry_date)
        if (week) weekSet.add(week)
        if (month) monthSet.add(month)
        const entryDateStr = formatDateStr(order.entry_date)
        if (!maxEntryDate || entryDateStr > maxEntryDate) {
          maxEntryDate = entryDateStr
        }
      }
    }

    // 查询银行汇率（支持跨月拆分记录，按 effective_week 降序）
    // 按币种分组存储，便于查找最近生效的汇率
    // 支持两种存储方向：外币->CNY 和 CNY->外币（自动取倒数）
    let bankRatesByCurrency = {} // 'source_currency' -> [{effective_week, rate}, ...] 按 effective_week 降序
    if (maxEntryDate) {
      const [bankRates] = await pool.query(
        `SELECT source_currency, target_currency, effective_week, rate
         FROM exchange_rates
         WHERE effective_week <= ? AND (target_currency = 'CNY' OR source_currency = 'CNY')
         ORDER BY source_currency, effective_week DESC`,
        [maxEntryDate]
      )
      for (const r of bankRates) {
        let currency, rate
        if (r.target_currency === 'CNY') {
          // 外币->CNY：直接使用
          currency = r.source_currency
          rate = parseFloat(r.rate)
        } else if (r.source_currency === 'CNY') {
          // CNY->外币：取倒数得到外币->CNY的汇率
          currency = r.target_currency
          rate = 1 / parseFloat(r.rate)
        } else {
          continue
        }
        if (!bankRatesByCurrency[currency]) {
          bankRatesByCurrency[currency] = []
        }
        bankRatesByCurrency[currency].push({
          effective_week: r.effective_week,
          rate: rate
        })
      }
    }

    // 查询海关汇率（按月）
    // 支持两种存储方向：外币->CNY 和 CNY->外币（自动取倒数）
    let customsRateMap = {} // 'currency_month' -> rate (外币->CNY)
    if (monthSet.size > 0) {
      const [customsRates] = await pool.query(
        `SELECT source_currency, target_currency, effective_month, rate
         FROM customs_exchange_rates
         WHERE effective_month IN (?) AND (target_currency = 'CNY' OR source_currency = 'CNY')`,
        [Array.from(monthSet)]
      )
      for (const r of customsRates) {
        let currency, rate, month
        if (r.target_currency === 'CNY') {
          currency = r.source_currency
          rate = parseFloat(r.rate)
        } else if (r.source_currency === 'CNY') {
          currency = r.target_currency
          rate = 1 / parseFloat(r.rate)
        } else {
          continue
        }
        month = r.effective_month instanceof Date
          ? `${r.effective_month.getFullYear()}-${String(r.effective_month.getMonth() + 1).padStart(2, '0')}-01`
          : r.effective_month
        const key = `${currency}_${month}`
        customsRateMap[key] = rate
      }
    }

    // ============ 6. 批量查询应收单和核销信息 ============
    const orderNumbers = deliveryOrders.map(o => o.order_number).filter(Boolean)

    let receivableMap = {} // order_number -> receivable
    let writeOffInfoMap = {} // receivable_id -> { write_off_date, write_off_number, count }

    if (orderNumbers.length > 0) {
      // 查询应收单
      const [receivables] = await pool.query(
        `SELECT receivable_id, source_bill_id, amount, received_amount, balance_amount, status, handling_fee, due_date
         FROM receivables
         WHERE source_bill_id IN (?) AND source_bill_type = 1`,
        [orderNumbers]
      )
      for (const r of receivables) {
        receivableMap[r.source_bill_id] = r
      }

      // 查询核销信息
      const receivableIds = receivables.map(r => r.receivable_id).filter(Boolean)
      if (receivableIds.length > 0) {
        const [writeOffItems] = await pool.query(
          `SELECT wi.source_id, wi.write_off_amount, wd.write_off_date, wd.write_off_number
           FROM write_off_items wi
           JOIN write_off_documents wd ON wi.write_off_id = wd.write_off_id
           WHERE wi.source_id IN (?)
           ORDER BY wd.write_off_date DESC`,
          [receivableIds]
        )

        for (const item of writeOffItems) {
          if (!writeOffInfoMap[item.source_id]) {
            writeOffInfoMap[item.source_id] = {
              last_write_off_date: item.write_off_date,
              last_write_off_number: item.write_off_number,
              count: 0,
              total_write_off_amount: 0
            }
          }
          writeOffInfoMap[item.source_id].count++
          writeOffInfoMap[item.source_id].total_write_off_amount += parseFloat(item.write_off_amount) || 0
          // 更新最近核销日期（因为已按日期降序排列，第一个就是最新的）
          if (writeOffInfoMap[item.source_id].count === 1) {
            writeOffInfoMap[item.source_id].last_write_off_date = item.write_off_date
            writeOffInfoMap[item.source_id].last_write_off_number = item.write_off_number
          }
        }
      }
    }

    // ============ 7. 组装报表数据 ============
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

      // 获取订单币种和汇率
      const orderCurrency = order.currency || 'CNY'
      const orderExchangeRate = parseFloat(order.exchange_rate) || 1
      const entryDate = formatDateStr(order.entry_date) || ''

      // 先获取结算信息（银行汇率依赖结算日期和结算状态）
      const receivable = receivableMap[order.order_number]
      let settlementStatus = '未结算'
      let settlementStatusText = '未结算'
      let receivableAmount = 0
      let receivedAmount = 0
      let balanceAmount = 0
      let lastWriteOffDate = null
      let lastWriteOffNumber = ''
      let writeOffCount = 0
      let settlementDate = '' // 结算日期

      if (receivable) {
        receivableAmount = parseFloat(receivable.amount) || 0
        receivedAmount = parseFloat(receivable.received_amount) || 0
        balanceAmount = parseFloat(receivable.balance_amount) || (receivableAmount + (parseFloat(receivable.handling_fee) || 0) - receivedAmount)
        settlementDate = formatDateStr(receivable.due_date) || ''

        if (receivable.status === 2) {
          settlementStatus = '已结算'
          settlementStatusText = '已结算'
        } else if (receivable.status === 1) {
          settlementStatus = '部分结算'
          settlementStatusText = '部分结算'
        } else {
          settlementStatus = '未结算'
          settlementStatusText = '未结算'
        }

        const writeOffInfo = writeOffInfoMap[receivable.receivable_id]
        if (writeOffInfo) {
          lastWriteOffDate = writeOffInfo.last_write_off_date
          lastWriteOffNumber = writeOffInfo.last_write_off_number
          writeOffCount = writeOffInfo.count
        }
      }

      // 计算海关汇率（以出库日期为基础）
      const month = getMonthStr(entryDate)
      let customsRate = 1

      if (orderCurrency !== 'CNY') {
        const customsKey = `${orderCurrency}_${month}`
        customsRate = customsRateMap[customsKey] || orderExchangeRate
      }

      // 计算银行汇率（以结算日期为基础，未结算时为空）
      let bankRate = null

      if (orderCurrency !== 'CNY') {
        if (settlementStatus === '未结算' || !settlementDate) {
          // 未结算或无结算日期，银行汇率为空
          bankRate = null
        } else {
          // 以结算日期查找银行汇率
          const currencyRates = bankRatesByCurrency[orderCurrency]
          if (currencyRates) {
            const settlementMonth = settlementDate.slice(0, 7) // 'YYYY-MM'
            const matchingRate = currencyRates.find(r =>
              r.effective_week <= settlementDate && r.effective_week.slice(0, 7) === settlementMonth
            )
            bankRate = matchingRate ? matchingRate.rate : null
          }
        }
      } else {
        bankRate = 1
      }

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

      // 解析销售订单商品行
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
      }, 0) || 1

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

      // 汇总所有采购订单的费用
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

      // 获取入库数据和入库费用
      let warehousingExpensesTotal = { tariff: 0, transportationFee: 0, customsFee: 0, otherFee: 0 }
      let warehousingItemMap = {}
      let warehousingDate = null

      for (const po of purchaseOrders) {
        const woList = po.contract_number ? (warehousingOrderMap[po.contract_number] || []) : []
        for (const wo of woList) {
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
            warehousingItemMap[code].total_price += wiQty * wiPrice
            warehousingItemMap[code].tax_included_price = wiPrice
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
        const taxRate = parseFloat(item.tax_rate) || 13
        const unitPriceExcluded = taxIncludedPrice / (1 + taxRate / 100)
        const amountExcluded = quantity * unitPriceExcluded

        // 匹配销售商品行获取结算信息
        const matchedSalesItem = salesItems.find(si => si.product_code === productCode)

        // 匹配入库数据
        const whItem = warehousingItemMap[productCode]
        const hasWarehousing = whItem && whItem.quantity > 0

        let warehousingQuantity = 0
        let warehousingUnitPriceExcluded = 0
        let warehousingUnitPriceIncluded = 0
        let warehousingAmount = 0
        let warehousingAmountIncluded = 0

        if (hasWarehousing) {
          warehousingQuantity = whItem.quantity
          warehousingUnitPriceIncluded = whItem.tax_included_price || 0
          warehousingUnitPriceExcluded = warehousingUnitPriceIncluded / (1 + taxRate / 100)
          warehousingAmountIncluded = whItem.total_price || 0
          warehousingAmount = warehousingAmountIncluded / (1 + taxRate / 100)
        } else {
          // 兜底：使用产品表的移动加权平均价
          const product = productMap[productCode]
          if (product) {
            warehousingQuantity = quantity
            warehousingUnitPriceExcluded = parseFloat(product.tax_excluded_price) || 0
            warehousingUnitPriceIncluded = parseFloat(product.tax_included_price) || 0
            warehousingAmount = quantity * warehousingUnitPriceExcluded
            warehousingAmountIncluded = quantity * warehousingUnitPriceIncluded
          }
        }

        // 费用分摊（按金额比例）
        const itemRatio = orderTotalAmount > 0 ? amount / orderTotalAmount : 0

        // 采购合同编号和采购员
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
        const model = product?.model || item.model || ''
        const unit = item.unit || product?.unit || ''

        // ============ 核心毛利计算 ============

        // 各环节费用分摊到商品行
        const itemPoTransportation = Math.round(poTransportationFee * itemRatio * 100) / 100
        const itemPoOperating = Math.round(poOperatingExpenses * itemRatio * 100) / 100
        const itemPoVat = Math.round(poValueAddedTax * itemRatio * 100) / 100
        const itemPoHandling = Math.round(poHandlingFee * itemRatio * 100) / 100
        const itemPoOther = Math.round(poOtherFee * itemRatio * 100) / 100
        const itemPoTotal = Math.round(purchaseExpenseTotal * itemRatio * 100) / 100

        const itemSlTransportation = Math.round(slTransportationFee * itemRatio * 100) / 100
        const itemSlHandling = Math.round(slHandlingFee * itemRatio * 100) / 100
        const itemSlOther = Math.round(slOtherFee * itemRatio * 100) / 100
        const itemSlTotal = Math.round(salesExpenseTotal * itemRatio * 100) / 100

        const itemWhTariff = Math.round(warehousingExpensesTotal.tariff * itemRatio * 100) / 100
        const itemWhTransportation = Math.round(warehousingExpensesTotal.transportationFee * itemRatio * 100) / 100
        const itemWhCustoms = Math.round(warehousingExpensesTotal.customsFee * itemRatio * 100) / 100
        const itemWhOther = Math.round(warehousingExpensesTotal.otherFee * itemRatio * 100) / 100
        const itemWhTotal = Math.round(warehousingExpenseTotal * itemRatio * 100) / 100

        const itemDlExpress = Math.round(dlExpressFee * itemRatio * 100) / 100
        const itemDlTransportation = Math.round(dlTransportationFee * itemRatio * 100) / 100
        const itemDlCustoms = Math.round(dlCustomsFee * itemRatio * 100) / 100
        const itemDlOther = Math.round(dlOtherFee * itemRatio * 100) / 100
        const itemDlTotal = Math.round(deliveryExpenseTotal * itemRatio * 100) / 100

        // 费用合计
        const totalExpense = itemPoTotal + itemSlTotal + itemWhTotal + itemDlTotal

        // 总成本 = 采购成本(未税) + 费用合计
        const totalCost = warehousingAmount + totalExpense

        // 毛利 = 销售收入(未税) - 总成本
        const grossProfit = amountExcluded - totalCost

        // 毛利率
        const grossProfitRate = amountExcluded > 0 ? (grossProfit / amountExcluded * 100) : 0

        // ============ 汇率换算 ============
        // 银行汇率为空时（未结算），CNY金额和汇率差为空/0
        const salesAmountIncludedCNY_bank = bankRate !== null ? amount * bankRate : null
        const salesAmountExcludedCNY_bank = bankRate !== null ? amountExcluded * bankRate : null
        const salesAmountIncludedCNY_customs = amount * customsRate
        const salesAmountExcludedCNY_customs = amountExcluded * customsRate

        const exchangeDiffIncluded = bankRate !== null ? salesAmountIncludedCNY_bank - salesAmountIncludedCNY_customs : 0
        const exchangeDiffExcluded = bankRate !== null ? salesAmountExcludedCNY_bank - salesAmountExcludedCNY_customs : 0

        reportRows.push({
          // 出货信息
          delivery_date: formatDateStr(order.entry_date) || formatDateStr(order.delivery_date) || '',
          order_number: order.order_number || '',
          sales_contract_number: order.contract_number || '',
          sales_person: salesOrder?.sales_person || '',
          customer_name: order.customer_name || salesOrder?.customer_name || '',
          payment_method: salesOrder?.payment_method || '',
          settlement_date: settlementDate,
          classification: classification,
          // 商品信息
          product_name: item.product_name || '',
          product_code: productCode,
          model: model,
          description: description,
          unit: unit,
          delivery_quantity: quantity,
          // 销售信息
          unit_price: Math.round(taxIncludedPrice * 10000) / 10000,
          sales_amount_included: Math.round(amount * 100) / 100,
          unit_price_excluded: Math.round(unitPriceExcluded * 10000) / 10000,
          sales_amount_excluded: Math.round(amountExcluded * 100) / 100,
          tax_rate: taxRate,
          // 结算信息
          settlement_status: settlementStatusText,
          receivable_amount: Math.round(receivableAmount * 100) / 100,
          received_amount: Math.round(receivedAmount * 100) / 100,
          balance_amount: Math.round(balanceAmount * 100) / 100,
          last_write_off_date: formatDateStr(lastWriteOffDate),
          last_write_off_number: lastWriteOffNumber,
          write_off_count: writeOffCount,
          // 出库成本（优先采购订单，兜底产品表）
          cost_unit_price_excluded: Math.round(warehousingUnitPriceExcluded * 10000) / 10000,
          cost_unit_price_included: Math.round(warehousingUnitPriceIncluded * 10000) / 10000,
          cost_amount_excluded: Math.round(warehousingAmount * 100) / 100,
          cost_amount_included: Math.round(warehousingAmountIncluded * 100) / 100,
          // 采购信息
          purchase_contract_number: purchaseContractNumber,
          purchase_person: purchasePerson,
          warehousing_date: formatDateStr(warehousingDate) || '',
          warehousing_quantity: warehousingQuantity,
          warehousing_unit_price_excluded: Math.round(warehousingUnitPriceExcluded * 10000) / 10000,
          warehousing_unit_price_included: Math.round(warehousingUnitPriceIncluded * 10000) / 10000,
          warehousing_amount: Math.round(warehousingAmount * 100) / 100,
          warehousing_amount_included: Math.round(warehousingAmountIncluded * 100) / 100,
          // 采购费用明细
          po_expense_transportation: itemPoTransportation,
          po_expense_operating: itemPoOperating,
          po_expense_vat: itemPoVat,
          po_expense_handling: itemPoHandling,
          po_expense_other: itemPoOther,
          po_expense_total: itemPoTotal,
          // 销售费用明细
          sl_expense_transportation: itemSlTransportation,
          sl_expense_handling: itemSlHandling,
          sl_expense_other: itemSlOther,
          sl_expense_total: itemSlTotal,
          // 入库费用明细
          wh_expense_tariff: itemWhTariff,
          wh_expense_transportation: itemWhTransportation,
          wh_expense_customs: itemWhCustoms,
          wh_expense_other: itemWhOther,
          wh_expense_total: itemWhTotal,
          // 出库费用明细
          dl_expense_express: itemDlExpress,
          dl_expense_transportation: itemDlTransportation,
          dl_expense_customs: itemDlCustoms,
          dl_expense_other: itemDlOther,
          dl_expense_total: itemDlTotal,
          // 费用合计
          total_expense: Math.round(totalExpense * 100) / 100,
          // 总成本
          total_cost: Math.round(totalCost * 100) / 100,
          // 毛利
          gross_profit: Math.round(grossProfit * 100) / 100,
          gross_profit_rate: Math.round(grossProfitRate * 100) / 100,
          // 汇率信息
          currency: orderCurrency,
          bank_rate: Math.round(bankRate * 1000000) / 1000000,
          customs_rate: Math.round(customsRate * 1000000) / 1000000,
          sales_amount_included_cny_bank: Math.round(salesAmountIncludedCNY_bank * 100) / 100,
          sales_amount_excluded_cny_bank: Math.round(salesAmountExcludedCNY_bank * 100) / 100,
          sales_amount_included_cny_customs: Math.round(salesAmountIncludedCNY_customs * 100) / 100,
          sales_amount_excluded_cny_customs: Math.round(salesAmountExcludedCNY_customs * 100) / 100,
          exchange_diff_included: Math.round(exchangeDiffIncluded * 100) / 100,
          exchange_diff_excluded: Math.round(exchangeDiffExcluded * 100) / 100,
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