import InboundPlan from '../models/InboundPlan.js'
import pool from '../config/database.js'
import { escapeLike } from '../utils/sql.js'
import { localDateISO } from '../utils/sequence.js'

export const getAllInboundPlans = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      planNumber,
      contractNumber,
      supplierName,
      purchasePerson,
      status,
      statusList,
      startDate,
      endDate
    } = req.query

    const where = []
    const params = []

    if (planNumber) {
      where.push('plan_number LIKE ?')
      params.push(`%${escapeLike(planNumber)}%`)
    }

    if (contractNumber) {
      where.push('contract_number LIKE ?')
      params.push(`%${escapeLike(contractNumber)}%`)
    }

    if (supplierName) {
      where.push('supplier_name LIKE ?')
      params.push(`%${escapeLike(supplierName)}%`)
    }

    if (purchasePerson) {
      where.push('purchase_person LIKE ?')
      params.push(`%${escapeLike(purchasePerson)}%`)
    }

    if (status) {
      where.push('status = ?')
      params.push(status)
    } else if (statusList) {
      const statuses = Array.isArray(statusList) ? statusList : statusList.split(',')
      if (statuses.length > 0) {
        where.push(`status IN (${statuses.map(() => '?').join(',')})`)
        params.push(...statuses)
      }
    }

    if (startDate && endDate) {
      where.push('entry_date BETWEEN ? AND ?')
      params.push(startDate, endDate)
    } else if (startDate) {
      where.push('entry_date >= ?')
      params.push(startDate)
    } else if (endDate) {
      where.push('entry_date <= ?')
      params.push(endDate)
    }

    const result = await InboundPlan.paginate({
      where: where.length > 0 ? where.join(' AND ') : undefined,
      orderBy: 'created_at DESC',
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      params,
    })

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const getInboundPlanById = async (req, res) => {
  try {
    const { id } = req.params
    const plan = await InboundPlan.findById(id)
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Inbound plan not found' })
    }
    res.json({ success: true, data: plan })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const createInboundPlan = async (req, res) => {
  try {
    const {
      purchase_order_id,
      contract_number,
      supplier_name,
      plan_items,
      currency,
      entry_date,
      purchase_person,
      status,
      remarks,
    } = req.body

    if (!plan_items || (Array.isArray(plan_items) && plan_items.length === 0)) {
      return res.status(400).json({ success: false, message: 'Plan items are required' })
    }

    const plan = await InboundPlan.create({
      purchase_order_id,
      contract_number,
      supplier_name,
      plan_items,
      currency,
      entry_date,
      purchase_person,
      status,
      remarks,
      created_by: req.user?.username || null,
    })

    res.status(201).json({ success: true, data: plan })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const updateInboundPlan = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await InboundPlan.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Inbound plan not found' })
    }

    const updateData = {}
    const fields = [
      'contract_number', 'supplier_name', 'plan_items', 'currency',
      'entry_date', 'purchase_person', 'status', 'remarks'
    ]

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    }

    const plan = await InboundPlan.update(id, updateData)
    res.json({ success: true, data: plan })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const deleteInboundPlan = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await InboundPlan.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Inbound plan not found' })
    }

    await InboundPlan.delete(id)
    res.json({ success: true, message: 'Inbound plan deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const getNewPlanNumber = async (req, res) => {
  try {
    const planNumber = await InboundPlan.generatePlanNumber()
    res.json({ success: true, data: { plan_number: planNumber } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

/**
 * 从采购订单生成入库计划（供内部调用，可传事务连接）
 */
export const generateFromPurchaseOrder = async (purchaseOrder, conn = pool) => {
  try {
    // 解析采购明细
    let purchaseItems = []
    try {
      purchaseItems = typeof purchaseOrder.purchase_items === 'string'
        ? JSON.parse(purchaseOrder.purchase_items)
        : purchaseOrder.purchase_items || []
    } catch {
      purchaseItems = []
    }

    // 先删除该采购订单关联的旧入库计划
    await InboundPlan.deleteByPurchaseOrderId(purchaseOrder.purchase_order_id, conn)

    if (purchaseItems.length === 0) {
      return null
    }

    // 构建入库计划明细：
    // quantity=剩余待入库（采购数量-已入库数量），purchase_quantity=原始采购数量，
    // 防止编辑采购订单后计划被重置为全量导致重复入库
    const planItems = purchaseItems.map((item, index) => {
      const total = parseFloat(item.quantity) || 0
      const received = parseFloat(item.inbound_quantity) || 0
      const remaining = Math.max(0, total - received)
      return {
        no: index + 1,
        product_code: item.product_code || '',
        product_name: item.product_name || '',
        model: item.model || '',
        description: item.description || '',
        quantity: remaining,
        // 记录从采购订单生成入库计划时的采购数量
        purchase_quantity: total,
        unit: item.unit || '',
        tax_included_price: item.tax_included_price || 0,
        tax_rate: item.tax_rate || 0,
        delivery_date: item.delivery_date || '',
        remarks: item.remarks || '',
        inbound_status: remaining <= 0 ? 'completed' : (received > 0 ? 'partial' : 'pending'),
      }
    })

    const planStatus = planItems.every(i => i.inbound_status === 'completed')
      ? 'completed'
      : planItems.every(i => i.inbound_status === 'pending') ? 'pending' : 'partial'

    const plan = await InboundPlan.create({
      purchase_order_id: purchaseOrder.purchase_order_id,
      contract_number: purchaseOrder.contract_number || '',
      supplier_name: purchaseOrder.supplier_name || '',
      plan_items: planItems,
      currency: purchaseOrder.currency || 'CNY',
      entry_date: purchaseOrder.entry_date || localDateISO(),
      purchase_person: purchaseOrder.purchase_person || '',
      status: planStatus,
      remarks: purchaseOrder.remarks || '',
      created_by: purchaseOrder.purchase_person || null,
    }, conn)

    return plan
  } catch (error) {
    console.error('Generate inbound plan from purchase order failed:', error)
    throw error
  }
}
