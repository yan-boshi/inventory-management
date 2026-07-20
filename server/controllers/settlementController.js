import pool from '../config/database.js'
import SettlementStatement from '../models/SettlementStatement.js'
import SettlementStatementItem from '../models/SettlementStatementItem.js'
import Receivable from '../models/Receivable.js'
import Payable from '../models/Payable.js'

// 根据已开票金额更新关联的应收/应付单的开票状态
const updateItemBillingStatus = async (items, invoicedAmount) => {
  let remainingInvoiced = invoicedAmount || 0

  for (const item of items) {
    const itemAmount = item.amount_with_tax || 0
    let billingStatus = 0 // 0=未开票

    if (remainingInvoiced >= itemAmount) {
      // 已开票金额足够覆盖该单据，状态为已开票
      billingStatus = 1
      remainingInvoiced -= itemAmount
    } else if (remainingInvoiced > 0) {
      // 已开票金额部分覆盖该单据，状态为部分开票
      billingStatus = 2
      remainingInvoiced = 0
    }
    // 否则状态为未开票 (billingStatus = 0)

    // 更新对应的应收/应付单的开票状态
    if (item.source_type === 1 && item.source_id) {
      await Receivable.update(item.source_id, { billing_status: billingStatus })
    } else if (item.source_type === 2 && item.source_id) {
      await Payable.update(item.source_id, { billing_status: billingStatus })
    }
  }
}

