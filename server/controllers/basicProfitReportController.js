import pool from '../config/database.js'

/**
 * 基础毛利表Controller
 * 核心公式：毛利 = 销售额(CNY) - 采购额(CNY) - 采购费用(CNY)
 * 汇率统一使用海关汇率，按各自订单的录入日期查询
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

// 获取月份第一天日期字符串（用于匹配 effective_month）
function getMonthStr(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

export const getBasicProfitReport = async (req, res) => {
  try {
    const { startDate, endDate, contractNumber, customerName, productCode, salesPerson, page = 1, pageSize = 50 } = req.query

    // 构建查询条件
    const conditions = []
    const params = []

    if (startDate) {
      conditions.push('so.entry_date >= ?')
      params.push(startDate)
    }
    if (endDate) {
      conditions.push('so.entry_date <= ?')
      params.push(endDate)
    }
    if (contractNumber) {
      conditions.push('so.contract_number LIKE ?')
      params.push(`%${contractNumber}%`)
    }
    if (customerName) {
      conditions.push('so.customer_name LIKE ?')
      params.push(`%${customerName}%`)
    }
    if (salesPerson) {
      conditions.push('so.sales_person LIKE ?')
      params.push(`%${salesPerson}%`)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 查询总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM sales_orders so ${whereClause}`,
      params
    )
    const total = countResult[0]?.total || 0

    // 查询销售订单（分页）
    const validPage = Math.max(1, parseInt(page) || 1)
    const validPageSize = Math.min(500, Math.max(1, parseInt(pageSize) || 50))
    const offset = (validPage - 1) * validPageSize

    const [salesOrders] = await pool.query(
      `SELECT so.sales_order_id, so.contract_number, so.customer_name,
              so.sales_items, so.currency, so.exchange_rate, so.entry_date,
              so.sales_person, so.remarks
       FROM sales_orders so
       ${whereClause}
       ORDER BY so.entry_date DESC, so.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, validPageSize, offset]
    )

    if (salesOrders.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: validPage, pageSize: validPageSize, totalPages: 0 }
      })
    }

    // ============ 1. 批量查询关联的采购订单 ============
    const salesOrderIds = salesOrders.map(so => so.sales_order_id).filter(Boolean)

    let purchaseOrderMap = {} // sales_order_id -> [purchase_orders]
    if (salesOrderIds.length > 0) {
      const jsonConditions = salesOrderIds.map(() => `JSON_CONTAINS(po.related_sales_orders, JSON_OBJECT('sales_order_id', ?))`).join(' OR ')
      const [purchaseOrders] = await pool.query(
        `SELECT po.purchase_order_id, po.contract_number, po.supplier_name,
                po.purchase_items, po.currency, po.exchange_rate, po.entry_date,
                po.purchase_person, po.related_sales_order_id, po.related_sales_orders, po.expenses
         FROM purchase_orders po
         WHERE po.related_sales_order_id IN (?) OR (${jsonConditions})`,
        [salesOrderIds, ...salesOrderIds]
      )

      const matchedIds = new Set()
      for (const po of purchaseOrders) {
        // 收集该 PO 关联的所有 sales_order_id（去重）
        const relatedSoIds = new Set()

        // 匹配 related_sales_order_id 字段
        if (po.related_sales_order_id && salesOrderIds.includes(po.related_sales_order_id)) {
          relatedSoIds.add(po.related_sales_order_id)
        }
        // 匹配 related_sales_orders JSON 数组
        if (po.related_sales_orders) {
          let relatedList = []
          try {
            relatedList = typeof po.related_sales_orders === 'string'
              ? JSON.parse(po.related_sales_orders)
              : po.related_sales_orders
          } catch {}
          for (const rel of relatedList) {
            if (rel.sales_order_id && salesOrderIds.includes(rel.sales_order_id)) {
              relatedSoIds.add(rel.sales_order_id)
            }
          }
        }

        // 为每个关联的销售订单添加该 PO（按 purchase_order_id + sales_order_id 去重）
        for (const soId of relatedSoIds) {
          const key = `${po.purchase_order_id}_${soId}`
          if (matchedIds.has(key)) continue
          matchedIds.add(key)

          if (!purchaseOrderMap[soId]) purchaseOrderMap[soId] = []

          // 从 related_sales_orders 中获取分摊数量
          let shareQuantity = null
          if (po.related_sales_orders) {
            let relatedList = []
            try {
              relatedList = typeof po.related_sales_orders === 'string'
                ? JSON.parse(po.related_sales_orders)
                : po.related_sales_orders
            } catch {}
            const rel = relatedList.find(r => r.sales_order_id === soId)
            if (rel) shareQuantity = rel.quantity
          }

          purchaseOrderMap[soId].push(shareQuantity !== null ? { ...po, _shareQuantity: shareQuantity } : po)
        }
      }
    }

    // ============ 2. 收集所有涉及的币种和月份，批量查询海关汇率 ============
    const currencyMonthSet = new Set()
    for (const so of salesOrders) {
      const currency = so.currency || 'CNY'
      if (currency !== 'CNY') {
        const month = getMonthStr(formatDateStr(so.entry_date))
        if (month) currencyMonthSet.add(`${currency}_${month}`)
      }
      // 采购订单的币种和月份
      const pos = purchaseOrderMap[so.sales_order_id] || []
      for (const po of pos) {
        const poCurrency = po.currency || 'CNY'
        if (poCurrency !== 'CNY') {
          const poMonth = getMonthStr(formatDateStr(po.entry_date))
          if (poMonth) currencyMonthSet.add(`${poCurrency}_${poMonth}`)
        }
      }
    }

    // 查询海关汇率（支持正反方向）
    let customsRateMap = {} // 'currency_month' -> rate (外币->CNY)
    if (currencyMonthSet.size > 0) {
      const monthSet = [...new Set([...currencyMonthSet].map(k => k.split('_').slice(1).join('_')))]
      const [customsRates] = await pool.query(
        `SELECT source_currency, target_currency, effective_month, rate
         FROM customs_exchange_rates
         WHERE effective_month IN (?) AND (target_currency = 'CNY' OR source_currency = 'CNY')`,
        [monthSet]
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

    // ============ 3. 收集所有产品代码，批量查询产品表（兜底） ============
    const allProductCodes = new Set()
    for (const so of salesOrders) {
      try {
        const items = JSON.parse(so.sales_items || '[]')
        for (const item of items) {
          if (item.product_code) allProductCodes.add(item.product_code)
        }
      } catch {}
    }

    let productMap = {}
    if (allProductCodes.size > 0) {
      const [products] = await pool.query(
        `SELECT product_code, product_name, model, tax_included_price, tax_excluded_price
         FROM products WHERE product_code IN (?)`,
        [Array.from(allProductCodes)]
      )
      for (const p of products) {
        productMap[p.product_code] = p
      }
    }

    // ============ 4. 组装报表数据 ============
    const reportRows = []

    for (const so of salesOrders) {
      const salesCurrency = so.currency || 'CNY'
      const salesExchangeRate = parseFloat(so.exchange_rate) || 1
      const salesEntryDate = formatDateStr(so.entry_date) || ''
      const salesMonth = getMonthStr(salesEntryDate)

      // 海关汇率（销售）
      let salesCustomsRate = 1
      if (salesCurrency !== 'CNY') {
        const customsKey = `${salesCurrency}_${salesMonth}`
        salesCustomsRate = customsRateMap[customsKey] || salesExchangeRate
      }

      // 解析销售商品行
      let salesItems = []
      try {
        salesItems = JSON.parse(so.sales_items || '[]')
      } catch {}

      // 产品代码筛选
      let filteredItems = salesItems
      if (productCode) {
        const keyword = productCode.toLowerCase()
        filteredItems = salesItems.filter(item =>
          item.product_code && item.product_code.toLowerCase().includes(keyword)
        )
      }

      if (filteredItems.length === 0) continue

      // 获取关联的采购订单
      const purchaseOrders = purchaseOrderMap[so.sales_order_id] || []

      for (const item of filteredItems) {
        const productCodeVal = item.product_code || ''
        const quantity = parseFloat(item.quantity) || 0
        const taxIncludedPrice = parseFloat(item.tax_included_price) || 0
        const amount = parseFloat(item.amount) || (quantity * taxIncludedPrice)

        // 销售金额（CNY）
        const salesAmountCNY = amount * salesCustomsRate

        // 匹配采购订单中的商品
        let purchaseContractNumber = ''
        let supplierName = ''
        let purchasePerson = ''
        let purchaseQuantity = 0
        let purchaseCurrency = ''
        let purchaseUnitPrice = 0
        let purchaseAmount = 0
        let purchaseCustomsRate = 1
        let purchaseAmountCNY = 0
        let purchaseExpenseCNY = 0
        let purchaseEntryDate = ''
        let hasPurchase = false

        // 从关联的采购订单中查找匹配的商品
        for (const po of purchaseOrders) {
          let poItems = []
          try {
            poItems = JSON.parse(po.purchase_items || '[]')
          } catch {}

          const matchedPoItem = poItems.find(pi => pi.product_code === productCodeVal)
          if (!matchedPoItem) continue

          hasPurchase = true
          const poCurrency = po.currency || 'CNY'
          const poExchangeRate = parseFloat(po.exchange_rate) || 1
          const poEntryDate = formatDateStr(po.entry_date) || ''
          const poMonth = getMonthStr(poEntryDate)

          // 海关汇率（采购）
          let poCustomsRate = 1
          if (poCurrency !== 'CNY') {
            const customsKey = `${poCurrency}_${poMonth}`
            poCustomsRate = customsRateMap[customsKey] || poExchangeRate
          }

          const poQty = parseFloat(matchedPoItem.quantity) || 0
          const poPrice = parseFloat(matchedPoItem.tax_included_price) || 0
          const poAmount = poQty * poPrice

          // 分摊逻辑：如果采购订单关联多个销售订单，按比例分摊
          let shareRatio = 1
          if (po.related_sales_orders) {
            let relatedList = []
            try {
              relatedList = typeof po.related_sales_orders === 'string'
                ? JSON.parse(po.related_sales_orders)
                : po.related_sales_orders
            } catch {}

            if (relatedList.length > 1) {
              const totalQty = relatedList.reduce((sum, rel) => sum + (parseFloat(rel.quantity) || 0), 0)
              const currentRel = relatedList.find(rel => rel.sales_order_id === so.sales_order_id)
              if (currentRel && totalQty > 0) {
                shareRatio = (parseFloat(currentRel.quantity) || 0) / totalQty
              }
            }
          }

          const sharedPoAmount = poAmount * shareRatio
          const sharedPoAmountCNY = sharedPoAmount * poCustomsRate

          // 采购费用
          let poExpenses = {}
          try {
            poExpenses = JSON.parse(po.expenses || '{}')
          } catch {}
          const expTransportation = parseFloat(poExpenses.transportationFee) || 0
          const expOperating = parseFloat(poExpenses.operatingExpenses) || 0
          const expVat = parseFloat(poExpenses.valueAddedTax) || 0
          const expHandling = parseFloat(poExpenses.handlingFee) || 0
          const expOther = parseFloat(poExpenses.otherFee) || 0
          const totalExpense = expTransportation + expOperating + expVat + expHandling + expOther
          const expenseCNY = poCurrency !== 'CNY' ? totalExpense * poCustomsRate : totalExpense

          // 累加（一个销售商品可能关联多个采购订单）
          purchaseContractNumber = purchaseContractNumber
            ? `${purchaseContractNumber}, ${po.contract_number || ''}`
            : (po.contract_number || '')
          supplierName = supplierName
            ? `${supplierName}, ${po.supplier_name || ''}`
            : (po.supplier_name || '')
          purchasePerson = purchasePerson
            ? `${purchasePerson}, ${po.purchase_person || ''}`
            : (po.purchase_person || '')
          purchaseQuantity += poQty * shareRatio
          purchaseCurrency = poCurrency
          purchaseUnitPrice += poPrice * shareRatio
          purchaseAmount += sharedPoAmount
          purchaseAmountCNY += sharedPoAmountCNY
          purchaseExpenseCNY += expenseCNY * shareRatio
          purchaseCustomsRate = poCustomsRate
          purchaseEntryDate = poEntryDate
        }

        // 兜底：无关联采购订单时，从产品表获取单价
        if (!hasPurchase) {
          const product = productMap[productCodeVal]
          if (product) {
            purchaseQuantity = quantity
            purchaseCurrency = salesCurrency
            purchaseUnitPrice = parseFloat(product.tax_included_price) || 0
            purchaseAmount = quantity * purchaseUnitPrice
            purchaseAmountCNY = purchaseAmount * salesCustomsRate
            purchaseCustomsRate = salesCustomsRate
          }
        }

        // 毛利计算
        const grossProfit = salesAmountCNY - purchaseAmountCNY - purchaseExpenseCNY
        const grossProfitRate = salesAmountCNY > 0 ? (grossProfit / salesAmountCNY * 100) : 0

        // 产品信息
        const product = productMap[productCodeVal]

        reportRows.push({
          contract_number: so.contract_number || '',
          customer_name: so.customer_name || '',
          sales_person: so.sales_person || '',
          entry_date: salesEntryDate,
          product_name: item.product_name || product?.product_name || '',
          product_code: productCodeVal,
          model: item.model || product?.model || '',
          quantity: quantity,
          currency: salesCurrency,
          unit_price: Math.round(taxIncludedPrice * 10000) / 10000,
          amount: Math.round(amount * 100) / 100,
          sales_customs_rate: salesCurrency !== 'CNY' ? Math.round(salesCustomsRate * 1000000) / 1000000 : 1,
          sales_amount_cny: Math.round(salesAmountCNY * 100) / 100,
          purchase_contract_number: purchaseContractNumber,
          supplier_name: supplierName,
          purchase_person: purchasePerson,
          purchase_quantity: Math.round(purchaseQuantity * 100) / 100,
          purchase_currency: purchaseCurrency,
          purchase_unit_price: Math.round(purchaseUnitPrice * 10000) / 10000,
          purchase_amount: Math.round(purchaseAmount * 100) / 100,
          purchase_customs_rate: purchaseCurrency && purchaseCurrency !== 'CNY' ? Math.round(purchaseCustomsRate * 1000000) / 1000000 : (purchaseCurrency === 'CNY' ? 1 : null),
          purchase_amount_cny: Math.round(purchaseAmountCNY * 100) / 100,
          purchase_expense_cny: Math.round(purchaseExpenseCNY * 100) / 100,
          gross_profit: Math.round(grossProfit * 100) / 100,
          gross_profit_rate: Math.round(grossProfitRate * 100) / 100,
          remarks: so.remarks || '',
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
    console.error('基础毛利表查询失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}
