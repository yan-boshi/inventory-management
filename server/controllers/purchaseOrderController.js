import PurchaseOrder from '../models/PurchaseOrder.js'
import SalesOrder from '../models/SalesOrder.js'
import pool from '../config/database.js'

export const getAllPurchaseOrders = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      supplierName,
      supplierCode,
      orderNumber,
      productName,
      productCode,
      productModel,
      startDate,
      endDate
    } = req.query

    const where = []
    const params = []

    if (orderNumber) {
      where.push('order_number LIKE ?')
      params.push(`%${orderNumber}%`)
    }

    if (supplierName) {
      where.push('supplier_name LIKE ?')
      params.push(`%${supplierName}%`)
    }

    if (supplierCode) {
      where.push('supplier_code LIKE ?')
      params.push(`%${supplierCode}%`)
    }

    if (productName) {
      where.push('purchase_items LIKE ?')
      params.push(`%${productName}%`)
    }

    if (productCode) {
      where.push('purchase_items LIKE ?')
      params.push(`%${productCode}%`)
    }

    if (productModel) {
      where.push('purchase_items LIKE ?')
      params.push(`%${productModel}%`)
    }

    if (startDate && endDate) {
      where.push('created_at BETWEEN ? AND ?')
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`)
    } else if (startDate) {
      where.push('created_at >= ?')
      params.push(`${startDate} 00:00:00`)
    } else if (endDate) {
      where.push('created_at <= ?')
      params.push(`${endDate} 23:59:59`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await PurchaseOrder.paginateWithStatus({
      where: whereClause,
      orderBy: 'entry_date DESC',
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

export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await PurchaseOrder.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }
    // 计算动态状态
    const status = await PurchaseOrder.calculateStatus(id)
    res.json({ success: true, data: { ...order, status } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_name, supplier_code, purchase_items, currency, exchange_rate, entry_date, remarks, contract_number, expenses, purchase_person, related_sales_order_id } = req.body

    if (!supplier_name || !supplier_code) {
      return res.status(400).json({ success: false, message: 'Supplier name and code are required' })
    }

    if (!purchase_items || !Array.isArray(purchase_items) || purchase_items.length === 0) {
      return res.status(400).json({ success: false, message: 'Purchase items are required' })
    }

    const order = await PurchaseOrder.create({
      supplier_name,
      supplier_code,
      purchase_items,
      currency,
      exchange_rate: parseFloat(exchange_rate) || 1.0,
      entry_date,
      remarks,
      contract_number,
      expenses,
      purchase_person,
      related_sales_order_id
    })

    // 更新关联销售订单商品的采购状态
    if (related_sales_order_id) {
      await updateSalesOrderPurchaseStatus(related_sales_order_id)
    }

    res.status(201).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params
    const { order_number, supplier_name, supplier_code, purchase_items, currency, exchange_rate, entry_date, remarks, contract_number, expenses, purchase_person, related_sales_order_id } = req.body

    const existing = await PurchaseOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }

    const updateData = {}
    if (order_number !== undefined) updateData.order_number = order_number
    if (supplier_name !== undefined) updateData.supplier_name = supplier_name
    if (supplier_code !== undefined) updateData.supplier_code = supplier_code
    if (currency !== undefined) updateData.currency = currency
    if (exchange_rate !== undefined) updateData.exchange_rate = parseFloat(exchange_rate) || 1.0
    if (entry_date !== undefined) updateData.entry_date = entry_date
    if (remarks !== undefined) updateData.remarks = remarks
    if (contract_number !== undefined) updateData.contract_number = contract_number
    if (expenses !== undefined) updateData.expenses = expenses
    if (purchase_person !== undefined) updateData.purchase_person = purchase_person
    if (related_sales_order_id !== undefined) updateData.related_sales_order_id = related_sales_order_id || null

    if (purchase_items !== undefined) {
      if (!Array.isArray(purchase_items) || purchase_items.length === 0) {
        return res.status(400).json({ success: false, message: 'Purchase items must be a non-empty array' })
      }

      const calculatedItems = purchase_items.map((item) => {
        const taxRateDecimal = item.tax_rate / 100
        const taxExcludedPrice = PurchaseOrder.calculateTaxExcludedPrice(item.tax_included_price, taxRateDecimal)
        const taxIncludedAmount = PurchaseOrder.calculateTaxIncludedAmount(item.quantity, item.tax_included_price)
        const taxExcludedAmount = PurchaseOrder.calculateTaxExcludedAmount(item.quantity, taxExcludedPrice)
        const taxAmount = PurchaseOrder.calculateTaxAmount(taxIncludedAmount, taxRateDecimal)

        return {
          ...item,
          tax_excluded_price: taxExcludedPrice,
          tax_included_amount: taxIncludedAmount,
          tax_excluded_amount: taxExcludedAmount,
          tax_amount: taxAmount,
          total_price: taxIncludedAmount
        }
      })

      updateData.purchase_items = JSON.stringify(calculatedItems)
    }

    const order = await PurchaseOrder.update(id, updateData)

    // 更新关联销售订单商品的采购状态
    // 如果修改了关联的销售订单，需要同时更新旧的和新的销售订单
    const oldSalesOrderId = existing.related_sales_order_id
    const newSalesOrderId = related_sales_order_id !== undefined ? (related_sales_order_id || null) : oldSalesOrderId

    if (oldSalesOrderId && oldSalesOrderId !== newSalesOrderId) {
      await updateSalesOrderPurchaseStatus(oldSalesOrderId)
    }
    if (newSalesOrderId) {
      await updateSalesOrderPurchaseStatus(newSalesOrderId)
    }

    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await PurchaseOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }

    const relatedSalesOrderId = existing.related_sales_order_id

    await PurchaseOrder.delete(id)

    // 删除后更新关联销售订单商品的采购状态
    if (relatedSalesOrderId) {
      await updateSalesOrderPurchaseStatus(relatedSalesOrderId)
    }

    res.json({ success: true, message: 'Purchase order deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status || ![1, 2, 3, 4].includes(parseInt(status))) {
      return res.status(400).json({ success: false, message: 'Status must be 1 (not warehoused), 2 (fully warehoused), 3 (partially warehoused), or 4 (returned)' })
    }

    const existing = await PurchaseOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' })
    }

    // 退货时同步更新商品行状态
    const parsedStatus = parseInt(status)
    let updateData = { status: parsedStatus }
    if (parsedStatus === 4) {
      const purchaseItems = JSON.parse(existing.purchase_items || '[]')
      const resetItems = purchaseItems.map(item => ({
        ...item,
        inbound_quantity: 0,
        status: 4
      }))
      updateData.purchase_items = JSON.stringify(resetItems)
    }

    const updated = await PurchaseOrder.update(id, updateData)
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await PurchaseOrder.generateOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

/**
 * 更新销售订单商品行的采购状态
 * 根据所有关联该销售订单的采购订单的商品数量汇总来判断：
 * - 采购数量 >= 销售数量 → 3（已采购）
 * - 0 < 采购数量 < 销售数量 → 2（部分采购）
 * - 采购数量 = 0 或无对应采购 → 1（未采购）
 * - 原本标记为 4（无需采购）的保持不变
 * @param {string} salesOrderId - 销售订单ID
 */
async function updateSalesOrderPurchaseStatus(salesOrderId) {
  try {
    const salesOrder = await SalesOrder.findById(salesOrderId)
    if (!salesOrder) return

    const salesItems = JSON.parse(salesOrder.sales_items || '[]')
    if (salesItems.length === 0) return

    // 查询所有关联该销售订单的采购订单
    const [purchaseOrders] = await pool.query(
      `SELECT purchase_items FROM purchase_orders WHERE related_sales_order_id = ?`,
      [salesOrderId]
    )

    // 按 product_code 汇总采购数量
    const purchaseQuantityMap = {}
    for (const po of purchaseOrders) {
      const items = JSON.parse(po.purchase_items || '[]')
      for (const item of items) {
        const code = item.product_code
        if (!code) continue
        purchaseQuantityMap[code] = (purchaseQuantityMap[code] || 0) + (item.quantity || 0)
      }
    }

    // 更新每个销售商品行的采购状态
    let updated = false
    const updatedItems = salesItems.map(item => {
      // 无需采购的保持不变
      if (item.purchase_status === 4) return item

      const code = item.product_code
      const purchasedQty = purchaseQuantityMap[code] || 0
      const salesQty = item.quantity || 0

      let newStatus = 1 // 未采购
      if (salesQty > 0 && purchasedQty >= salesQty) {
        newStatus = 3 // 已采购
      } else if (purchasedQty > 0) {
        newStatus = 2 // 部分采购
      }

      if (item.purchase_status !== newStatus) {
        updated = true
        return { ...item, purchase_status: newStatus }
      }
      return item
    })

    if (updated) {
      await SalesOrder.update(salesOrderId, {
        sales_items: JSON.stringify(updatedItems)
      })
    }
  } catch (error) {
    console.error('更新销售订单采购状态失败:', error)
  }
}