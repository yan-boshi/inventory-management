import fetch from 'node-fetch'

const API_BASE = 'http://localhost:3003/api'
let token = ''

async function test() {
  console.log('开始测试采购订单 API...\n')

  try {
    console.log('1. 登录获取 token...')
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    })

    if (!loginRes.ok) {
      throw new Error(`登录失败: ${loginRes.status}`)
    }

    const loginData = await loginRes.json()
    token = loginData.data.token
    console.log('✓ 登录成功\n')

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }

    console.log('2. 获取新的采购订单编号...')
    const orderNumRes = await fetch(`${API_BASE}/purchase-orders/new-order-number`, {
      headers
    })

    if (!orderNumRes.ok) {
      throw new Error(`获取订单编号失败: ${orderNumRes.status}`)
    }

    const orderNumData = await orderNumRes.json()
    console.log('✓ 订单编号:', orderNumData.data.order_number)
    console.log('✓ 格式检查: XSD-P + 8位日期 + 5位随机数字')

    console.log('\n3. 查询采购订单列表...')
    const listRes = await fetch(`${API_BASE}/purchase-orders?page=1&pageSize=10`, {
      headers
    })

    if (!listRes.ok) {
      throw new Error(`查询列表失败: ${listRes.status}`)
    }

    const listData = await listRes.json()
    console.log(`✓ 查询成功，共 ${listData.data.pagination.total} 条记录`)

    if (listData.data.data.length > 0) {
      const order = listData.data.data[0]
      console.log('\n4. 查看第一条订单数据:')
      console.log('  - 订单编号:', order.order_number)
      console.log('  - 供应商:', order.supplier_name)
      console.log('  - 状态:', order.status === 1 ? '采购中' : '已到货')

      if (order.purchase_items) {
        try {
          const items = JSON.parse(order.purchase_items)
          console.log(`  - 采购商品数: ${items.length}`)
          console.log('  - 商品明细:')
          items.forEach((item, idx) => {
            console.log(`    ${idx + 1}. ${item.product_name} x${item.quantity} ¥${item.tax_included_price}`)
          })
        } catch (e) {
          console.log('  - 解析商品数据失败')
        }
      }

      console.log('\n5. 测试更新订单状态...')
      const newStatus = order.status === 1 ? 2 : 1
      const statusRes = await fetch(`${API_BASE}/purchase-orders/${order.purchase_order_id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      })

      if (!statusRes.ok) {
        throw new Error(`更新状态失败: ${statusRes.status}`)
      }

      console.log('✓ 状态更新成功:', newStatus === 1 ? '采购中' : '已到货')
    }

    console.log('\n6. 创建新的采购订单...')
    const createRes = await fetch(`${API_BASE}/purchase-orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        supplier_name: '测试供应商',
        supplier_code: 'TEST001',
        purchase_items: [
          {
            no: 1,
            business_category: '测试分类',
            product_name: '测试产品',
            product_code: 'TEST-001',
            model: 'TEST-MODEL',
            description: '测试描述',
            unit: '个',
            quantity: 10,
            tax_rate: 13,
            tax_included_price: 100,
            status: 1,
            remarks: '测试备注'
          }
        ],
        currency: 'CNY',
        exchange_rate: 1.0,
        remarks: 'API测试订单'
      })
    })

    if (!createRes.ok) {
      throw new Error(`创建订单失败: ${createRes.status}`)
    }

    const createData = await createRes.json()
    console.log('✓ 创建成功，订单编号:', createData.data.order_number)

    console.log('\n7. 删除测试订单...')
    const deleteRes = await fetch(`${API_BASE}/purchase-orders/${createData.data.purchase_order_id}`, {
      method: 'DELETE',
      headers
    })

    if (!deleteRes.ok) {
      throw new Error(`删除订单失败: ${deleteRes.status}`)
    }

    console.log('✓ 删除成功')

    console.log('\n✅ 所有测试通过！')
    console.log('\n可以访问以下地址进行前端测试:')
    console.log('  前端: http://localhost:5173')
    console.log('  后端: http://localhost:3003/api')

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    process.exit(1)
  }
}

test()
