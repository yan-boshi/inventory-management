import PurchasePlan from '../models/PurchasePlan.js'
import pool from '../config/database.js'

export const getAllPurchasePlans = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      planNumber,
      contractNumber,
      customerName,
      salesPerson,
      status,
      startDate,
      endDate
    } = req.query

    const where = []
    const params = []

    if (planNumber) {
      where.push('plan_number LIKE ?')
      params.push(`%${planNumber}%`)
    }

    if (contractNumber) {
      where.push('contract_number LIKE ?')
      params.push(`%${contractNumber}%`)
    }

    if (customerName) {
      where.push('customer_name LIKE ?')
      params.push(`%${customerName}%`)
    }

    if (salesPerson) {
      where.push('sales_person LIKE ?')
      params.push(`%${salesPerson}%`)
    }

    if (status) {
      where.push('status = ?')
      params.push(status)
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

    const result = await PurchasePlan.paginate({
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
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getPurchasePlanById = async (req, res) => {
  try {
    const { id } = req.params
    const plan = await PurchasePlan.findById(id)
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Purchase plan not found' })
    }
    res.json({ success: true, data: plan })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createPurchasePlan = async (req, res) => {
  try {
    const {
      sales_order_id,
      contract_number,
      customer_name,
      plan_items,
      currency,
      entry_date,
      sales_person,
      status,
      remarks,
    } = req.body

    if (!plan_items || (Array.isArray(plan_items) && plan_items.length === 0)) {
      return res.status(400).json({ success: false, message: 'Plan items are required' })
    }

    const plan = await PurchasePlan.create({
      sales_order_id,
      contract_number,
      customer_name,
      plan_items,
      currency,
      entry_date,
      sales_person,
      status,
      remarks,
      created_by: req.user?.username || null,
    })

    res.status(201).json({ success: true, data: plan })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updatePurchasePlan = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await PurchasePlan.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase plan not found' })
    }

    const updateData = {}
    const fields = [
      'contract_number', 'customer_name', 'plan_items', 'currency',
      'entry_date', 'sales_person', 'status', 'remarks'
    ]

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    }

    const plan = await PurchasePlan.update(id, updateData)
    res.json({ success: true, data: plan })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deletePurchasePlan = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await PurchasePlan.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase plan not found' })
    }

    await PurchasePlan.delete(id)
    res.json({ success: true, message: 'Purchase plan deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewPlanNumber = async (req, res) => {
  try {
    const planNumber = await PurchasePlan.generatePlanNumber()
    res.json({ success: true, data: { plan_number: planNumber } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * 从销售订单生成采购计划（供内部调用）
 */
export const generateFromSalesOrder = async (salesOrder) => {
  try {
    // 先删除该销售订单关联的旧采购计划
    await PurchasePlan.deleteBySalesOrderId(salesOrder.sales_order_id)

    // 解析销售明细
    let salesItems = []
    try {
      salesItems = typeof salesOrder.sales_items === 'string'
        ? JSON.parse(salesOrder.sales_items)
        : salesOrder.sales_items || []
    } catch {
      salesItems = []
    }

    if (salesItems.length === 0) {
      return null
    }

    // 构建采购计划明细
    const planItems = salesItems.map((item, index) => ({
      no: index + 1,
      product_code: item.product_code || '',
      product_name: item.product_name || '',
      model: item.model || '',
      description: item.description || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      delivery_date: item.delivery_date || '',
      remarks: item.remarks || '',
      purchase_status: 'pending',
    }))

    const plan = await PurchasePlan.create({
      sales_order_id: salesOrder.sales_order_id,
      contract_number: salesOrder.contract_number || '',
      customer_name: salesOrder.customer_name || '',
      plan_items: planItems,
      currency: salesOrder.currency || 'CNY',
      entry_date: salesOrder.entry_date || new Date().toISOString().slice(0, 10),
      sales_person: salesOrder.sales_person || '',
      status: 'pending',
      remarks: salesOrder.remarks || '',
      created_by: salesOrder.sales_person || null,
    })

    return plan
  } catch (error) {
    console.error('Generate purchase plan from sales order failed:', error)
    throw error
  }
}
