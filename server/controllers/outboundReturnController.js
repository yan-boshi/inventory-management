import OutboundReturnOrder from '../models/OutboundReturnOrder.js'
import DeliveryOrder from '../models/DeliveryOrder.js'
import SalesOrder from '../models/SalesOrder.js'
import Receivable from '../models/Receivable.js'
import pool from '../config/database.js'

export const getAllOutboundReturns = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      orderNumber,
      contractNumber,
      customerName,
      startDate,
      endDate
    } = req.query

    const where = []
    const params = []

    if (orderNumber) {
      where.push('order_number LIKE ?')
      params.push(`%${orderNumber}%`)
    }

    if (contractNumber) {
      where.push('contract_number LIKE ?')
      params.push(`%${contractNumber}%`)
    }

    if (customerName) {
      where.push('customer_name LIKE ?')
      params.push(`%${customerName}%`)
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

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await OutboundReturnOrder.paginate({
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

export const getOutboundReturnById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await OutboundReturnOrder.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: '出库退货单不存在' })
    }
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createOutboundReturn = async (req, res) => {
  try {
    const {
      source_order_id,
      source_order_number,
      contract_number,
      customer_name,
      customer_code,
      return_items,
      return_time,
      entry_date,
      currency,
      return_person,
      reason,
      remarks
    } = req.body

    if (!return_items || (Array.isArray(return_items) && return_items.length === 0)) {
      return res.status(400).json({ success: false, message: '退货商品不能为空' })
    }

    // 校验退货数量不超过原出库数量
    if (source_order_id) {
      const sourceOrder = await DeliveryOrder.findById(source_order_id)
      if (sourceOrder) {
        const deliveryItems = JSON.parse(sourceOrder.delivery_items || '[]')
        const parsedReturnItems = typeof return_items === 'string' ? JSON.parse(return_items) : return_items

        for (const returnItem of parsedReturnItems) {
          const sourceItem = deliveryItems.find(di => di.product_code === returnItem.product_code)
          if (!sourceItem) {
            return res.status(400).json({
              success: false,
              message: `商品 ${returnItem.product_code} 不在原出库单中`
            })
          }
          if (returnItem.quantity > sourceItem.quantity) {
            return res.status(400).json({
              success: false,
              message: `商品 ${returnItem.product_name || returnItem.product_code} 退货数量(${returnItem.quantity})超过原出库数量(${sourceItem.quantity})`
            })
          }
        }
      }
    }

    // 创建退货单
    const order = await OutboundReturnOrder.create({
      source_order_id,
      source_order_number,
      contract_number,
      customer_name,
      customer_code,
      return_items,
      return_time,
      entry_date,
      currency,
      return_person,
      reason,
      remarks
    })

    // 增加产品库存并调整单价（客户退货，库存增加，使用移动平均法计算）
    const parsedItems = typeof return_items === 'string' ? JSON.parse(return_items) : return_items
    for (const item of parsedItems) {
      if (!item.product_code || !item.quantity) continue
      const [productResult] = await pool.query(
        'SELECT stock, tax_included_price FROM products WHERE product_code = ?',
        [item.product_code]
      )
      if (productResult.length > 0) {
        const currentStock = parseFloat(productResult[0].stock || 0)
        const currentPrice = parseFloat(productResult[0].tax_included_price || 0)
        const returnQty = parseFloat(item.quantity)
        const returnPrice = parseFloat(item.unit_price || item.tax_included_price || 0)
        const newStock = currentStock + returnQty

        let newTaxIncludedPrice = currentPrice
        let newTaxExcludedPrice = null

        // 移动平均法计算含税单价（退货入库时重新计算平均成本）
        if (returnPrice > 0 && newStock > 0) {
          newTaxIncludedPrice = (currentStock * currentPrice + returnQty * returnPrice) / newStock
          // 计算未税单价
          if (item.tax_rate) {
            newTaxExcludedPrice = newTaxIncludedPrice / (1 + parseFloat(item.tax_rate) / 100)
          }
        }

        // 更新库存和单价
        if (newTaxExcludedPrice !== null) {
          await pool.query(
            'UPDATE products SET stock = ?, tax_included_price = ?, tax_excluded_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), Math.round(newTaxIncludedPrice * 10000) / 10000, Math.round(newTaxExcludedPrice * 10000) / 10000, item.product_code]
          )
        } else {
          await pool.query(
            'UPDATE products SET stock = ?, tax_included_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), Math.round(newTaxIncludedPrice * 10000) / 10000, item.product_code]
          )
        }
      }
    }

    // 回退销售单出库数量
    if (contract_number) {
      const salesOrder = await SalesOrder.findOne('contract_number = ?', [contract_number])
      if (salesOrder) {
        const salesItems = JSON.parse(salesOrder.sales_items || '[]')

        for (const returnItem of parsedItems) {
          const targetItem = salesItems.find(si => si.product_code === returnItem.product_code)
          if (targetItem) {
            const currentOutbound = targetItem.outbound_quantity || 0
            targetItem.outbound_quantity = Math.max(0, currentOutbound - returnItem.quantity)

            // 更新行状态
            if (targetItem.outbound_quantity === 0) {
              targetItem.status = 1 // 未出库
            } else if (targetItem.outbound_quantity < targetItem.quantity) {
              targetItem.status = 3 // 已部分出库
            } else if (targetItem.outbound_quantity === targetItem.quantity) {
              targetItem.status = 2 // 已全部出库
            }
          }
        }

        // 重新计算订单整体状态
        const statuses = salesItems.map(item => item.status || 1)
        let orderStatus = 1
        if (statuses.every(s => s === 2)) {
          orderStatus = 2
        } else if (statuses.some(s => s === 2 || s === 3)) {
          orderStatus = 3
        }

        await SalesOrder.update(salesOrder.sales_order_id, {
          sales_items: JSON.stringify(salesItems),
          status: orderStatus
        })
      }
    }

    // 删除关联的应收账款记录
    if (source_order_number) {
      try {
        const receivable = await Receivable.findOne('source_bill_id = ?', [source_order_number])
        if (receivable) {
          await Receivable.delete(receivable.receivable_id)
        }
      } catch (receivableError) {
        console.error('删除应收账款记录失败:', receivableError)
      }
    }

    res.status(201).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateOutboundReturn = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await OutboundReturnOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '出库退货单不存在' })
    }

    const updateData = {}
    const fields = ['source_order_id', 'source_order_number', 'contract_number', 'customer_name', 'customer_code', 'return_items', 'return_time', 'entry_date', 'currency', 'return_person', 'reason', 'remarks']
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    }

    // 如果退货商品发生变化，调整库存
    if (updateData.return_items !== undefined) {
      const oldItems = JSON.parse(existing.return_items || '[]')
      const newItems = typeof updateData.return_items === 'string' ? JSON.parse(updateData.return_items) : updateData.return_items

      const quantityDelta = new Map()
      for (const item of newItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) + parseFloat(item.quantity || 0))
      }
      for (const item of oldItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) - parseFloat(item.quantity || 0))
      }

      for (const [productCode, delta] of quantityDelta) {
        if (delta === 0) continue
        const [productResult] = await pool.query(
          'SELECT stock FROM products WHERE product_code = ?',
          [productCode]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const newStock = Math.max(0, currentStock + delta)
          await pool.query(
            'UPDATE products SET stock = ? WHERE product_code = ?',
            [newStock.toFixed(2), productCode]
          )
        }
      }
    }

    const order = await OutboundReturnOrder.update(id, updateData)
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteOutboundReturn = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await OutboundReturnOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '出库退货单不存在' })
    }

    // 恢复产品库存并调整单价（删除退货单，库存应减少，使用移动平均法反向计算）
    const returnItems = JSON.parse(existing.return_items || '[]')
    for (const item of returnItems) {
      if (!item.product_code || !item.quantity) continue
      const [productResult] = await pool.query(
        'SELECT stock, tax_included_price FROM products WHERE product_code = ?',
        [item.product_code]
      )
      if (productResult.length > 0) {
        const currentStock = parseFloat(productResult[0].stock || 0)
        const currentPrice = parseFloat(productResult[0].tax_included_price || 0)
        const returnQty = parseFloat(item.quantity)
        const returnPrice = parseFloat(item.unit_price || item.tax_included_price || 0)
        const newStock = Math.max(0, currentStock - returnQty)

        let newTaxIncludedPrice = currentPrice
        let newTaxExcludedPrice = null

        // 移动平均法反向计算含税单价（删除退货时调整平均成本）
        if (returnPrice > 0 && currentStock > 0 && newStock > 0) {
          newTaxIncludedPrice = (currentStock * currentPrice - returnQty * returnPrice) / newStock
          // 确保价格不为负
          newTaxIncludedPrice = Math.max(0, newTaxIncludedPrice)
          // 计算未税单价
          if (item.tax_rate) {
            newTaxExcludedPrice = newTaxIncludedPrice / (1 + parseFloat(item.tax_rate) / 100)
          }
        }

        // 更新库存和单价
        if (newTaxExcludedPrice !== null) {
          await pool.query(
            'UPDATE products SET stock = ?, tax_included_price = ?, tax_excluded_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), Math.round(newTaxIncludedPrice * 10000) / 10000, Math.round(newTaxExcludedPrice * 10000) / 10000, item.product_code]
          )
        } else {
          await pool.query(
            'UPDATE products SET stock = ?, tax_included_price = ? WHERE product_code = ?',
            [newStock.toFixed(2), Math.round(newTaxIncludedPrice * 10000) / 10000, item.product_code]
          )
        }
      }
    }

    // 恢复销售单出库数量
    if (existing.contract_number) {
      const salesOrder = await SalesOrder.findOne('contract_number = ?', [existing.contract_number])
      if (salesOrder) {
        const salesItems = JSON.parse(salesOrder.sales_items || '[]')

        for (const returnItem of returnItems) {
          const targetItem = salesItems.find(si => si.product_code === returnItem.product_code)
          if (targetItem) {
            targetItem.outbound_quantity = (targetItem.outbound_quantity || 0) + returnItem.quantity

            if (targetItem.outbound_quantity >= targetItem.quantity) {
              targetItem.status = 2
            } else if (targetItem.outbound_quantity > 0) {
              targetItem.status = 3
            }
          }
        }

        const statuses = salesItems.map(item => item.status || 1)
        let orderStatus = 1
        if (statuses.every(s => s === 2)) {
          orderStatus = 2
        } else if (statuses.some(s => s === 2 || s === 3)) {
          orderStatus = 3
        }

        await SalesOrder.update(salesOrder.sales_order_id, {
          sales_items: JSON.stringify(salesItems),
          status: orderStatus
        })
      }
    }

    await OutboundReturnOrder.delete(id)
    res.json({ success: true, message: '出库退货单删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await OutboundReturnOrder.generateOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
