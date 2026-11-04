import PurchasePlan from '../models/PurchasePlan.js'
import pool from '../config/database.js'
import { escapeLike } from '../utils/sql.js'
import { localDateISO } from '../utils/sequence.js'

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
      params.push(`%${escapeLike(planNumber)}%`)
    }

    if (contractNumber) {
      where.push('contract_number LIKE ?')
      params.push(`%${escapeLike(contractNumber)}%`)
    }

    if (customerName) {
      where.push('customer_name LIKE ?')
      params.push(`%${escapeLike(customerName)}%`)
    }

    if (salesPerson) {
      where.push('sales_person LIKE ?')
      params.push(`%${escapeLike(salesPerson)}%`)
    }

    if (status) {
      // 支持多状态查询：数组或逗号分隔字符串
      const statusList = (Array.isArray(status) ? status : String(status).split(','))
        .map(s => String(s).trim())
        .filter(Boolean)
      if (statusList.length === 1) {
        where.push('status = ?')
        params.push(statusList[0])
      } else if (statusList.length > 1) {
        where.push(`status IN (${statusList.map(() => '?').join(',')})`)
        params.push(...statusList)
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
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
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
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
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
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
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
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
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
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

export const getNewPlanNumber = async (req, res) => {
  try {
    const planNumber = await PurchasePlan.generatePlanNumber()
    res.json({ success: true, data: { plan_number: planNumber } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' })
  }
}

/**
 * 从销售订单生成采购计划（供内部调用，可传事务连接）
 */
export const generateFromSalesOrder = async (salesOrder, conn = pool) => {
  try {
    // 解析销售明细
    let salesItems = []
    try {
      salesItems = typeof salesOrder.sales_items === 'string'
        ? JSON.parse(salesOrder.sales_items)
        : salesOrder.sales_items || []
    } catch {
      salesItems = []
    }

    // 结转旧采购计划的剩余待采购数量（按 行号+商品 匹配，并按销售数量差量调整），
    // 防止编辑订单后计划被重置为全量导致重复采购
    const oldPlans = await PurchasePlan.findAll({
      where: 'sales_order_id = ?',
      params: [salesOrder.sales_order_id]
    }, conn)
    const oldRows = new Map()
    for (const oldPlan of oldPlans) {
      try {
        const rows = JSON.parse(oldPlan.plan_items || '[]')
        for (const row of rows) {
          const key = `${row.no}|${row.product_code || ''}`
          const prev = oldRows.get(key)
          const entry = {
            remaining: (parseFloat(row.quantity) || 0) + (prev ? prev.remaining : 0),
            salesQty: parseFloat(row.sales_quantity) || 0
          }
          oldRows.set(key, entry)
        }
      } catch {
        // 坏数据忽略，按全量处理
      }
    }

    // 先删除该销售订单关联的旧采购计划
    await PurchasePlan.deleteBySalesOrderId(salesOrder.sales_order_id, conn)

    if (salesItems.length === 0) {
      return null
    }

    // 构建采购计划明细：quantity=剩余待采购，sales_quantity=原始销售数量
    const planItems = salesItems.map((item, index) => {
      const total = parseFloat(item.quantity) || 0
      const key = `${item.no || index + 1}|${item.product_code || ''}`
      const old = oldRows.get(key)
      let remaining = total
      if (old) {
        remaining = Math.max(0, Math.min(total, old.remaining + (total - old.salesQty)))
      }
      return {
        no: index + 1,
        product_code: item.product_code || '',
        product_name: item.product_name || '',
        model: item.model || '',
        description: item.description || '',
        quantity: remaining,
        // 记录从销售订单生成采购计划时的销售数量
        sales_quantity: total,
        unit: item.unit || '',
        delivery_date: item.delivery_date || '',
        remarks: item.remarks || '',
        purchase_status: remaining <= 0 ? 'purchased' : (remaining < total ? 'partial' : 'pending'),
      }
    })

    const planStatus = planItems.every(i => i.purchase_status === 'purchased')
      ? 'purchased'
      : planItems.every(i => i.purchase_status === 'pending') ? 'pending' : 'partial'

    const plan = await PurchasePlan.create({
      sales_order_id: salesOrder.sales_order_id,
      contract_number: salesOrder.contract_number || '',
      customer_name: salesOrder.customer_name || '',
      plan_items: planItems,
      currency: salesOrder.currency || 'CNY',
      entry_date: salesOrder.entry_date || localDateISO(),
      sales_person: salesOrder.sales_person || '',
      status: planStatus,
      remarks: salesOrder.remarks || '',
      created_by: salesOrder.sales_person || null,
    }, conn)

    return plan
  } catch (error) {
    console.error('Generate purchase plan from sales order failed:', error)
    throw error
  }
}
