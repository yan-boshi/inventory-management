import Payable from '../models/Payable.js'
import { handleDbError } from '../utils/errorHandler.js'

export const getAllPayables = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, supplier_name, status, billing_status, start_date, end_date, warehousing_time_start, warehousing_time_end, amount_filter, received_amount_filter, balance_amount_filter, handling_fee_filter } = req.query
    const where = []
    const params = []

    if (supplier_name) {
      where.push('supplier_name LIKE ?')
      params.push(`%${supplier_name}%`)
    }

    // 支持多选状态查询
    if (status !== undefined && status !== '' && status !== null) {
      const statusList = Array.isArray(status) ? status.map(Number) : [parseInt(status)]
      if (statusList.length === 1) {
        where.push('status = ?')
        params.push(statusList[0])
      } else if (statusList.length > 1) {
        where.push(`status IN (${statusList.map(() => '?').join(',')})`)
        params.push(...statusList)
      }
    }

    // 支持多选开票状态查询
    if (billing_status !== undefined && billing_status !== '' && billing_status !== null) {
      const billingStatusList = Array.isArray(billing_status) ? billing_status.map(Number) : [parseInt(billing_status)]
      if (billingStatusList.length === 1) {
        where.push('billing_status = ?')
        params.push(billingStatusList[0])
      } else if (billingStatusList.length > 1) {
        where.push(`billing_status IN (${billingStatusList.map(() => '?').join(',')})`)
        params.push(...billingStatusList)
      }
    }

    if (start_date) {
      where.push('due_date >= ?')
      params.push(start_date)
    }

    if (end_date) {
      where.push('due_date <= ?')
      params.push(end_date)
    }

    // 入库时间范围筛选
    if (warehousing_time_start) {
      where.push('warehousing_time >= ?')
      params.push(warehousing_time_start)
    }

    if (warehousing_time_end) {
      where.push('warehousing_time <= ?')
      params.push(warehousing_time_end)
    }

    // 金额筛选条件
    if (amount_filter === '0') {
      where.push('(amount = 0 OR amount IS NULL)')
    } else if (amount_filter === 'not_empty') {
      where.push('(amount > 0 AND amount IS NOT NULL)')
    }

    if (received_amount_filter === '0') {
      where.push('(received_amount = 0 OR received_amount IS NULL)')
    } else if (received_amount_filter === 'not_empty') {
      where.push('(received_amount > 0 AND received_amount IS NOT NULL)')
    }

    if (balance_amount_filter === '0') {
      where.push('(balance_amount = 0 OR balance_amount IS NULL)')
    } else if (balance_amount_filter === 'not_empty') {
      where.push('(balance_amount > 0 AND balance_amount IS NOT NULL)')
    }

    if (handling_fee_filter === '0') {
      where.push('(handling_fee = 0 OR handling_fee IS NULL)')
    } else if (handling_fee_filter === 'not_empty') {
      where.push('(handling_fee > 0 AND handling_fee IS NOT NULL)')
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await Payable.paginate({
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
    const { statusCode, message } = handleDbError(error, '操作应付账款')
    res.status(statusCode).json({ success: false, message })
  }
}

export const getPayableById = async (req, res) => {
  try {
    const { id } = req.params
    const payable = await Payable.findById(id)
    if (!payable) {
      return res.status(404).json({ success: false, message: '应付账款不存在' })
    }
    res.json({ success: true, data: payable })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作应付账款')
    res.status(statusCode).json({ success: false, message })
  }
}

export const deletePayable = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await Payable.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '应付账款不存在' })
    }

    await Payable.delete(id)
    res.json({ success: true, message: '应付账款删除成功' })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作应付账款')
    res.status(statusCode).json({ success: false, message })
  }
}

export const updatePayable = async (req, res) => {
  try {
    const { id } = req.params
    const { billing_status, handling_fee, status, received_amount, balance_amount, due_date } = req.body

    const existing = await Payable.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '应付账款不存在' })
    }

    const updateData = {}
    if (billing_status !== undefined) updateData.billing_status = billing_status
    if (handling_fee !== undefined) updateData.handling_fee = handling_fee
    if (status !== undefined) updateData.status = status
    if (received_amount !== undefined) updateData.received_amount = received_amount
    if (balance_amount !== undefined) updateData.balance_amount = balance_amount
    if (due_date !== undefined) updateData.due_date = due_date

    const payable = await Payable.update(id, updateData)
    res.json({ success: true, data: payable })
  } catch (error) {
    const { statusCode, message } = handleDbError(error, '操作应付账款')
    res.status(statusCode).json({ success: false, message })
  }
}
