// 测试出库单 API
import axios from 'axios'

const API_BASE = 'http://localhost:3003/api'

async function testDeliveryOrders() {
  try {
    // 测试获取出库单列表
    console.log('测试获取出库单列表...')
    const response = await axios.get(`${API_BASE}/delivery-orders`)
    console.log('出库单列表:', response.data)

    // 测试获取未出库的销售订单
    console.log('\n测试获取未出库的销售订单...')
    const salesOrdersResponse = await axios.get(`${API_BASE}/delivery-orders/sales-orders/undelivered`)
    console.log('未出库的销售订单:', salesOrdersResponse.data)
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message)
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testDeliveryOrders()
}

export { testDeliveryOrders }