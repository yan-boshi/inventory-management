/**
 * 历史数据迁移脚本：为现有订单初始化 outbound_quantity 和 inbound_quantity 字段
 *
 * 功能：
 * 1. 为 sales_items 中缺少 outbound_quantity 的商品行补 0
 * 2. 为 purchase_items 中缺少 inbound_quantity 的商品行补 0
 * 3. 根据已有出库单/入库单数据回填已出库/已入库数量
 *
 * 使用方法：node server/migrations/20260609_init_outbound_inbound_quantity.js
 */

import pool from '../config/database.js'

async function migrate() {
  const connection = await pool.getConnection()

  try {
    console.log('开始迁移：初始化 outbound_quantity 和 inbound_quantity 字段...')

    // 1. 处理销售订单
    console.log('\n处理销售订单...')
    const [salesOrders] = await connection.query(
      'SELECT sales_order_id, order_number, sales_items FROM sales_orders'
    )

    let salesUpdated = 0
    for (const order of salesOrders) {
      try {
        const items = JSON.parse(order.sales_items || '[]')
        let needUpdate = false

        const updatedItems = items.map((item, index) => {
          const updates = {}

          // 初始化 outbound_quantity
          if (item.outbound_quantity === undefined || item.outbound_quantity === null) {
            updates.outbound_quantity = 0
            needUpdate = true
          }

          // 初始化行状态
          if (item.status === undefined || item.status === null) {
            updates.status = 1
            needUpdate = true
          }

          // 初始化序号
          if (item.no === undefined || item.no === null) {
            updates.no = index + 1
            needUpdate = true
          }

          return Object.keys(updates).length > 0 ? { ...item, ...updates } : item
        })

        if (needUpdate) {
          await connection.query(
            'UPDATE sales_orders SET sales_items = ? WHERE sales_order_id = ?',
            [JSON.stringify(updatedItems), order.sales_order_id]
          )
          salesUpdated++
        }
      } catch (e) {
        console.error(`处理销售订单 ${order.order_number} 失败:`, e.message)
      }
    }
    console.log(`销售订单处理完成：更新了 ${salesUpdated} 条记录`)

    // 2. 处理采购订单
    console.log('\n处理采购订单...')
    const [purchaseOrders] = await connection.query(
      'SELECT purchase_order_id, order_number, purchase_items FROM purchase_orders'
    )

    let purchaseUpdated = 0
    for (const order of purchaseOrders) {
      try {
        const items = JSON.parse(order.purchase_items || '[]')
        let needUpdate = false

        const updatedItems = items.map((item, index) => {
          const updates = {}

          // 初始化 inbound_quantity
          if (item.inbound_quantity === undefined || item.inbound_quantity === null) {
            updates.inbound_quantity = 0
            needUpdate = true
          }

          // 初始化行状态
          if (item.status === undefined || item.status === null) {
            updates.status = 1
            needUpdate = true
          }

          // 初始化序号
          if (item.no === undefined || item.no === null) {
            updates.no = index + 1
            needUpdate = true
          }

          return Object.keys(updates).length > 0 ? { ...item, ...updates } : item
        })

        if (needUpdate) {
          await connection.query(
            'UPDATE purchase_orders SET purchase_items = ? WHERE purchase_order_id = ?',
            [JSON.stringify(updatedItems), order.purchase_order_id]
          )
          purchaseUpdated++
        }
      } catch (e) {
        console.error(`处理采购订单 ${order.order_number} 失败:`, e.message)
      }
    }
    console.log(`采购订单处理完成：更新了 ${purchaseUpdated} 条记录`)

    // 3. 根据已有出库单回填销售订单的 outbound_quantity
    console.log('\n根据已有出库单回填销售订单的 outbound_quantity...')
    const [deliveryOrders] = await connection.query(
      `SELECT sales_order_number, delivery_items FROM delivery_orders WHERE sales_order_number IS NOT NULL`
    )

    // 按销售订单号汇总出库数量
    const outboundBySalesOrder = {}
    for (const delivery of deliveryOrders) {
      if (!delivery.sales_order_number) continue

      if (!outboundBySalesOrder[delivery.sales_order_number]) {
        outboundBySalesOrder[delivery.sales_order_number] = {}
      }

      try {
        const items = JSON.parse(delivery.delivery_items || '[]')
        for (const item of items) {
          if (item.product_code) {
            const current = outboundBySalesOrder[delivery.sales_order_number][item.product_code] || 0
            outboundBySalesOrder[delivery.sales_order_number][item.product_code] = current + (item.quantity || 0)
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }

    // 更新销售订单的 outbound_quantity
    let outboundSynced = 0
    for (const [orderNumber, productQuantities] of Object.entries(outboundBySalesOrder)) {
      try {
        const [orders] = await connection.query(
          'SELECT sales_order_id, sales_items FROM sales_orders WHERE order_number = ?',
          [orderNumber]
        )

        if (orders.length === 0) continue

        const order = orders[0]
        const items = JSON.parse(order.sales_items || '[]')

        let needUpdate = false
        const updatedItems = items.map(item => {
          if (item.product_code && productQuantities[item.product_code]) {
            const outboundQty = productQuantities[item.product_code]
            if ((item.outbound_quantity || 0) !== outboundQty) {
              needUpdate = true
              return {
                ...item,
                outbound_quantity: outboundQty,
                status: outboundQty >= (item.quantity || 0) ? 2 : (outboundQty > 0 ? 3 : 1)
              }
            }
          }
          return item
        })

        if (needUpdate) {
          // 计算订单整体状态
          const statuses = updatedItems.map(item => item.status || 1)
          let orderStatus = '1'
          if (statuses.every(s => s === 2)) {
            orderStatus = '2'
          } else if (statuses.some(s => s === 2 || s === 3)) {
            orderStatus = '3'
          }

          await connection.query(
            'UPDATE sales_orders SET sales_items = ?, status = ? WHERE sales_order_id = ?',
            [JSON.stringify(updatedItems), orderStatus, order.sales_order_id]
          )
          outboundSynced++
        }
      } catch (e) {
        console.error(`回填销售订单 ${orderNumber} 出库数量失败:`, e.message)
      }
    }
    console.log(`出库数量回填完成：更新了 ${outboundSynced} 条销售订单`)

    // 4. 根据已有入库单回填采购订单的 inbound_quantity
    console.log('\n根据已有入库单回填采购订单的 inbound_quantity...')
    const [warehousingOrders] = await connection.query(
      `SELECT purchase_order_number, warehousing_items FROM warehousing_orders WHERE purchase_order_number IS NOT NULL`
    )

    // 按采购订单号汇总入库数量
    const inboundByPurchaseOrder = {}
    for (const warehousing of warehousingOrders) {
      if (!warehousing.purchase_order_number) continue

      if (!inboundByPurchaseOrder[warehousing.purchase_order_number]) {
        inboundByPurchaseOrder[warehousing.purchase_order_number] = {}
      }

      try {
        const items = JSON.parse(warehousing.warehousing_items || '[]')
        for (const item of items) {
          if (item.product_code) {
            const current = inboundByPurchaseOrder[warehousing.purchase_order_number][item.product_code] || 0
            inboundByPurchaseOrder[warehousing.purchase_order_number][item.product_code] = current + (item.quantity || 0)
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    }

    // 更新采购订单的 inbound_quantity
    let inboundSynced = 0
    for (const [orderNumber, productQuantities] of Object.entries(inboundByPurchaseOrder)) {
      try {
        const [orders] = await connection.query(
          'SELECT purchase_order_id, purchase_items FROM purchase_orders WHERE order_number = ?',
          [orderNumber]
        )

        if (orders.length === 0) continue

        const order = orders[0]
        const items = JSON.parse(order.purchase_items || '[]')

        let needUpdate = false
        const updatedItems = items.map(item => {
          if (item.product_code && productQuantities[item.product_code]) {
            const inboundQty = productQuantities[item.product_code]
            if ((item.inbound_quantity || 0) !== inboundQty) {
              needUpdate = true
              return {
                ...item,
                inbound_quantity: inboundQty,
                status: inboundQty >= (item.quantity || 0) ? 2 : (inboundQty > 0 ? 3 : 1)
              }
            }
          }
          return item
        })

        if (needUpdate) {
          // 计算订单整体状态
          const statuses = updatedItems.map(item => item.status || 1)
          let orderStatus = '1'
          if (statuses.every(s => s === 2)) {
            orderStatus = '2'
          } else if (statuses.some(s => s === 2 || s === 3)) {
            orderStatus = '3'
          }

          await connection.query(
            'UPDATE purchase_orders SET purchase_items = ?, status = ? WHERE purchase_order_id = ?',
            [JSON.stringify(updatedItems), orderStatus, order.purchase_order_id]
          )
          inboundSynced++
        }
      } catch (e) {
        console.error(`回填采购订单 ${orderNumber} 入库数量失败:`, e.message)
      }
    }
    console.log(`入库数量回填完成：更新了 ${inboundSynced} 条采购订单`)

    console.log('\n迁移完成！')
    console.log(`- 销售订单初始化: ${salesUpdated} 条`)
    console.log(`- 采购订单初始化: ${purchaseUpdated} 条`)
    console.log(`- 出库数量回填: ${outboundSynced} 条`)
    console.log(`- 入库数量回填: ${inboundSynced} 条`)

  } catch (error) {
    console.error('迁移失败:', error)
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

// 执行迁移
migrate().catch(console.error)
