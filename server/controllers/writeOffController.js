import pool from '../config/database.js'
import WriteOffDocument from '../models/WriteOffDocument.js'
import WriteOffItem from '../models/WriteOffItem.js'

// 同步核销信息到销售订单/采购订单的商品信息
async function syncOrderSettlementInfo(connection, type, sourceBillId, writeOffDate, afterReceived, balanceAmount, calcStatus) {
  const statusText = calcStatus === 2 ? '全部结算' : calcStatus === 1 ? '部分结算' : '未结算'

  if (parseInt(type) === 1) {
    // 应收核销 → 更新销售订单
    // 通过出库单号找到合同号，再通过合同号找到销售订单
    const [deliveryRows] = await connection.query(
      'SELECT contract_number FROM delivery_orders WHERE order_number = ? LIMIT 1',
      [sourceBillId]
    )
    if (deliveryRows.length > 0 && deliveryRows[0].contract_number) {
      const contractNumber = deliveryRows[0].contract_number
      const [salesRows] = await connection.query(
        'SELECT sales_order_id, sales_items FROM sales_orders WHERE contract_number = ? FOR UPDATE',
        [contractNumber]
      )
      if (salesRows.length > 0) {
        const salesOrder = salesRows[0]
        let salesItems = []
        try { salesItems = JSON.parse(salesOrder.sales_items || '[]') } catch { }

        for (const item of salesItems) {
          item.settlement_date = writeOffDate
          item.settlement_amount = afterReceived
          item.unsettled_amount = balanceAmount
          item.settlement_status = statusText
        }

        await connection.query(
          'UPDATE sales_orders SET sales_items = ? WHERE sales_order_id = ?',
          [JSON.stringify(salesItems), salesOrder.sales_order_id]
        )
      }
    }
  } else {
    // 应付核销 → 更新采购订单
    // 通过入库单号找到合同号，再通过合同号找到采购订单
    const [warehousingRows] = await connection.query(
      'SELECT contract_number FROM warehousing_orders WHERE order_number = ? LIMIT 1',
      [sourceBillId]
    )
    if (warehousingRows.length > 0 && warehousingRows[0].contract_number) {
      const contractNumber = warehousingRows[0].contract_number
      const [purchaseRows] = await connection.query(
        'SELECT purchase_order_id, purchase_items FROM purchase_orders WHERE contract_number = ? FOR UPDATE',
        [contractNumber]
      )
      if (purchaseRows.length > 0) {
        const purchaseOrder = purchaseRows[0]
        let purchaseItems = []
        try { purchaseItems = JSON.parse(purchaseOrder.purchase_items || '[]') } catch { }

        for (const item of purchaseItems) {
          item.settlement_date = writeOffDate
          item.settlement_amount = afterReceived
          item.unsettled_amount = balanceAmount
          item.settlement_status = statusText
        }

        await connection.query(
          'UPDATE purchase_orders SET purchase_items = ? WHERE purchase_order_id = ?',
          [JSON.stringify(purchaseItems), purchaseOrder.purchase_order_id]
        )
      }
    }
  }
}

