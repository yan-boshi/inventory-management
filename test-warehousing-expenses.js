// Test script for warehousing expenses feature

const axios = require('axios');

// API base URL
const BASE_URL = 'http://localhost:3000/api';

async function testWarehousingExpenses() {
  try {
    // Create a warehousing order with expenses
    console.log('Testing warehousing order creation with expenses...');

    const warehousingOrderData = {
      warehousing_items: [
        {
          no: 1,
          product_code: 'TEST-001',
          product_name: '测试产品',
          description: '测试描述',
          unit: '个',
          quantity: 10,
          remarks: '测试备注'
        }
      ],
      warehousing_time: '2024-05-19 10:00:00',
      customer_name: '测试客户',
      total_amount: 1000,
      currency: 'CNY',
      warehousing_person: '张三',
      contact_phone: '13800138000',
      remarks: '测试入库单',
      expenses: {
        快递费: 100,
        运杂费: 200,
        报关费: 50,
        其他: 30
      }
    };

    // Create warehousing order
    const createResponse = await axios.post(`${BASE_URL}/warehousing-orders`, warehousingOrderData);
    console.log('Create response:', createResponse.data);

    if (createResponse.data.success) {
      const orderId = createResponse.data.data.warehousing_order_id;

      // Get the created order
      const getOrderResponse = await axios.get(`${BASE_URL}/warehousing-orders/${orderId}`);
      console.log('Get order response:', getOrderResponse.data);

      // Update the order with different expenses
      const updateData = {
        expenses: {
          快递费: 150,
          运杂费: 250,
          报关费: 75,
          其他: 45
        }
      };

      const updateResponse = await axios.put(`${BASE_URL}/warehousing-orders/${orderId}`, updateData);
      console.log('Update response:', updateResponse.data);

      // Get updated order
      const getUpdatedOrderResponse = await axios.get(`${BASE_URL}/warehousing-orders/${orderId}`);
      console.log('Updated order expenses:', getUpdatedOrderResponse.data.data.expenses);
    }

  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

// Run the test
testWarehousingExpenses();