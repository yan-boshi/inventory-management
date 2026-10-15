import pool from '../config/database.js'
import { generateUUID } from '../utils/uuid.js'
import { round4 } from '../utils/round.js'
import {
  SALES_ORDER_KEYS,
  findItemForRollback
} from '../utils/contractOrderLookup.js'

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

// 更新结算日期
export const updateSettlementDate = async (req, res) => {
  try {
    const { order_number, settlement_date } = req.body

    if (!order_number) {
      return res.status(400).json({ success: false, message: '出库单号不能为空' })
    }

    // 查找对应的应收单
    const [receivables] = await pool.query(
      'SELECT receivable_id FROM receivables WHERE source_bill_id = ? AND source_bill_type = 1',
      [order_number]
    )

    let receivableId

    if (receivables.length === 0) {
      // 找不到应收单时，自动创建一个
      const [deliveryOrders] = await pool.query(
        'SELECT order_number, customer_name, total_amount, contract_number, delivery_items FROM delivery_orders WHERE order_number = ?',
        [order_number]
      )

      if (deliveryOrders.length === 0) {
        return res.status(404).json({ success: false, message: '未找到对应的出库单' })
      }

      const deliveryOrder = deliveryOrders[0]

      // 获取销售订单的客户ID和结算方式
      // 同一合同编号可能对应多张销售订单，用出库明细匹配到实际发货的销售订单
      let customerId = null
      let paymentMethod = null
      if (deliveryOrder.contract_number) {
        try {
          const [salesOrders] = await pool.query(
            'SELECT * FROM sales_orders WHERE contract_number = ?',
            [deliveryOrder.contract_number]
          )
          if (salesOrders.length > 0) {
            // 用出库明细的第一项商品匹配到实际发货的销售订单
            const deliveryItems = JSON.parse(deliveryOrder.delivery_items || '[]')
            let matchedOrder = null
            if (deliveryItems.length > 0) {
              // 构建 itemsMap: sales_order_id -> parsed sales_items
              const itemsMap = new Map()
              for (const order of salesOrders) {
                try {
                  itemsMap.set(order.sales_order_id, JSON.parse(order.sales_items || '[]'))
                } catch {
                  itemsMap.set(order.sales_order_id, [])
                }
              }
              const match = findItemForRollback(salesOrders, itemsMap, deliveryItems[0].product_code, SALES_ORDER_KEYS)
              if (match) matchedOrder = match.order
            }
            // 匹配不到则 fallback 到第一张订单
            if (!matchedOrder) matchedOrder = salesOrders[0]
            customerId = matchedOrder.customer_code
            paymentMethod = matchedOrder.payment_method
          }
        } catch (lookupErr) {
          console.error('查找销售订单失败（使用 fallback）:', lookupErr.message)
          // fallback: 直接查询
          const [salesOrders] = await pool.query(
            'SELECT customer_code, payment_method FROM sales_orders WHERE contract_number = ?',
            [deliveryOrder.contract_number]
          )
          if (salesOrders.length > 0) {
            customerId = salesOrders[0].customer_code
            paymentMethod = salesOrders[0].payment_method
          }
        }
      }

      // 创建应收单
      receivableId = generateUUID()
      await pool.query(
        `INSERT INTO receivables (receivable_id, customer_id, customer_name, source_bill_type, source_bill_id, amount, received_amount, balance_amount, due_date, status, payment_method)
         VALUES (?, ?, ?, 1, ?, ?, 0, ?, ?, 0, ?)`,
        [
          receivableId,
          customerId,
          deliveryOrder.customer_name || '',
          order_number,
          parseFloat(deliveryOrder.total_amount) || 0,
          parseFloat(deliveryOrder.total_amount) || 0,
          settlement_date || null,
          paymentMethod
        ]
      )
    } else {
      receivableId = receivables[0].receivable_id
    }

    // 更新 due_date（结算日期）
    await pool.query(
      'UPDATE receivables SET due_date = ? WHERE receivable_id = ?',
      [settlement_date || null, receivableId]
    )

    res.json({ success: true, message: '结算日期更新成功' })
  } catch (error) {
    console.error('更新结算日期失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 更新已结算金额
export const updateReceivedAmount = async (req, res) => {
  try {
    const { order_number, received_amount } = req.body

    if (!order_number) {
      return res.status(400).json({ success: false, message: '出库单号不能为空' })
    }

    if (received_amount === undefined || received_amount === null || received_amount < 0) {
      return res.status(400).json({ success: false, message: '已结算金额必须为非负数' })
    }

    // 查找对应的应收单
    const [receivables] = await pool.query(
      'SELECT receivable_id, amount, handling_fee FROM receivables WHERE source_bill_id = ? AND source_bill_type = 1',
      [order_number]
    )

    if (receivables.length === 0) {
      return res.status(404).json({ success: false, message: '未找到对应的应收单，请先创建应收单' })
    }

    const receivable = receivables[0]
    const receivableId = receivable.receivable_id
    const amount = parseFloat(receivable.amount) || 0
    const handlingFee = parseFloat(receivable.handling_fee) || 0
    const totalAmount = amount + handlingFee

    // 计算未结算金额
    const balanceAmount = totalAmount - received_amount

    // 计算结算状态
    let status = 0 // 未结算
    if (received_amount <= 0) {
      status = 0 // 未结算
    } else if (received_amount >= totalAmount) {
      status = 2 // 已结算
    } else {
      status = 1 // 部分结算
    }

    // 更新应收单
    await pool.query(
      'UPDATE receivables SET received_amount = ?, balance_amount = ?, status = ? WHERE receivable_id = ?',
      [received_amount, balanceAmount, status, receivableId]
    )

    // 返回更新后的结算状态和未结算金额
    const settlementStatusText = status === 2 ? '已结算' : status === 1 ? '部分结算' : '未结算'

    res.json({
      success: true,
      message: '已结算金额更新成功',
      data: {
        settlement_status: settlementStatusText,
        balance_amount: round4(balanceAmount),
      }
    })
  } catch (error) {
    console.error('更新已结算金额失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate, contractNumber, customerName, productCode, settlementStartDate, settlementEndDate, page = 1, pageSize = 50 } = req.query

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

    // 结算日期筛选（关联应收单）
    const joinClause = (settlementStartDate || settlementEndDate)
      ? 'INNER JOIN receivables r ON r.source_bill_id = do.order_number AND r.source_bill_type = 1'
      : 'LEFT JOIN receivables r ON r.source_bill_id = do.order_number AND r.source_bill_type = 1'

    if (settlementStartDate) {
      conditions.push('r.due_date >= ?')
      params.push(settlementStartDate)
    }

    if (settlementEndDate) {
      conditions.push('r.due_date <= ?')
      params.push(settlementEndDate)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // 查询总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM delivery_orders do ${joinClause} ${whereClause}`,
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
       ${joinClause}
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
                purchase_items, expenses, related_sales_order_id, related_sales_orders, currency
         FROM purchase_orders WHERE related_sales_order_id IN (?) OR (${jsonConditions})`,
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
          purchaseOrderMap[soId].push(po)
        }
      }
    }

    // ============ 2.5 批量查询无销售订单关联的采购订单（兜底币种） ============
    const unmatchedContractNumbers = [...new Set(
      deliveryOrders
        .map(o => o.contract_number)
        .filter(cn => cn && !salesOrderMap[cn])
    )]

    let fallbackPOMap = {} // sales_contract_number -> { currency }
    if (unmatchedContractNumbers.length > 0) {
      // 出库单的 contract_number 就是销售合同编号，需要通过它找到关联的采购订单
      const [fallbackPOs] = await pool.query(
        `SELECT po.currency, so.contract_number AS sales_contract_number
         FROM purchase_orders po
         JOIN sales_orders so ON so.sales_order_id = po.related_sales_order_id
         WHERE so.contract_number IN (?)`,
        [unmatchedContractNumbers]
      )
      for (const po of fallbackPOs) {
        if (po.sales_contract_number && !fallbackPOMap[po.sales_contract_number]) {
          fallbackPOMap[po.sales_contract_number] = po
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
    // 收集所有出库日期和采购订单日期，计算涉及的月份
    const monthSet = new Set()
    for (const order of deliveryOrders) {
      if (order.entry_date) {
        const month = getMonthStr(order.entry_date)
        if (month) monthSet.add(month)
      }
    }

    // 查询海关汇率（按月）
    // 直接使用存储的汇率值
    let customsRateMap = {} // 'source_target_month' -> rate
    if (monthSet.size > 0) {
      const [customsRates] = await pool.query(
        `SELECT source_currency, target_currency, effective_month, rate
         FROM customs_exchange_rates
         WHERE effective_month IN (?)`,
        [Array.from(monthSet)]
      )
      for (const r of customsRates) {
        const month = r.effective_month instanceof Date
          ? `${r.effective_month.getFullYear()}-${String(r.effective_month.getMonth() + 1).padStart(2, '0')}-01`
          : r.effective_month
        const key = `${r.source_currency}_${r.target_currency}_${month}`
        customsRateMap[key] = parseFloat(r.rate)
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

    // 预计算每个销售合同的出库总额，用于同一SO拆分多出库单时按比例分摊成本费用
    const contractTotalAmountMap = {} // contract_number -> 出库总金额
    for (const order of deliveryOrders) {
      const cn = order.contract_number
      if (!cn) continue
      let allItems = []
      try { allItems = JSON.parse(order.delivery_items || '[]') } catch { continue }
      for (const item of allItems) {
        const qty = parseFloat(item.quantity) || 0
        const price = parseFloat(item.tax_included_price) || 0
        const amt = parseFloat(item.amount) || (qty * price)
        contractTotalAmountMap[cn] = (contractTotalAmountMap[cn] || 0) + amt
      }
    }

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

      // 先获取结算信息
      const receivable = receivableMap[order.order_number]
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
          settlementStatusText = '已结算'
        } else if (receivable.status === 1) {
          settlementStatusText = '部分结算'
        } else {
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
        const customsKey = `${orderCurrency}_CNY_${month}`
        customsRate = customsRateMap[customsKey] || orderExchangeRate
      }

      // 获取销售订单
      const salesOrder = order.contract_number ? salesOrderMap[order.contract_number] : null
      const currentSalesOrderId = salesOrder?.sales_order_id

      // 获取采购订单币种（从第一个采购订单获取）
      let purchaseCurrency = 'CNY'
      const purchaseOrders = salesOrder ? (purchaseOrderMap[salesOrder.sales_order_id] || []) : []
      for (const po of purchaseOrders) {
        if (po.currency && po.currency !== 'CNY') {
          purchaseCurrency = po.currency
          break
        }
      }
      // 兜底：当通过销售订单找不到采购订单时，通过预查询的 fallbackPOMap 获取币种
      if (purchaseOrders.length === 0 && order.contract_number && fallbackPOMap[order.contract_number]) {
        const fbCurrency = fallbackPOMap[order.contract_number].currency
        if (fbCurrency && fbCurrency !== 'CNY') {
          purchaseCurrency = fbCurrency
        }
      }

      // 计算采购币种的海关汇率（用于将采购金额换算成CNY）
      let purchaseCustomsRate = 1
      if (purchaseCurrency !== 'CNY') {
        const purchaseCustomsKey = `${purchaseCurrency}_CNY_${month}`
        purchaseCustomsRate = customsRateMap[purchaseCustomsKey] || 1
      }

      // 解析出库费用
      let deliveryExpenses = {}
      try {
        deliveryExpenses = JSON.parse(order.expenses || '{}')
      } catch (e) {
        deliveryExpenses = {}
      }

      // 解析销售费用
      let salesExpenses = {}
      if (salesOrder) {
        try {
          salesExpenses = JSON.parse(salesOrder.expenses || '{}')
        } catch (e) {
          salesExpenses = {}
        }
      }

      // 计算出库单总金额和总数量（用于费用分摊）
      const orderTotalAmount = filteredItems.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0
        const price = parseFloat(item.tax_included_price) || 0
        const amount = parseFloat(item.amount) || (qty * price)
        return sum + amount
      }, 0) || 1
      const orderTotalQty = filteredItems.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) || 0)
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

      // 汇总所有采购订单的费用和入库数据
      let purchaseExpenseTotal = 0
      let poTransportationFee = 0
      let poOperatingExpenses = 0
      let poValueAddedTax = 0
      let poHandlingFee = 0
      let poOtherFee = 0
      let warehousingExpensesTotal = { tariff: 0, transportationFee: 0, customsFee: 0, otherFee: 0 }
      let warehousingItemMap = {}
      let warehousingDate = null
      // 去重：多个PO共享同一采购合同时，同一入库单只统计一次，避免费用和数量重复累加
      const processedWoIds = new Set()

      for (const po of purchaseOrders) {
        const woExpensesList = []

        const woList = po.contract_number ? (warehousingOrderMap[po.contract_number] || []) : []
        for (const wo of woList) {
          // 同一入库单可能被多个PO引用（共享采购合同号），只处理一次
          const woId = wo.warehousing_order_id
          if (woId && processedWoIds.has(woId)) continue
          if (woId) processedWoIds.add(woId)

          let woExpenses = {}
          try {
            woExpenses = JSON.parse(wo.expenses || '{}')
          } catch (e) {
            woExpenses = {}
          }
          woExpensesList.push(woExpenses)

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
            // 使用采购订单ID+产品代码作为key，避免不同PO的同产品数据混合
            const mapKey = `${po.purchase_order_id}_${code}`
            if (!warehousingItemMap[mapKey]) {
              warehousingItemMap[mapKey] = { quantity: 0, total_price: 0, total_price_excluded: 0, tax_included_price: 0 }
            }
            const wiTotalQty = parseFloat(wi.quantity) || 0
            let wiPrice = parseFloat(wi.tax_included_price) || 0
            // 未税换算使用入库明细自身的税率（不同采购行税率可能不同），不能用销售侧税率
            const whTaxRate = parseFloat(wi.tax_rate) || 0

            // 含税单价为空时，通过产品表的未税单价和税率反算含税单价
            if (wiPrice === 0 && code) {
              const product = productMap[code]
              if (product) {
                const excludedPrice = parseFloat(product.tax_excluded_price) || 0
                if (excludedPrice > 0) {
                  wiPrice = excludedPrice * (1 + whTaxRate / 100)
                }
              }
            }

            warehousingItemMap[mapKey].quantity += wiTotalQty
            warehousingItemMap[mapKey].total_price += wiTotalQty * wiPrice
            warehousingItemMap[mapKey].total_price_excluded += (wiTotalQty * wiPrice) / (1 + whTaxRate / 100)
            warehousingItemMap[mapKey].tax_included_price = wiPrice
          }
        }

        // 费用按 SO 需求量占比分摊（PO 关联多个 SO 时按需分配）
        let expenseRatio = 1
        if (po.related_sales_orders && currentSalesOrderId) {
          let relatedList = []
          try {
            relatedList = typeof po.related_sales_orders === 'string'
              ? JSON.parse(po.related_sales_orders)
              : po.related_sales_orders
          } catch {}
          if (relatedList.length > 1) {
            let soDemand = 0
            let totalDemand = 0
            for (const rel of relatedList) {
              const qty = parseFloat(rel.quantity) || 0
              totalDemand += qty
              if (rel.sales_order_id === currentSalesOrderId) soDemand += qty
            }
            expenseRatio = totalDemand > 0 ? soDemand / totalDemand : 1
          }
        }

        // 入库费用按统一比例分摊（当没有任何数量分配给当前SO时跳过，避免费用被清零）
        if (expenseRatio > 0) {
          for (const woExpenses of woExpensesList) {
            warehousingExpensesTotal.tariff += (parseFloat(woExpenses.tariff) || 0) * expenseRatio
            warehousingExpensesTotal.transportationFee += (parseFloat(woExpenses.transportationFee) || 0) * expenseRatio
            warehousingExpensesTotal.customsFee += (parseFloat(woExpenses.customsFee) || 0) * expenseRatio
            warehousingExpensesTotal.otherFee += (parseFloat(woExpenses.otherFee) || 0) * expenseRatio
          }
        }

        // 采购费用按统一比例分摊（当没有任何数量分配给当前SO时跳过）
        if (expenseRatio > 0) {
          let poExpenses = {}
          try {
            poExpenses = JSON.parse(po.expenses || '{}')
          } catch (e) {
            poExpenses = {}
          }
          poTransportationFee += (parseFloat(poExpenses.transportationFee) || 0) * expenseRatio
          poOperatingExpenses += (parseFloat(poExpenses.operatingExpenses) || 0) * expenseRatio
          poValueAddedTax += (parseFloat(poExpenses.valueAddedTax) || 0) * expenseRatio
          poHandlingFee += (parseFloat(poExpenses.handlingFee) || 0) * expenseRatio
          poOtherFee += (parseFloat(poExpenses.otherFee) || 0) * expenseRatio
        }
      }

      // 同一SO拆分为多个出库单时，按金额比例分摊成本和费用，避免重复统计
      let deliveryTotalAmount = 0
      try {
        const allItems = JSON.parse(order.delivery_items || '[]')
        deliveryTotalAmount = allItems.reduce((sum, item) => {
          const q = parseFloat(item.quantity) || 0
          const p = parseFloat(item.tax_included_price) || 0
          return sum + (parseFloat(item.amount) || q * p)
        }, 0)
      } catch {}
      const soTotalAmount = (order.contract_number && contractTotalAmountMap[order.contract_number]) || 0
      const soShare = soTotalAmount > 0 ? (deliveryTotalAmount / soTotalAmount) : 1

      // 按 soShare 分摊采购费用和入库费用
      poTransportationFee *= soShare
      poOperatingExpenses *= soShare
      poValueAddedTax *= soShare
      poHandlingFee *= soShare
      poOtherFee *= soShare
      warehousingExpensesTotal.tariff *= soShare
      warehousingExpensesTotal.transportationFee *= soShare
      warehousingExpensesTotal.customsFee *= soShare
      warehousingExpensesTotal.otherFee *= soShare

      purchaseExpenseTotal = poTransportationFee + poOperatingExpenses + poValueAddedTax + poHandlingFee + poOtherFee

      const warehousingExpenseTotal = warehousingExpensesTotal.tariff +
        warehousingExpensesTotal.transportationFee +
        warehousingExpensesTotal.customsFee +
        warehousingExpensesTotal.otherFee

      // 每个商品生成一行（应收金额等订单级别字段只在第一行显示，避免汇总时重复累加）
      for (let itemIndex = 0; itemIndex < filteredItems.length; itemIndex++) {
        const item = filteredItems[itemIndex]
        const productCode = item.product_code || ''
        const quantity = parseFloat(item.quantity) || 0
        const taxIncludedPrice = parseFloat(item.tax_included_price) || 0
        const amount = parseFloat(item.amount) || (quantity * taxIncludedPrice)
        // 税率缺失/非法时兜底13（?? 13 对 NaN/0 无效，需显式判断；0 是合法税率如出口免税）
        const parsedTaxRate = parseFloat(item.tax_rate)
        const taxRate = Number.isFinite(parsedTaxRate) ? parsedTaxRate : 13
        const unitPriceExcluded = taxIncludedPrice / (1 + taxRate / 100)
        const amountExcluded = quantity * unitPriceExcluded

        // 匹配入库数据（汇总所有包含该产品代码的采购订单的入库数据）
        let totalWhQty = 0
        let totalWhPrice = 0
        let totalWhPriceExcluded = 0
        for (const po of purchaseOrders) {
          const mapKey = `${po.purchase_order_id}_${productCode}`
          if (warehousingItemMap[mapKey] && warehousingItemMap[mapKey].quantity > 0) {
            totalWhQty += warehousingItemMap[mapKey].quantity
            totalWhPrice += warehousingItemMap[mapKey].total_price
            totalWhPriceExcluded += warehousingItemMap[mapKey].total_price_excluded || 0
          }
        }
        const hasWarehousing = totalWhQty > 0

        // 入库数量 = 出库数量
        let warehousingQuantity = 0
        let warehousingUnitPriceExcluded = 0
        let warehousingUnitPriceIncluded = 0
        let warehousingAmount = 0
        let warehousingAmountIncluded = 0

        if (hasWarehousing) {
          warehousingQuantity = quantity
          // 使用加权平均单价：总金额 / 总数量（未税金额按入库明细各自税率逐行去税后汇总）
          warehousingUnitPriceIncluded = totalWhQty > 0 ? (totalWhPrice / totalWhQty) : 0
          warehousingUnitPriceExcluded = totalWhQty > 0 ? (totalWhPriceExcluded / totalWhQty) : 0
          warehousingAmountIncluded = quantity * warehousingUnitPriceIncluded
          warehousingAmount = quantity * warehousingUnitPriceExcluded
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

        // 费用分摊：入库费用按数量比例，其他费用按金额比例
        const itemRatio = orderTotalAmount > 0 ? amount / orderTotalAmount : 0
        const qtyRatio = orderTotalQty > 0 ? quantity / orderTotalQty : 0

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
        const itemPoTransportation = round4(poTransportationFee * itemRatio)
        const itemPoOperating = round4(poOperatingExpenses * itemRatio)
        const itemPoVat = round4(poValueAddedTax * itemRatio)
        const itemPoHandling = round4(poHandlingFee * itemRatio)
        const itemPoOther = round4(poOtherFee * itemRatio)
        const itemPoTotal = round4(purchaseExpenseTotal * itemRatio)

        const itemSlTransportation = round4(slTransportationFee * itemRatio)
        const itemSlHandling = round4(slHandlingFee * itemRatio)
        const itemSlOther = round4(slOtherFee * itemRatio)
        const itemSlTotal = round4(salesExpenseTotal * itemRatio)

        const itemWhTariff = round4(warehousingExpensesTotal.tariff * qtyRatio)
        const itemWhTransportation = round4(warehousingExpensesTotal.transportationFee * qtyRatio)
        const itemWhCustoms = round4(warehousingExpensesTotal.customsFee * qtyRatio)
        const itemWhOther = round4(warehousingExpensesTotal.otherFee * qtyRatio)
        const itemWhTotal = round4(warehousingExpenseTotal * qtyRatio)

        const itemDlExpress = round4(dlExpressFee * itemRatio)
        const itemDlTransportation = round4(dlTransportationFee * itemRatio)
        const itemDlCustoms = round4(dlCustomsFee * itemRatio)
        const itemDlOther = round4(dlOtherFee * itemRatio)
        const itemDlTotal = round4(deliveryExpenseTotal * itemRatio)

        // 费用合计（原币种）
        const totalExpense = itemPoTotal + itemSlTotal + itemWhTotal + itemDlTotal

        // ============ 汇率换算（统一使用海关汇率） ============
        const salesAmountIncludedCNY = amount * customsRate
        const salesAmountExcludedCNY = amountExcluded * customsRate

        // 采购成本和费用换算成CNY
        const warehousingAmountCNY = warehousingAmount * purchaseCustomsRate
        const totalExpenseCNY = totalExpense * purchaseCustomsRate

        // 总成本(CNY) = 采购成本(未税,CNY) + 费用合计(CNY)
        const totalCostCNY = warehousingAmountCNY + totalExpenseCNY

        // 毛利(CNY) = 销售收入(未税,CNY) - 总成本(CNY)
        const grossProfitCNY = salesAmountExcludedCNY - totalCostCNY

        // 毛利率（基于CNY计算）
        const grossProfitRate = salesAmountExcludedCNY > 0 ? (grossProfitCNY / salesAmountExcludedCNY * 100) : 0

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
          unit_price: round4(taxIncludedPrice),
          sales_amount_included: round4(amount),
          unit_price_excluded: round4(unitPriceExcluded),
          sales_amount_excluded: round4(amountExcluded),
          tax_rate: taxRate,
          // 结算信息（应收金额按每行销售额显示，避免汇总时重复累加）
          settlement_status: settlementStatusText,
          receivable_amount: round4(amount),
          received_amount: round4(receivedAmount),
          balance_amount: round4(balanceAmount),
          last_write_off_date: formatDateStr(lastWriteOffDate),
          last_write_off_number: lastWriteOffNumber,
          write_off_count: writeOffCount,
          // 出库成本（优先采购订单，兜底产品表）
          cost_unit_price_excluded: round4(warehousingUnitPriceExcluded),
          cost_unit_price_included: round4(warehousingUnitPriceIncluded),
          cost_amount_excluded: round4(warehousingAmount),
          cost_amount_included: round4(warehousingAmountIncluded),
          // 采购信息
          purchase_contract_number: purchaseContractNumber,
          purchase_person: purchasePerson,
          warehousing_date: formatDateStr(warehousingDate) || '',
          warehousing_quantity: warehousingQuantity,
          warehousing_unit_price_excluded: round4(warehousingUnitPriceExcluded),
          warehousing_unit_price_included: round4(warehousingUnitPriceIncluded),
          warehousing_amount: round4(warehousingAmount),
          warehousing_amount_included: round4(warehousingAmountIncluded),
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
          // 费用合计（原币种）
          total_expense: round4(totalExpense),
          // 总成本(CNY)
          total_cost: round4(totalCostCNY),
          // 毛利(CNY)
          gross_profit: round4(grossProfitCNY),
          gross_profit_rate: Math.round(grossProfitRate * 100) / 100,
          // 汇率信息
          currency: orderCurrency,
          purchase_currency: purchaseCurrency,
          customs_rate: Math.round(customsRate * 1000000) / 1000000,
          purchase_customs_rate: Math.round(purchaseCustomsRate * 1000000) / 1000000,
          sales_amount_included_cny: round4(salesAmountIncludedCNY),
          sales_amount_excluded_cny: round4(salesAmountExcludedCNY),
          warehousing_amount_cny: round4(warehousingAmountCNY),
          total_expense_cny: round4(totalExpenseCNY),
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