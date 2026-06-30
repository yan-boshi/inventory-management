import WarehousingOrder from '../models/WarehousingOrder.js'
import PurchaseOrder from '../models/PurchaseOrder.js'
import pool from '../config/database.js'

export const getAllWarehousingOrders = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      productName,
      productCode,
      orderNumber,
      warehousingDate
    } = req.query

    const where = []
    const params = []

    if (orderNumber) {
      where.push('order_number LIKE ?')
      params.push(`%${orderNumber}%`)
    }

    if (productName) {
      where.push('warehousing_items LIKE ?')
      params.push(`%${productName}%`)
    }

    if (productCode) {
      where.push('warehousing_items LIKE ?')
      params.push(`%${productCode}%`)
    }

    if (warehousingDate) {
      where.push('DATE(warehousing_time) >= ?')
      params.push(warehousingDate)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await WarehousingOrder.paginate({
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

export const getWarehousingOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await WarehousingOrder.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Warehousing order not found' })
    }
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createWarehousingOrder = async (req, res) => {
  try {
    const {
      contract_number,
      warehousing_items,
      warehousing_time,
      entry_date,
      tracking_number,
      customer_name,
      customer_address,
      total_amount,
      currency,
      exchange_rate,
      warehousing_person,
      contact_phone,
      remarks,
      expenses
    } = req.body

    const order = await WarehousingOrder.create({
      contract_number,
      warehousing_items,
      warehousing_time,
      entry_date,
      tracking_number,
      customer_name,
      customer_address,
      total_amount,
      currency,
      exchange_rate,
      warehousing_person,
      contact_phone,
      remarks,
      expenses
    })

    // 更新产品库存（含移动平均法计算单价）
    if (warehousing_items) {
      const items = typeof warehousing_items === 'string' ? JSON.parse(warehousing_items) : warehousing_items
      for (const item of items) {
        if (!item.product_code) {
          console.warn('跳过无产品代码的商品:', item)
          continue
        }
        // 查询当前库存和单价
        const [productResult] = await pool.query(
          'SELECT stock, tax_included_price FROM products WHERE product_code = ?',
          [item.product_code]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const currentPrice = parseFloat(productResult[0].tax_included_price || 0)
          const newStock = currentStock + parseFloat(item.quantity || 0)

          let newTaxIncludedPrice = currentPrice
          let newTaxExcludedPrice = null

          // 移动平均法计算含税单价
          if (item.tax_included_price && newStock > 0) {
            const incomingPrice = parseFloat(item.tax_included_price)
            newTaxIncludedPrice = (currentStock * currentPrice + parseFloat(item.quantity) * incomingPrice) / newStock
            // 计算未税单价
            if (item.tax_rate) {
              newTaxExcludedPrice = newTaxIncludedPrice / (1 + parseFloat(item.tax_rate) / 100)
            }
          }

          // 更新库存和单价（价格四舍五入保留四位小数）
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
        } else {
          console.warn(`未找到产品代码为 ${item.product_code} 的产品`)
        }
      }
    }

    // 如果关联了采购订单，同步入库数量到采购订单
    console.log('contract_number:', contract_number)
    if (contract_number) {
      const purchaseOrder = await PurchaseOrder.findOne('contract_number = ?', [contract_number])
      console.log('找到采购订单:', purchaseOrder ? purchaseOrder.order_number : '未找到')

      if (purchaseOrder) {
        const purchaseItems = JSON.parse(purchaseOrder.purchase_items || '[]')
        const parsedWarehousingItems = typeof warehousing_items === 'string'
          ? JSON.parse(warehousing_items)
          : warehousing_items

        // 遍历入库项，同步数量并校验
        for (const warehousingItem of parsedWarehousingItems) {
          const targetItem = purchaseItems.find(
            pi => pi.product_code === warehousingItem.product_code
          )

          if (!targetItem) {
            return res.status(400).json({
              success: false,
              message: `商品 ${warehousingItem.product_code} 不在采购订单中`
            })
          }

          const currentInbound = targetItem.inbound_quantity || 0
          const newInbound = currentInbound + warehousingItem.quantity

          // 超量校验
          if (newInbound > targetItem.quantity) {
            return res.status(400).json({
              success: false,
              message: `商品 ${targetItem.product_name} 已超出采购数量，订单数量: ${targetItem.quantity}，已入库: ${currentInbound}，本次入库: ${warehousingItem.quantity}`
            })
          }

          // 更新入库数量
          targetItem.inbound_quantity = newInbound

          // 更新行状态
          if (newInbound === targetItem.quantity) {
            targetItem.status = 2 // 已全部入库
          } else if (newInbound > 0) {
            targetItem.status = 3 // 已部分入库
          }
        }

        // 计算订单整体状态
        const statuses = purchaseItems.map(item => item.status || 1)
        let orderStatus = 1
        if (statuses.every(s => s === 2)) {
          orderStatus = 2 // 全部入库
        } else if (statuses.some(s => s === 2 || s === 3)) {
          orderStatus = 3 // 部分入库
        }

        // 更新采购订单
        await PurchaseOrder.update(purchaseOrder.purchase_order_id, {
          purchase_items: JSON.stringify(purchaseItems),
          status: orderStatus
        })
      }
    }

    res.status(201).json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateWarehousingOrder = async (req, res) => {
  try {
    const { id } = req.params
    const {
      order_number,
      contract_number,
      warehousing_items,
      warehousing_time,
      entry_date,
      tracking_number,
      customer_name,
      customer_address,
      total_amount,
      currency,
      exchange_rate,
      warehousing_person,
      contact_phone,
      remarks,
      expenses
    } = req.body

    const existing = await WarehousingOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Warehousing order not found' })
    }

    // 如果入库商品发生变化，同步更新库存
    if (warehousing_items !== undefined) {
      const oldItems = JSON.parse(existing.warehousing_items || '[]')
      const newItems = typeof warehousing_items === 'string' ? JSON.parse(warehousing_items) : warehousing_items

      // 计算每个产品的新旧数量差
      const quantityDelta = new Map()
      for (const item of newItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) + parseFloat(item.quantity || 0))
      }
      for (const item of oldItems) {
        if (!item.product_code) continue
        quantityDelta.set(item.product_code, (quantityDelta.get(item.product_code) || 0) - parseFloat(item.quantity || 0))
      }

      // 更新库存和价格
      for (const [productCode, delta] of quantityDelta) {
        if (delta === 0) continue
        const [productResult] = await pool.query(
          'SELECT stock, tax_included_price FROM products WHERE product_code = ?',
          [productCode]
        )
        if (productResult.length > 0) {
          const currentStock = parseFloat(productResult[0].stock || 0)
          const newStock = Math.max(0, currentStock + delta)

          // 如果数量增加，使用移动平均法更新价格
          const newItem = newItems.find((i) => i.product_code === productCode)
          let newPrice = parseFloat(productResult[0].tax_included_price || 0)
          let newTaxExcludedPrice = null

          if (delta > 0 && newItem && newItem.tax_included_price && newStock > 0) {
            const currentPrice = parseFloat(productResult[0].tax_included_price || 0)
            const incomingPrice = parseFloat(newItem.tax_included_price)
            newPrice = (currentStock * currentPrice + delta * incomingPrice) / newStock
            if (newItem.tax_rate) {
              newTaxExcludedPrice = newPrice / (1 + parseFloat(newItem.tax_rate) / 100)
            }
          }

          if (newTaxExcludedPrice !== null) {
            await pool.query(
              'UPDATE products SET stock = ?, tax_included_price = ?, tax_excluded_price = ? WHERE product_code = ?',
              [newStock.toFixed(2), Math.round(newPrice * 10000) / 10000, Math.round(newTaxExcludedPrice * 10000) / 10000, productCode]
            )
          } else {
            await pool.query(
              'UPDATE products SET stock = ?, tax_included_price = ? WHERE product_code = ?',
              [newStock.toFixed(2), Math.round(newPrice * 10000) / 10000, productCode]
            )
          }
        }
      }
    }

    const updateData = {}
    if (order_number !== undefined) updateData.order_number = order_number
    if (contract_number !== undefined) updateData.contract_number = contract_number
    if (warehousing_items !== undefined) updateData.warehousing_items = warehousing_items
    if (warehousing_time !== undefined) updateData.warehousing_time = warehousing_time
    if (entry_date !== undefined) updateData.entry_date = entry_date
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number
    if (customer_name !== undefined) updateData.customer_name = customer_name
    if (customer_address !== undefined) updateData.customer_address = customer_address
    if (total_amount !== undefined) updateData.total_amount = total_amount
    if (currency !== undefined) updateData.currency = currency
    if (exchange_rate !== undefined) updateData.exchange_rate = exchange_rate
    if (warehousing_person !== undefined) updateData.warehousing_person = warehousing_person
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone
    if (remarks !== undefined) updateData.remarks = remarks
    if (expenses !== undefined) updateData.expenses = expenses

    const order = await WarehousingOrder.update(id, updateData)
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteWarehousingOrder = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await WarehousingOrder.findById(id)
    if (!existing) {
      return res.status(404).json({ success: false, message: '入库单不存在' })
    }

    // 如果关联了采购订单，回退出库数量
    if (existing.contract_number) {
      const purchaseOrder = await PurchaseOrder.findOne('contract_number = ?', [existing.contract_number])

      if (purchaseOrder) {
        const purchaseItems = JSON.parse(purchaseOrder.purchase_items || '[]')
        const warehousingItems = JSON.parse(existing.warehousing_items || '[]')

        // 遍历被删除入库单的商品，回退数量
        for (const warehousingItem of warehousingItems) {
          const targetItem = purchaseItems.find(
            pi => pi.product_code === warehousingItem.product_code
          )

          if (targetItem) {
            const currentInbound = targetItem.inbound_quantity || 0
            const newInbound = Math.max(0, currentInbound - warehousingItem.quantity)

            // 更新入库数量
            targetItem.inbound_quantity = newInbound

            // 更新行状态
            if (newInbound === 0) {
              targetItem.status = 1 // 未入库
            } else if (newInbound < targetItem.quantity) {
              targetItem.status = 3 // 已部分入库
            } else if (newInbound === targetItem.quantity) {
              targetItem.status = 2 // 已全部入库
            }
          }
        }

        // 重新计算订单整体状态
        const statuses = purchaseItems.map(item => item.status || 1)
        let orderStatus = 1
        if (statuses.every(s => s === 2)) {
          orderStatus = 2 // 全部入库
        } else if (statuses.some(s => s === 2 || s === 3)) {
          orderStatus = 3 // 部分入库
        }

        // 更新采购订单
        await PurchaseOrder.update(purchaseOrder.purchase_order_id, {
          purchase_items: JSON.stringify(purchaseItems),
          status: orderStatus
        })
      }
    }

    // 扣减库存
    if (existing.warehousing_items) {
      try {
        const items = JSON.parse(existing.warehousing_items || '[]')
        for (const item of items) {
          const [productResult] = await pool.query(
            'SELECT stock FROM products WHERE product_code = ?',
            [item.product_code]
          )
          if (productResult.length > 0) {
            const currentStock = parseFloat(productResult[0].stock || 0)
            const newStock = Math.max(0, currentStock - parseFloat(item.quantity || 0))
            await pool.query(
              'UPDATE products SET stock = ? WHERE product_code = ?',
              [newStock.toFixed(2), item.product_code]
            )
          }
        }
      } catch (stockError) {
        // 库存扣减失败，继续执行
      }
    }

    await WarehousingOrder.delete(id)
    res.json({ success: true, message: '入库单删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getNewOrderNumber = async (req, res) => {
  try {
    const orderNumber = await WarehousingOrder.getNewOrderNumber()
    res.json({ success: true, data: { order_number: orderNumber } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getPurchaseOrdersForWarehousing = async (req, res) => {
  try {
    // 获取状态为未入库或已部分入库的采购订单（基于存储的状态字段）
    const [orders] = await pool.query(
      `SELECT * FROM purchase_orders
       WHERE status = '1' OR status = '3'
       ORDER BY created_at DESC`
    )
    // 二次校验：排除实际已全部入库的订单（通过 inbound_quantity 判断）
    const filtered = orders.filter(order => {
      try {
        const items = JSON.parse(order.purchase_items || '[]')
        // 只要有任意商品的未入库数 > 0，则认为可选入库
        return items.some(item => {
          const required = item.quantity || 0
          const inbound = item.inbound_quantity || 0
          return inbound < required
        })
      } catch {
        return true
      }
    })
    res.json({ success: true, data: filtered })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
