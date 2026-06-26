import DeliveryOrder from '../models/DeliveryOrder.js'
import SalesOrder from '../models/SalesOrder.js'
import pool from '../config/database.js'

export const getAllDeliveryOrders = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      productName,
      productCode,
      orderNumber,
      deliveryDate
    } = req.query

    const where = []
    const params = []

    if (orderNumber) {
      where.push('order_number LIKE ?')
      params.push(`%${orderNumber}%`)
    }

    if (productName) {
      where.push('delivery_items LIKE ?')
      params.push(`%${productName}%`)
    }

    if (productCode) {
      where.push('delivery_items LIKE ?')
      params.push(`%${productCode}%`)
    }

    if (deliveryDate) {
      where.push('delivery_time >= ?')
      params.push(deliveryDate)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await DeliveryOrder.paginate({
      where: whereClause,
      orderBy: 'created_at DESC',
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

export const getDeliveryOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await DeliveryOrder.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: '出库单不存在' })
    }
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createDeliveryOrder = async (req, res) => {
  try {
    const {
      contract_number,
      customer_name,
      customer_address,
      delivery_items,
      delivery_time,
      delivery_date,
      entry_date,
      currency,
      delivery_person,
      contact_phone,
      remarks,
      expenses,
      tracking_number
    } = req.body

    if (!customer_name) {
      return res.status(400).json({ success: false, message: '客户名称不能为空' })
    }

    if (!delivery_items || (Array.isArray(delivery_items) && delivery_items.length === 0)) {
      return res.status(400).json({ success: false, message: '出库商品不能为空' })
    }

    // 先校验库存是否充足（在创建出库单之前）
    if (delivery_items) {
      const parsedItems = typeof delivery_items === 'string' ? JSON.parse(delivery_items) : delivery_items
      for (const item of parsedItems) {
        if (!item.product_code || !item.quantity) continue
        // 查询当前库存
        const [productResult] = await pool.query(
          'SELECT stock, product_name FROM products WHERE product_code = ?',
          [item.product_code]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const outQuantity = parseFloat(item.quantity || 0)
          // 校验库存是否充足
          if (outQuantity > currentStock) {
            return res.status(400).json({
              success: false,
              message: `商品 ${productResult[0].product_name}(${item.product_code}) 库存不足，当前库存: ${currentStock}，出库数量: ${outQuantity}`
            })
          }
        }
      }
    }

    // 创建出库单
    const order = await DeliveryOrder.create({
      contract_number,
      customer_name,
      customer_address,
      delivery_items,
      delivery_time,
      delivery_date,
      entry_date,
      currency,
      delivery_person,
      contact_phone,
      remarks,
      expenses,
      tracking_number
    })

    // 更新产品库存（扣减）
    if (delivery_items) {
      try {
        const parsedItems = typeof delivery_items === 'string' ? JSON.parse(delivery_items) : delivery_items
        for (const item of parsedItems) {
          if (!item.product_code || !item.quantity) continue
          // 查询当前库存
          const [productResult] = await pool.query(
            'SELECT stock FROM products WHERE product_code = ?',
            [item.product_code]
          )
          if (productResult.length > 0) {
            const currentStock = parseFloat(productResult[0].stock || 0)
            const newStock = currentStock - parseFloat(item.quantity || 0)
            // 更新库存
            await pool.query(
              'UPDATE products SET stock = ? WHERE product_code = ?',
              [newStock.toFixed(2), item.product_code]
            )
          }
        }
      } catch (stockError) {
        // 库存更新失败，继续执行
      }
    }

    // 如果关联了销售订单，同步出库数量到销售订单
    if (contract_number) {
      const salesOrder = await SalesOrder.findOne('contract_number = ?', [contract_number])

      if (salesOrder) {
        const salesItems = JSON.parse(salesOrder.sales_items || '[]')
        const parsedDeliveryItems = typeof delivery_items === 'string'
          ? JSON.parse(delivery_items)
          : delivery_items

        // 遍历出库项，同步数量并校验
        for (const deliveryItem of parsedDeliveryItems) {
          const targetItem = salesItems.find(
            si => si.product_code === deliveryItem.product_code
          )

          if (!targetItem) {
            return res.status(400).json({
              success: false,
              message: `商品 ${deliveryItem.product_code} 不在销售订单中`
            })
          }

          const currentOutbound = targetItem.outbound_quantity || 0
          const newOutbound = currentOutbound + deliveryItem.quantity

          // 超量校验
          if (newOutbound > targetItem.quantity) {
            return res.status(400).json({
              success: false,
              message: `商品 ${targetItem.product_name} 已超出销售数量，订单数量: ${targetItem.quantity}，已出库: ${currentOutbound}，本次出库: ${deliveryItem.quantity}`
            })
          }

          // 更新出库数量
          targetItem.outbound_quantity = newOutbound

          // 更新行状态
          if (newOutbound === targetItem.quantity) {
            targetItem.status = 2 // 已全部出库
          } else if (newOutbound > 0) {
            targetItem.status = 3 // 已部分出库
          }
        }

        // 计算订单整体状态
        const statuses = salesItems.map(item => item.status || 1)
        let orderStatus = '1'
        if (statuses.every(s => s === 2)) {
          orderStatus = '2' // 全部出库
        } else if (statuses.some(s => s === 2 || s === 3)) {
          orderStatus = '3' // 部分出库
        }

        // 更新销售订单
        await SalesOrder.update(salesOrder.sales_order_id, {
          sales_items: JSON.stringify(salesItems),
          status: orderStatus
        })
      }
    }

    res.status(201).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateDeliveryOrder = async (req, res) => {
  try {
    const { id } = req.params
    const {
      contract_number,
      customer_name,
      customer_address,
      delivery_items,
      delivery_time,
      delivery_date,
      entry_date,
      currency,
      delivery_person,
      contact_phone,
      remarks,
      expenses,
      tracking_number
    } = req.body

    const existing = await DeliveryOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '出库单不存在' })
    }

    const updateData = {}
    if (contract_number !== undefined) updateData.contract_number = contract_number
    if (customer_name !== undefined) updateData.customer_name = customer_name
    if (customer_address !== undefined) updateData.customer_address = customer_address
    if (delivery_items !== undefined) updateData.delivery_items = delivery_items
    if (delivery_time !== undefined) updateData.delivery_time = delivery_time
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date
    if (entry_date !== undefined) updateData.entry_date = entry_date
    if (currency !== undefined) updateData.currency = currency
    if (delivery_person !== undefined) updateData.delivery_person = delivery_person
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone
    if (remarks !== undefined) updateData.remarks = remarks
    if (expenses !== undefined) updateData.expenses = expenses
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number

    const order = await DeliveryOrder.update(id, updateData)
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteDeliveryOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await DeliveryOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '出库单不存在' })
    }

    // 如果关联了销售订单，回退出库数量
    if (existing.contract_number) {
      const salesOrder = await SalesOrder.findOne('contract_number = ?', [existing.contract_number])

      if (salesOrder) {
        const salesItems = JSON.parse(salesOrder.sales_items || '[]')
        const deliveryItems = JSON.parse(existing.delivery_items || '[]')

        // 遍历被删除出库单的商品，回退数量
        for (const deliveryItem of deliveryItems) {
          const targetItem = salesItems.find(
            si => si.product_code === deliveryItem.product_code
          )

          if (targetItem) {
            const currentOutbound = targetItem.outbound_quantity || 0
            const newOutbound = Math.max(0, currentOutbound - deliveryItem.quantity)

            // 更新出库数量
            targetItem.outbound_quantity = newOutbound

            // 更新行状态
            if (newOutbound === 0) {
              targetItem.status = 1 // 未出库
            } else if (newOutbound < targetItem.quantity) {
              targetItem.status = 3 // 已部分出库
            } else if (newOutbound === targetItem.quantity) {
              targetItem.status = 2 // 已全部出库
            }
          }
        }

        // 重新计算订单整体状态
        const statuses = salesItems.map(item => item.status || 1)
        let orderStatus = '1'
        if (statuses.every(s => s === 2)) {
          orderStatus = '2' // 全部出库
        } else if (statuses.some(s => s === 2 || s === 3)) {
          orderStatus = '3' // 部分出库
        }

        // 更新销售订单
        await SalesOrder.update(salesOrder.sales_order_id, {
          sales_items: JSON.stringify(salesItems),
          status: orderStatus
        })
      }
    }

    // 恢复产品库存（加回出库数量）
    try {
      const deliveryItems = JSON.parse(existing.delivery_items || '[]')
      for (const item of deliveryItems) {
        const [productResult] = await pool.query(
          'SELECT stock FROM products WHERE product_code = ?',
          [item.product_code]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const newStock = currentStock + parseFloat(item.quantity || 0)
          await pool.query(
            'UPDATE products SET stock = ? WHERE product_code = ?',
            [newStock.toFixed(2), item.product_code]
          )
        }
      }
    } catch (stockError) {
      // 库存恢复失败，继续执行
    }

    await DeliveryOrder.delete(id)
    res.json({ success: true, message: '出库单删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await DeliveryOrder.getNewOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getUndeliveredSalesOrders = async (req, res) => {
  try {
    const orders = await DeliveryOrder.getUndeliveredSalesOrders()
    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