// 获取对账单列表
export const getSettlementList = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, type, billing_status, billing_month, settlement_date_start, settlement_date_end, entity_name } = req.query
    const where = []
    const params = []

    if (type !== undefined && type !== '' && type !== null) {
      where.push('type = ?')
      params.push(parseInt(type))
    }

    if (billing_status !== undefined && billing_status !== '' && billing_status !== null) {
      where.push('billing_status = ?')
      params.push(parseInt(billing_status))
    }

    if (billing_month) {
      where.push('billing_month = ?')
      params.push(billing_month)
    }

    // 支持日期范围筛选（转换为billing_month筛选）
    if (settlement_date_start) {
      const startMonth = settlement_date_start.substring(0, 7) // 提取 YYYY-MM
      where.push('billing_month >= ?')
      params.push(startMonth)
    }

    if (settlement_date_end) {
      const endMonth = settlement_date_end.substring(0, 7) // 提取 YYYY-MM
      where.push('billing_month <= ?')
      params.push(endMonth)
    }

    if (entity_name) {
      where.push('entity_name LIKE ?')
      params.push(`%${entity_name}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await SettlementStatement.paginate({
      where: whereClause,
      orderBy: 'create_time DESC',
      page,
      pageSize,
      params
    })

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages
      }
    })
  } catch (error) {
    console.error('获取对账单列表失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取汇总统计
export const getSettlementSummary = async (req, res) => {
  try {
    const { billing_month, settlement_date_start, settlement_date_end } = req.query

    const where = []
    const params = []

    if (billing_month) {
      where.push('billing_month = ?')
      params.push(billing_month)
    }

    // 支持日期范围筛选（转换为billing_month筛选）
    if (settlement_date_start) {
      const startMonth = settlement_date_start.substring(0, 7) // 提取 YYYY-MM
      where.push('billing_month >= ?')
      params.push(startMonth)
    }

    if (settlement_date_end) {
      const endMonth = settlement_date_end.substring(0, 7) // 提取 YYYY-MM
      where.push('billing_month <= ?')
      params.push(endMonth)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    // 汇总统计
    const [summary] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 1 THEN total_amount ELSE 0 END), 0) as total_receivable,
        COALESCE(SUM(CASE WHEN type = 2 THEN total_amount ELSE 0 END), 0) as total_payable,
        COALESCE(SUM(CASE WHEN type = 1 THEN invoiced_amount ELSE 0 END), 0) as invoiced_receivable,
        COALESCE(SUM(CASE WHEN type = 2 THEN invoiced_amount ELSE 0 END), 0) as invoiced_payable,
        COALESCE(SUM(CASE WHEN type = 1 THEN uninvoiced_amount ELSE 0 END), 0) as uninvoiced_receivable,
        COALESCE(SUM(CASE WHEN type = 2 THEN uninvoiced_amount ELSE 0 END), 0) as uninvoiced_payable
      FROM settlement_statements
      ${whereClause}
    `, params)

    const data = summary[0]
    const totalReceivable = data.total_receivable
    const totalPayable = data.total_payable

    res.json({
      success: true,
      data: {
        total_receivable: totalReceivable,
        total_payable: totalPayable,
        net_amount: totalReceivable - totalPayable,
        invoiced_receivable: data.invoiced_receivable,
        invoiced_payable: data.invoiced_payable,
        uninvoiced_receivable: data.uninvoiced_receivable,
        uninvoiced_payable: data.uninvoiced_payable
      }
    })
  } catch (error) {
    console.error('获取对账单汇总失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取详情
export const getSettlementById = async (req, res) => {
  try {
    const { id } = req.params

    const statement = await SettlementStatement.findById(id)
    if (!statement) {
      return res.status(404).json({ success: false, message: '对账单不存在' })
    }

    // 获取关联的明细
    const items = await SettlementStatementItem.findByStatementId(id)

    res.json({
      success: true,
      data: {
        ...statement,
        items
      }
    })
  } catch (error) {
    console.error('获取对账单详情失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 创建对账单
export const createSettlement = async (req, res) => {
  try {
    const {
      type, entity_id, entity_name, billing_month, payment_method,
      sales_amount, is_invoiced, invoice_date, invoice_number,
      handling_fee, document_date, total_amount, invoiced_amount, uninvoiced_amount,
      billing_status, remarks, items
    } = req.body

    if (!type || !entity_id) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    // 生成对账单编号
    const statement_number = await SettlementStatement.generateStatementNumber()

    // 创建对账单
    const statement = await SettlementStatement.create({
      statement_number,
      type,
      entity_id,
      entity_name,
      billing_month,
      payment_method,
      sales_amount,
      is_invoiced,
      invoice_date,
      invoice_number,
      handling_fee,
      document_date,
      total_amount,
      invoiced_amount,
      uninvoiced_amount,
      billing_status,
      remarks
    })

    // 创建明细
    if (items && items.length > 0) {
      for (const item of items) {
        await SettlementStatementItem.create({
          statement_id: statement.statement_id,
          source_type: item.source_type,
          source_id: item.source_id,
          amount: item.amount,
          delivery_date: item.delivery_date,
          delivery_number: item.delivery_number,
          product_code: item.product_code,
          product_name: item.product_name,
          product_model: item.product_model,
          product_description: item.product_description,
          quantity: item.quantity,
          currency: item.currency,
          unit: item.unit,
          unit_price: item.unit_price,
          amount_with_tax: item.amount_with_tax,
          remarks: item.remarks
        })
      }

      // 将手续费均分给每个应收/应付单
      if (handling_fee && handling_fee > 0 && items.length > 0) {
        const feePerItem = parseFloat((handling_fee / items.length).toFixed(2))

        for (const item of items) {
          if (item.source_type === 1) {
            // 应收单
            await Receivable.update(item.source_id, { handling_fee: feePerItem })
          } else if (item.source_type === 2) {
            // 应付单
            await Payable.update(item.source_id, { handling_fee: feePerItem })
          }
        }
      }

      // 根据已开票金额更新关联的应收/应付单的开票状态
      await updateItemBillingStatus(items, invoiced_amount)
    }

    res.status(201).json({ success: true, data: statement })
  } catch (error) {
    console.error('创建对账单失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 更新对账单
export const updateSettlement = async (req, res) => {
  try {
    const { id } = req.params
    const {
      billing_month, payment_method, sales_amount, is_invoiced,
      invoice_date, invoice_number, document_date, total_amount,
      invoiced_amount, uninvoiced_amount, billing_status, handling_fee, remarks, items
    } = req.body

    const existing = await SettlementStatement.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '对账单不存在' })
    }

    // 更新对账单
    const updateData = {}
    if (billing_month !== undefined) updateData.billing_month = billing_month
    if (payment_method !== undefined) updateData.payment_method = payment_method
    if (sales_amount !== undefined) updateData.sales_amount = sales_amount
    if (is_invoiced !== undefined) updateData.is_invoiced = is_invoiced
    if (invoice_date !== undefined) updateData.invoice_date = invoice_date
    if (invoice_number !== undefined) updateData.invoice_number = invoice_number
    if (document_date !== undefined) updateData.document_date = document_date
    if (total_amount !== undefined) updateData.total_amount = total_amount
    if (invoiced_amount !== undefined) updateData.invoiced_amount = invoiced_amount
    if (uninvoiced_amount !== undefined) updateData.uninvoiced_amount = uninvoiced_amount
    if (billing_status !== undefined) updateData.billing_status = billing_status
    if (handling_fee !== undefined) updateData.handling_fee = handling_fee
    if (remarks !== undefined) updateData.remarks = remarks

    const statement = await SettlementStatement.update(id, updateData)

    // 如果提供了新的明细，更新明细
    if (items) {
      // 删除旧明细
      await SettlementStatementItem.deleteByStatementId(id)

      // 创建新明细
      for (const item of items) {
        await SettlementStatementItem.create({
          statement_id: id,
          source_type: item.source_type,
          source_id: item.source_id,
          amount: item.amount,
          delivery_date: item.delivery_date,
          delivery_number: item.delivery_number,
          product_code: item.product_code,
          product_name: item.product_name,
          product_model: item.product_model,
          product_description: item.product_description,
          quantity: item.quantity,
          currency: item.currency,
          unit: item.unit,
          unit_price: item.unit_price,
          amount_with_tax: item.amount_with_tax,
          remarks: item.remarks
        })
      }

      // 将手续费均分给每个应收/应付单
      if (handling_fee && handling_fee > 0 && items.length > 0) {
        const feePerItem = parseFloat((handling_fee / items.length).toFixed(2))

        for (const item of items) {
          if (item.source_type === 1) {
            // 应收单
            await Receivable.update(item.source_id, { handling_fee: feePerItem })
          } else if (item.source_type === 2) {
            // 应付单
            await Payable.update(item.source_id, { handling_fee: feePerItem })
          }
        }
      }

      // 根据已开票金额更新关联的应收/应付单的开票状态
      await updateItemBillingStatus(items, invoiced_amount)
    }

    res.json({ success: true, data: statement })
  } catch (error) {
    console.error('更新对账单失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 删除对账单
export const deleteSettlement = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await SettlementStatement.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '对账单不存在' })
    }

    await SettlementStatement.delete(id)

    res.json({ success: true, message: '对账单删除成功' })
  } catch (error) {
    console.error('删除对账单失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 根据条件获取未开票的应收/应付记录
export const getUninvoicedRecords = async (req, res) => {
  try {
    const { type, settlement_date_start, settlement_date_end, entity_id } = req.query

    if (!type || !settlement_date_start || !settlement_date_end || !entity_id) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    let records = []
    if (parseInt(type) === 1) {
      // 应收：从应收账款表获取未开票记录，匹配结算日期范围
      const [rows] = await pool.query(`
        SELECT r.*, d.delivery_time, d.order_number as delivery_number
        FROM receivables r
        LEFT JOIN delivery_orders d ON r.source_bill_id = d.order_number
        WHERE r.customer_id = ?
          AND r.billing_status = 0
          AND r.due_date >= ?
          AND r.due_date <= ?
        ORDER BY r.create_time DESC
      `, [entity_id, settlement_date_start, settlement_date_end])
      records = rows
    } else {
      // 应付：从应付账款表获取未开票记录，匹配结算日期范围
      const [rows] = await pool.query(`
        SELECT p.*, w.warehousing_time, w.order_number as warehousing_number
        FROM payables p
        LEFT JOIN warehousing_orders w ON p.source_bill_id = w.order_number
        WHERE p.supplier_id = ?
          AND p.billing_status = 0
          AND p.due_date >= ?
          AND p.due_date <= ?
        ORDER BY p.create_time DESC
      `, [entity_id, settlement_date_start, settlement_date_end])
      records = rows
    }

    res.json({ success: true, data: records })
  } catch (error) {
    console.error('获取未开票记录失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取出库单/入库单的商品信息
export const getOrderItems = async (req, res) => {
  try {
    const { type, order_number } = req.query

    if (!type || !order_number) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    let items = []
    if (parseInt(type) === 1) {
      // 出库单商品信息 - 从 delivery_orders 表获取 delivery_items JSON 字段
      const [rows] = await pool.query(`
        SELECT delivery_items
        FROM delivery_orders
        WHERE order_number = ?
      `, [order_number])

      if (rows.length > 0 && rows[0].delivery_items) {
        const deliveryItems = typeof rows[0].delivery_items === 'string'
          ? JSON.parse(rows[0].delivery_items)
          : rows[0].delivery_items

        items = deliveryItems.map(item => ({
          product_code: item.product_code,
          product_name: item.product_name,
          product_model: item.model,
          product_description: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.tax_included_price,
          amount_with_tax: item.amount,
          remarks: item.remarks
        }))
      }
    } else {
      // 入库单商品信息 - 从 warehousing_orders 表获取 warehousing_items JSON 字段
      const [rows] = await pool.query(`
        SELECT warehousing_items
        FROM warehousing_orders
        WHERE order_number = ?
      `, [order_number])

      if (rows.length > 0 && rows[0].warehousing_items) {
        const warehousingItems = typeof rows[0].warehousing_items === 'string'
          ? JSON.parse(rows[0].warehousing_items)
          : rows[0].warehousing_items

        items = warehousingItems.map(item => ({
          product_code: item.product_code,
          product_name: item.product_name,
          product_model: item.model,
          product_description: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          amount_with_tax: item.amount,
          remarks: item.remarks
        }))
      }
    }

    res.json({ success: true, data: items })
  } catch (error) {
    console.error('获取订单商品信息失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}
