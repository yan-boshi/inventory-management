import Payable from '../models/Payable.js'

export const getAllPayables = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, supplier_name, status, billing_status, start_date, end_date } = req.query
    const where = []
    const params = []

    if (supplier_name) {
      where.push('supplier_name LIKE ?')
      params.push(`%${supplier_name}%`)
    }

    if (status !== undefined && status !== '' && status !== null) {
      where.push('status = ?')
      params.push(parseInt(status))
    }

    if (billing_status !== undefined && billing_status !== '' && billing_status !== null) {
      where.push('billing_status = ?')
      params.push(parseInt(billing_status))
    }

    if (start_date) {
      where.push('due_date >= ?')
      params.push(start_date)
    }

    if (end_date) {
      where.push('due_date <= ?')
      params.push(end_date)
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
    res.status(500).json({ success: false, message: error.message })
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
    res.status(500).json({ success: false, message: error.message })
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
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updatePayable = async (req, res) => {
  try {
    const { id } = req.params
    const { billing_status, handling_fee, status } = req.body

    const existing = await Payable.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '应付账款不存在' })
    }

    const updateData = {}
    if (billing_status !== undefined) updateData.billing_status = billing_status
    if (handling_fee !== undefined) updateData.handling_fee = handling_fee
    if (status !== undefined) updateData.status = status

    const payable = await Payable.update(id, updateData)
    res.json({ success: true, data: payable })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
