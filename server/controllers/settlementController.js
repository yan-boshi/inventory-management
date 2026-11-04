import pool from '../config/database.js'
import SettlementStatement from '../models/SettlementStatement.js'
import SettlementStatementItem from '../models/SettlementStatementItem.js'
import SettlementInvoiceRecord from '../models/SettlementInvoiceRecord.js'
import Receivable from '../models/Receivable.js'
import Payable from '../models/Payable.js'
import { handleDbError } from '../utils/errorHandler.js'
import { generateUUID } from '../utils/uuid.js'
import { round4 } from '../utils/round.js'
import { escapeLike } from '../utils/sql.js'
import { validateNonNegativeFields, validateNonNegativeAmounts } from '../utils/amountValidation.js'

// 对账单明细中需要非负校验的金额字段
const SETTLEMENT_ITEM_AMOUNT_FIELDS = ['amount', 'amount_with_tax']

// 获取下一个对账单编号
export const getNextStatementNumber = async (req, res) => {
  try {
    const statement_number = await SettlementStatement.generateStatementNumber()
    res.json({ success: true, data: { statement_number } })
  } catch (error) {
    console.error('获取对账单编号失败:', error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

// 根据已开票金额更新关联的应收/应付单的开票状态
const updateItemBillingStatus = async (items, invoicedAmount, conn = pool) => {
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
      await Receivable.update(item.source_id, { billing_status: billingStatus }, conn)
    } else if (item.source_type === 2 && item.source_id) {
      await Payable.update(item.source_id, { billing_status: billingStatus }, conn)
    }
  }
}

// 获取对账单列表
export const getSettlementList = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, type, billing_status, billing_month, settlement_date_start, settlement_date_end, document_date_start, document_date_end, entity_name } = req.query
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
      params.push(`%${escapeLike(entity_name)}%`)
    }

    // 制单日期范围筛选
    if (document_date_start) {
      where.push('document_date >= ?')
      params.push(document_date_start)
    }

    if (document_date_end) {
      where.push('document_date <= ?')
      params.push(document_date_end)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await SettlementStatement.paginate({
      where: whereClause,
      orderBy: 'create_time DESC',
      page,
      pageSize,
      params
    })

    // 将 billing_month 映射为 settlement_date 供前端使用
    const rows = result.data.map(row => ({
      ...row,
      settlement_date: row.billing_month || null,
    }))

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages
      }
    })
  } catch (error) {
    console.error('获取对账单列表失败:', error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
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
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
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

    // 获取开票记录
    const invoice_records = await SettlementInvoiceRecord.findByStatementId(id)

    res.json({
      success: true,
      data: {
        ...statement,
        settlement_date: statement.billing_month || null,
        items,
        invoice_records
      }
    })
  } catch (error) {
    console.error('获取对账单详情失败:', error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

// 创建对账单
export const createSettlement = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const {
      type, entity_id, entity_name, billing_month, settlement_date, payment_method,
      sales_amount, is_invoiced, invoice_date, invoice_number,
      handling_fee, document_date, total_amount, invoiced_amount, uninvoiced_amount,
      billing_status, remarks, items, invoice_records
    } = req.body

    // 兼容前端发送的 settlement_date，映射到 billing_month
    const resolvedBillingMonth = billing_month || (settlement_date ? settlement_date.substring(0, 7) : null)

    if (!type || !entity_id) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    // 金额/手续费必须非负（缺省不管，传了就必须是有限非负数字）
    const amountError = validateNonNegativeFields({ handling_fee, total_amount }, ['handling_fee', 'total_amount'])
      || validateNonNegativeAmounts(items, SETTLEMENT_ITEM_AMOUNT_FIELDS)
    if (amountError) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: amountError })
    }

    // 生成对账单编号和ID
    const statement_number = await SettlementStatement.generateStatementNumber()
    const statementId = generateUUID()

    // sales_amount 和 total_amount 默认为 0，避免 NOT NULL 约束报错
    const resolvedSalesAmount = sales_amount || total_amount || 0
    const resolvedTotalAmount = total_amount || 0
    const resolvedInvoicedAmount = invoiced_amount || 0
    const resolvedUninvoicedAmount = uninvoiced_amount || 0
    const resolvedHandlingFee = handling_fee || 0

    // 创建对账单
    await connection.query(
      `INSERT INTO settlement_statements (
        statement_id, statement_number, type, entity_id, entity_name, billing_month, payment_method,
        sales_amount, is_invoiced, invoice_date, invoice_number,
        handling_fee, document_date, total_amount, invoiced_amount, uninvoiced_amount,
        billing_status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        statementId, statement_number, type, entity_id, entity_name, resolvedBillingMonth, payment_method,
        resolvedSalesAmount, is_invoiced, invoice_date, invoice_number,
        resolvedHandlingFee, document_date, resolvedTotalAmount, resolvedInvoicedAmount, resolvedUninvoicedAmount,
        billing_status, remarks
      ]
    )

    // 创建明细
    if (items && items.length > 0) {
      for (const item of items) {
        // amount 默认使用 amount_with_tax
        const itemId = generateUUID()
        const resolvedItemAmount = item.amount || item.amount_with_tax || 0
        const resolvedQuantity = item.quantity || 0
        const resolvedUnitPrice = item.unit_price || 0
        const resolvedAmountWithTax = item.amount_with_tax || 0

        await connection.query(
          `INSERT INTO settlement_statement_items (
            item_id, statement_id, source_type, source_id, amount, delivery_date, delivery_number,
            product_code, product_name, product_model, product_description,
            quantity, currency, unit, unit_price, amount_with_tax, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId, statementId, item.source_type, item.source_id, resolvedItemAmount, item.delivery_date, item.delivery_number,
            item.product_code, item.product_name, item.product_model, item.product_description,
            resolvedQuantity, item.currency, item.unit, resolvedUnitPrice, resolvedAmountWithTax, item.remarks
          ]
        )
      }

      // 将手续费均分给每个应收/应付单
      if (handling_fee && handling_fee > 0 && items.length > 0) {
        const feePerItem = round4(handling_fee / items.length)

        for (const item of items) {
          if (item.source_type === 1) {
            // 应收单
            await connection.query(
              'UPDATE receivables SET handling_fee = ? WHERE receivable_id = ?',
              [feePerItem, item.source_id]
            )
          } else if (item.source_type === 2) {
            // 应付单
            await connection.query(
              'UPDATE payables SET handling_fee = ? WHERE payable_id = ?',
              [feePerItem, item.source_id]
            )
          }
        }
      }

      // 根据已开票金额更新关联的应收/应付单的开票状态
      await updateItemBillingStatus(items, resolvedInvoicedAmount, connection)
    }

    // 创建开票记录
    if (invoice_records && invoice_records.length > 0) {
      for (const record of invoice_records) {
        const invoiceRecordId = generateUUID()
        await connection.query(
          `INSERT INTO settlement_invoice_records (
            invoice_record_id, statement_id, invoice_date, invoice_number, invoiced_amount, uninvoiced_amount
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [invoiceRecordId, statementId, record.invoice_date, record.invoice_number, record.invoiced_amount, record.uninvoiced_amount]
        )
      }
    }

    await connection.commit()

    const statement = await SettlementStatement.findById(statementId)
    res.status(201).json({ success: true, data: statement })
  } catch (error) {
    try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
    const { statusCode, message } = handleDbError(error, '创建对账单')
    res.status(statusCode).json({ success: false, message })
  } finally {
    connection.release()
  }
}

// 更新对账单
export const updateSettlement = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params
    const {
      type, entity_id, entity_name, billing_month, settlement_date, payment_method,
      sales_amount, is_invoiced, invoice_date, invoice_number, document_date,
      total_amount, invoiced_amount, uninvoiced_amount, billing_status,
      handling_fee, remarks, items, invoice_records
    } = req.body

    // 兼容前端发送的 settlement_date，映射到 billing_month
    const resolvedBillingMonth = billing_month || (settlement_date ? settlement_date.substring(0, 7) : null)

    // 金额/手续费必须非负（缺省不管，传了就必须是有限非负数字）
    const amountError = validateNonNegativeFields({ handling_fee, total_amount }, ['handling_fee', 'total_amount'])
      || validateNonNegativeAmounts(items, SETTLEMENT_ITEM_AMOUNT_FIELDS)
    if (amountError) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: amountError })
    }

    const existing = await SettlementStatement.findById(id, connection)
    if (!existing) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: '对账单不存在' })
    }

    // 更新对账单
    const updateData = {}
    if (type !== undefined) updateData.type = type
    if (entity_id !== undefined) updateData.entity_id = entity_id
    if (entity_name !== undefined) updateData.entity_name = entity_name
    if (resolvedBillingMonth !== undefined) updateData.billing_month = resolvedBillingMonth
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

    const statement = await SettlementStatement.update(id, updateData, connection)

    // 如果提供了新的明细，更新明细
    if (items) {
      // 先取旧明细：被移除的行/手续费清零场景要还原其 handling_fee
      const oldItems = await SettlementStatementItem.findByStatementId(id, connection)

      // 删除旧明细
      await SettlementStatementItem.deleteByStatementId(id, connection)

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
        }, connection)
      }

      // 手续费同步（对称）：先清被移除旧行的手续费，再给新明细均分——
      // 原来只在 fee>0 时覆盖，删行/清零不还原，会把手续费残留在应收/应付上
      const totalFee = handling_fee !== undefined
        ? (parseFloat(handling_fee) || 0)
        : (parseFloat(existing.handling_fee) || 0)
      const touchedKeys = new Set(items.map(i => `${i.source_type}:${i.source_id}`))
      for (const old of oldItems) {
        const key = `${old.source_type}:${old.source_id}`
        if (touchedKeys.has(key)) continue
        if (old.source_type === 1 && old.source_id) {
          await Receivable.update(old.source_id, { handling_fee: 0 }, connection)
        } else if (old.source_type === 2 && old.source_id) {
          await Payable.update(old.source_id, { handling_fee: 0 }, connection)
        }
      }
      const feePerItem = items.length > 0 ? round4(totalFee / items.length) : 0
      let feeAssigned = 0
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        // 尾差给最后一行，保证分摊合计 = 总手续费
        const fee = i < items.length - 1 ? feePerItem : round4(totalFee - feeAssigned)
        feeAssigned = round4(feeAssigned + fee)
        if (item.source_type === 1 && item.source_id) {
          await Receivable.update(item.source_id, { handling_fee: fee }, connection)
        } else if (item.source_type === 2 && item.source_id) {
          await Payable.update(item.source_id, { handling_fee: fee }, connection)
        }
      }

      // 根据已开票金额更新关联的应收/应付单的开票状态
      // 请求未带 invoiced_amount 时取原值，避免把开票状态全部清零
      await updateItemBillingStatus(
        items,
        invoiced_amount !== undefined ? invoiced_amount : existing.invoiced_amount,
        connection
      )
    }

    // 更新开票记录
    if (invoice_records !== undefined) {
      // 删除旧的开票记录
      await SettlementInvoiceRecord.deleteByStatementId(id, connection)

      // 创建新的开票记录
      if (invoice_records && invoice_records.length > 0) {
        for (const record of invoice_records) {
          await SettlementInvoiceRecord.create({
            statement_id: id,
            invoice_date: record.invoice_date,
            invoice_number: record.invoice_number,
            invoiced_amount: record.invoiced_amount,
            uninvoiced_amount: record.uninvoiced_amount
          }, connection)
        }
      }
    }

    await connection.commit()
    res.json({ success: true, data: statement })
  } catch (error) {
    try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
    const { statusCode, message } = handleDbError(error, '更新对账单')
    res.status(statusCode).json({ success: false, message })
  } finally {
    connection.release()
  }
}

// 删除对账单
export const deleteSettlement = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params

    const existing = await SettlementStatement.findById(id, connection)
    if (!existing) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: '对账单不存在' })
    }

    // 删除前还原写到应收/应付上的手续费与开票状态（明细/开票记录由外键级联删除）
    const items = await SettlementStatementItem.findByStatementId(id, connection)
    for (const item of items) {
      if (!item.source_id) continue
      if (item.source_type === 1) {
        await Receivable.update(item.source_id, { handling_fee: 0, billing_status: 0 }, connection)
      } else if (item.source_type === 2) {
        await Payable.update(item.source_id, { handling_fee: 0, billing_status: 0 }, connection)
      }
    }

    await SettlementStatement.delete(id, connection)

    await connection.commit()
    res.json({ success: true, message: '对账单删除成功' })
  } catch (error) {
    try { await connection.rollback() } catch (e) { console.error('rollback failed:', e) }
    const { statusCode, message } = handleDbError(error, '删除对账单')
    res.status(statusCode).json({ success: false, message })
  } finally {
    connection.release()
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
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
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
          unit_price: item.tax_included_price,
          amount_with_tax: (item.quantity || 0) * (item.tax_included_price || 0),
          remarks: item.remarks
        }))
      }
    }

    res.json({ success: true, data: items })
  } catch (error) {
    console.error('获取订单商品信息失败:', error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}