// 获取下一个核销单编号
export const getNextWriteOffNumber = async (req, res) => {
  try {
    const write_off_number = await WriteOffDocument.generateWriteOffNumber()
    res.json({ success: true, data: { write_off_number } })
  } catch (error) {
    console.error('获取核销单编号失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取核销单列表
export const getWriteOffList = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, type, status, entity_name, write_off_date_start, write_off_date_end } = req.query
    const where = []
    const params = []

    if (type !== undefined && type !== '' && type !== null) {
      where.push('type = ?')
      params.push(parseInt(type))
    }

    if (status !== undefined && status !== '' && status !== null) {
      where.push('status = ?')
      params.push(parseInt(status))
    }

    if (entity_name) {
      where.push('entity_name LIKE ?')
      params.push(`%${entity_name}%`)
    }

    if (write_off_date_start) {
      where.push('write_off_date >= ?')
      params.push(write_off_date_start)
    }

    if (write_off_date_end) {
      where.push('write_off_date <= ?')
      params.push(write_off_date_end)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await WriteOffDocument.paginate({
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
    console.error('获取核销单列表失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取汇总统计
export const getWriteOffSummary = async (req, res) => {
  try {
    const { write_off_date_start, write_off_date_end } = req.query

    const where = []
    const params = []

    if (write_off_date_start) {
      where.push('write_off_date >= ?')
      params.push(write_off_date_start)
    }

    if (write_off_date_end) {
      where.push('write_off_date <= ?')
      params.push(write_off_date_end)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    const [summary] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 1 THEN total_amount ELSE 0 END), 0) as total_receivable_write_off,
        COALESCE(SUM(CASE WHEN type = 2 THEN total_amount ELSE 0 END), 0) as total_payable_write_off,
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN status = 1 THEN total_amount ELSE 0 END), 0) as active_total,
        COALESCE(SUM(CASE WHEN status = 0 THEN total_amount ELSE 0 END), 0) as voided_total
      FROM write_off_documents
      ${whereClause}
    `, params)

    const data = summary[0]

    res.json({
      success: true,
      data: {
        total_receivable_write_off: data.total_receivable_write_off,
        total_payable_write_off: data.total_payable_write_off,
        net_write_off: data.total_receivable_write_off - data.total_payable_write_off,
        total_count: data.total_count,
        active_total: data.active_total,
        voided_total: data.voided_total
      }
    })
  } catch (error) {
    console.error('获取核销单汇总失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取核销单详情
export const getWriteOffById = async (req, res) => {
  try {
    const { id } = req.params

    const document = await WriteOffDocument.findById(id)
    if (!document) {
      return res.status(404).json({ success: false, message: '核销单不存在' })
    }

    const items = await WriteOffItem.findByWriteOffId(id)

    res.json({
      success: true,
      data: {
        ...document,
        items
      }
    })
  } catch (error) {
    console.error('获取核销单详情失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 获取待核销的应收/应付账款
export const getPendingRecords = async (req, res) => {
  try {
    const { type, entity_id } = req.query

    if (!type || !entity_id) {
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    let records = []
    if (parseInt(type) === 1) {
      const [rows] = await pool.query(`
        SELECT
          receivable_id as record_id,
          source_bill_id,
          source_bill_type,
          amount,
          handling_fee,
          (amount + IFNULL(handling_fee, 0)) as receivable_total,
          IFNULL(received_amount, 0) as received_amount,
          (amount + IFNULL(handling_fee, 0) - IFNULL(received_amount, 0)) as balance_amount,
          status,
          payment_method,
          delivery_time
        FROM receivables
        WHERE customer_id = ?
          AND status IN (0, 1)
        ORDER BY create_time ASC
      `, [entity_id])
      records = rows
    } else {
      const [rows] = await pool.query(`
        SELECT
          payable_id as record_id,
          source_bill_id,
          source_bill_type,
          amount,
          handling_fee,
          (amount + IFNULL(handling_fee, 0)) as receivable_total,
          IFNULL(received_amount, 0) as received_amount,
          (amount + IFNULL(handling_fee, 0) - IFNULL(received_amount, 0)) as balance_amount,
          status,
          payment_method,
          warehousing_time
        FROM payables
        WHERE supplier_id = ?
          AND status IN (0, 1)
        ORDER BY create_time ASC
      `, [entity_id])
      records = rows
    }

    res.json({ success: true, data: records })
  } catch (error) {
    console.error('获取待核销记录失败:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 计算应收/应付状态
const calcStatus = (receivedAmount, totalAmount) => {
  if (receivedAmount <= 0) return 0
  if (receivedAmount >= totalAmount) return 2
  return 1
}

// 创建核销单
export const createWriteOff = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const {
      type, entity_id, entity_name, write_off_date,
      payment_method, bank_reference, remarks, document_date, items
    } = req.body

    if (!type || !entity_id || !write_off_date) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: '缺少必要参数' })
    }

    if (!items || items.length === 0) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: '核销明细不能为空' })
    }

    const tableName = parseInt(type) === 1 ? 'receivables' : 'payables'
    const idField = parseInt(type) === 1 ? 'receivable_id' : 'payable_id'

    let totalAmount = 0
    const processedItems = []

    for (const item of items) {
      if (!item.source_id || !item.write_off_amount || item.write_off_amount <= 0) {
        await connection.rollback()
        return res.status(400).json({ success: false, message: '核销金额必须大于0' })
      }

      // 行锁读取最新余额
      const [rows] = await connection.query(
        `SELECT * FROM ${tableName} WHERE ${idField} = ? FOR UPDATE`,
        [item.source_id]
      )

      if (rows.length === 0) {
        await connection.rollback()
        return res.status(400).json({ success: false, message: `记录 ${item.source_id} 不存在` })
      }

      const record = rows[0]
      const receivableTotal = parseFloat(record.amount) + parseFloat(record.handling_fee || 0)
      const currentReceived = parseFloat(record.received_amount || 0)
      const writeOffAmount = parseFloat(item.write_off_amount)

      if (currentReceived + writeOffAmount > receivableTotal + 0.0001) {
        await connection.rollback()
        return res.status(400).json({
          success: false,
          message: `单据 ${record.source_bill_id} 核销金额超出未核销余额（待核销：${(receivableTotal - currentReceived).toFixed(4)}）`
        })
      }

      const afterReceived = currentReceived + writeOffAmount
      const newStatus = calcStatus(afterReceived, receivableTotal)

      // 更新应收/应付
      await connection.query(
        `UPDATE ${tableName} SET received_amount = ?, balance_amount = ?, status = ? WHERE ${idField} = ?`,
        [afterReceived, receivableTotal - afterReceived, newStatus, item.source_id]
      )

      // 同步核销信息到销售订单/采购订单（失败不影响核销单保存）
      const billId = item.source_bill_id || record.source_bill_id
      try {
        await syncOrderSettlementInfo(connection, type, billId, write_off_date, afterReceived, receivableTotal - afterReceived, newStatus)
      } catch (syncErr) {
        console.error('同步订单结算信息失败（不影响核销单）:', syncErr.message)
      }

      processedItems.push({
        source_id: item.source_id,
        source_bill_id: billId,
        target_amount: receivableTotal,
        write_off_amount: writeOffAmount,
        before_received: currentReceived,
        after_received: afterReceived,
        remarks: item.remarks || null
      })

      totalAmount += writeOffAmount
    }

    // 生成核销单编号
    const write_off_number = await WriteOffDocument.generateWriteOffNumber()

    // 创建核销单主表
    const document = await WriteOffDocument.create({
      write_off_number,
      type,
      entity_id,
      entity_name,
      write_off_date,
      total_amount: totalAmount,
      payment_method,
      bank_reference,
      remarks,
      status: 1,
      document_date
    })

    // 创建核销单明细
    for (const pItem of processedItems) {
      await WriteOffItem.create({
        write_off_id: document.write_off_id,
        source_type: parseInt(type),
        ...pItem
      })
    }

    await connection.commit()

    // 返回完整核销单
    const result = await WriteOffDocument.findById(document.write_off_id)
    const resultItems = await WriteOffItem.findByWriteOffId(document.write_off_id)

    res.status(201).json({
      success: true,
      data: { ...result, items: resultItems }
    })
  } catch (error) {
    await connection.rollback()
    console.error('创建核销单失败:', error)
    res.status(500).json({ success: false, message: error.message })
  } finally {
    connection.release()
  }
}

// 编辑核销单
export const updateWriteOff = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params
    const {
      entity_name, write_off_date, payment_method, bank_reference,
      remarks, document_date, items
    } = req.body

    const existing = await WriteOffDocument.findById(id)
    if (!existing) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: '核销单不存在' })
    }

    if (existing.status === 0) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: '已作废的核销单不可编辑' })
    }

    const tableName = parseInt(existing.type) === 1 ? 'receivables' : 'payables'
    const idField = parseInt(existing.type) === 1 ? 'receivable_id' : 'payable_id'

    // 回滚旧明细
    const oldItems = await WriteOffItem.findByWriteOffId(id)
    for (const oldItem of oldItems) {
      const [rows] = await connection.query(
        `SELECT * FROM ${tableName} WHERE ${idField} = ? FOR UPDATE`,
        [oldItem.source_id]
      )
      if (rows.length > 0) {
        const record = rows[0]
        const receivableTotal = parseFloat(record.amount) + parseFloat(record.handling_fee || 0)
        const currentReceived = parseFloat(record.received_amount || 0)
        const oldWriteOff = parseFloat(oldItem.write_off_amount)
        const afterRollback = currentReceived - oldWriteOff
        const newStatus = calcStatus(afterRollback, receivableTotal)

        await connection.query(
          `UPDATE ${tableName} SET received_amount = ?, balance_amount = ?, status = ? WHERE ${idField} = ?`,
          [afterRollback, receivableTotal - afterRollback, newStatus, oldItem.source_id]
        )

        // 同步回滚后的核销信息到销售订单/采购订单（失败不影响核销单）
        try {
          await syncOrderSettlementInfo(connection, existing.type, oldItem.source_bill_id, existing.write_off_date, afterRollback, receivableTotal - afterRollback, newStatus)
        } catch (syncErr) {
          console.error('同步订单结算信息失败（不影响核销单）:', syncErr.message)
        }
      }
    }

    // 删除旧明细
    await WriteOffItem.deleteByWriteOffId(id)

    // 应用新明细
    if (items && items.length > 0) {
      let totalAmount = 0

      for (const item of items) {
        if (!item.source_id || !item.write_off_amount || item.write_off_amount <= 0) {
          await connection.rollback()
          return res.status(400).json({ success: false, message: '核销金额必须大于0' })
        }

        const [rows] = await connection.query(
          `SELECT * FROM ${tableName} WHERE ${idField} = ? FOR UPDATE`,
          [item.source_id]
        )

        if (rows.length === 0) {
          await connection.rollback()
          return res.status(400).json({ success: false, message: `记录 ${item.source_id} 不存在` })
        }

        const record = rows[0]
        const receivableTotal = parseFloat(record.amount) + parseFloat(record.handling_fee || 0)
        const currentReceived = parseFloat(record.received_amount || 0)
        const writeOffAmount = parseFloat(item.write_off_amount)

        if (currentReceived + writeOffAmount > receivableTotal + 0.0001) {
          await connection.rollback()
          return res.status(400).json({
            success: false,
            message: `单据 ${record.source_bill_id} 核销金额超出未核销余额`
          })
        }

        const afterReceived = currentReceived + writeOffAmount
        const newStatus = calcStatus(afterReceived, receivableTotal)

        await connection.query(
          `UPDATE ${tableName} SET received_amount = ?, balance_amount = ?, status = ? WHERE ${idField} = ?`,
          [afterReceived, receivableTotal - afterReceived, newStatus, item.source_id]
        )

        // 同步核销信息到销售订单/采购订单（失败不影响核销单）
        const billId = item.source_bill_id || record.source_bill_id
        try {
          await syncOrderSettlementInfo(connection, existing.type, billId, write_off_date || existing.write_off_date, afterReceived, receivableTotal - afterReceived, newStatus)
        } catch (syncErr) {
          console.error('同步订单结算信息失败（不影响核销单）:', syncErr.message)
        }

        await WriteOffItem.create({
          write_off_id: id,
          source_type: parseInt(existing.type),
          source_id: item.source_id,
          source_bill_id: item.source_bill_id || record.source_bill_id,
          target_amount: receivableTotal,
          write_off_amount: writeOffAmount,
          before_received: currentReceived,
          after_received: afterReceived,
          remarks: item.remarks || null
        })

        totalAmount += writeOffAmount
      }

      // 更新主表
      await WriteOffDocument.update(id, {
        entity_name: entity_name || existing.entity_name,
        write_off_date: write_off_date || existing.write_off_date,
        payment_method: payment_method !== undefined ? payment_method : existing.payment_method,
        bank_reference: bank_reference !== undefined ? bank_reference : existing.bank_reference,
        remarks: remarks !== undefined ? remarks : existing.remarks,
        document_date: document_date !== undefined ? document_date : existing.document_date,
        total_amount: totalAmount
      })
    }

    await connection.commit()

    const result = await WriteOffDocument.findById(id)
    const resultItems = await WriteOffItem.findByWriteOffId(id)

    res.json({
      success: true,
      data: { ...result, items: resultItems }
    })
  } catch (error) {
    await connection.rollback()
    console.error('编辑核销单失败:', error)
    res.status(500).json({ success: false, message: error.message })
  } finally {
    connection.release()
  }
}

// 作废核销单
export const voidWriteOff = async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params

    const existing = await WriteOffDocument.findById(id)
    if (!existing) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: '核销单不存在' })
    }

    if (existing.status === 0) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: '该核销单已作废' })
    }

    const tableName = parseInt(existing.type) === 1 ? 'receivables' : 'payables'
    const idField = parseInt(existing.type) === 1 ? 'receivable_id' : 'payable_id'

    // 回滚所有明细
    const items = await WriteOffItem.findByWriteOffId(id)
    for (const item of items) {
      const [rows] = await connection.query(
        `SELECT * FROM ${tableName} WHERE ${idField} = ? FOR UPDATE`,
        [item.source_id]
      )

      if (rows.length > 0) {
        const record = rows[0]
        const receivableTotal = parseFloat(record.amount) + parseFloat(record.handling_fee || 0)
        const currentReceived = parseFloat(record.received_amount || 0)
        const writeOffAmount = parseFloat(item.write_off_amount)

        if (currentReceived < writeOffAmount - 0.0001) {
          await connection.rollback()
          return res.status(400).json({ success: false, message: '数据异常，当前已核销金额小于回滚金额' })
        }

        const afterRollback = currentReceived - writeOffAmount
        const newStatus = calcStatus(afterRollback, receivableTotal)

        await connection.query(
          `UPDATE ${tableName} SET received_amount = ?, balance_amount = ?, status = ? WHERE ${idField} = ?`,
          [afterRollback, receivableTotal - afterRollback, newStatus, item.source_id]
        )

        // 同步回滚后的核销信息到销售订单/采购订单（失败不影响核销单）
        try {
          await syncOrderSettlementInfo(connection, existing.type, item.source_bill_id, existing.write_off_date, afterRollback, receivableTotal - afterRollback, newStatus)
        } catch (syncErr) {
          console.error('同步订单结算信息失败（不影响核销单）:', syncErr.message)
        }
      }
    }

    // 作废核销单
    await WriteOffDocument.update(id, { status: 0 })

    await connection.commit()

    res.json({ success: true, message: '核销单已作废' })
  } catch (error) {
    await connection.rollback()
    console.error('作废核销单失败:', error)
    res.status(500).json({ success: false, message: error.message })
  } finally {
    connection.release()
  }
}
