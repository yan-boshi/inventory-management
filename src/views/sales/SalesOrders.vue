<template>
  <div class="sales-orders-container">
    <div class="header">
      <h1>销售订单</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增销售订单
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="订单号">
            <a-input
              v-model:value="searchParams.orderNumber"
              placeholder="请输入订单号"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="客户名称">
            <a-input
              v-model:value="searchParams.customerName"
              placeholder="请输入客户名称"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="客户代码">
            <a-input
              v-model:value="searchParams.customerCode"
              placeholder="请输入客户代码"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="销售日期">
            <a-range-picker
              v-model:value="dateRange"
              @change="handleDateRangeChange"
              style="width: 260px"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch"> <SearchOutlined /> 查询 </a-button>
              <a-button @click="handleReset"> <ReloadOutlined /> 重置 </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="columns"
        :data-source="orders"
        :loading="loading"
        :pagination="pagination"
        rowKey="sales_order_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <a @click="handleViewDetail(record)">{{ record.order_number || '-' }}</a>
          </template>

          <template v-else-if="column.key === 'item_count'">
            {{ getItemCount(record.sales_items) }}
          </template>

          <template v-else-if="column.key === 'product_info'">
            <table class="items-mini-table">
              <thead>
                <tr>
                  <th>产品代码</th>
                  <th>产品名称</th>
                  <th>产品型号</th>
                  <th>产品描述</th>
                  <th>数量</th>
                  <th>单位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in parseSalesItems(record.sales_items)" :key="idx">
                  <td>{{ item.product_code || '-' }}</td>
                  <td>{{ item.product_name || '-' }}</td>
                  <td>{{ item.model || '-' }}</td>
                  <td>{{ item.description || '-' }}</td>
                  <td class="num">{{ item.quantity || '-' }}</td>
                  <td>{{ item.unit || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'entry_date'">
            {{ formatDate(record.entry_date) }}
          </template>

          <template v-else-if="column.key === 'payment_method'">
            {{ record.payment_method }}
          </template>

          <template v-else-if="column.key === 'tax_included_amount'">
            <span style="color: #f5222d; font-weight: 500">
              {{ record.tax_included_amount }}
            </span>
          </template>
          <template v-else-if="column.key === 'currency'">
            {{ record.currency }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                type="link"
                size="small"
                @click="handleEdit(record)"
                :disabled="record.status === 4"
              >
                编辑
              </a-button>
              <a-button
                type="link"
                size="small"
                danger
                @click="handleDelete(record)"
                :disabled="record.status === 4"
              >
                删除
              </a-button>
              <a-button
                type="link"
                size="small"
                @click="handleReturn(record)"
                :disabled="record.status === 4"
              >
                退货
              </a-button>
              <a-button type="link" size="small" @click="handlePrint(record)"> 打印 </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑表单弹窗 -->
    <SalesOrderForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :salesOrderData="currentOrder"
      @success="handleSuccess"
    />

    <!-- 详情弹窗 -->
    <SalesOrderDetail v-model:visible="detailVisible" :order="currentOrder" />

    <!-- 打印弹窗 -->
    <SalesOrderPrint v-model:visible="printVisible" :order="currentOrder" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { salesOrdersApi } from '@/api/salesOrders'
import type { SalesOrder, SalesOrderQueryParams } from '@/types'
import SalesOrderForm from '@/components/SalesOrderForm.vue'
import SalesOrderDetail from '@/components/SalesOrderDetail.vue'
import SalesOrderPrint from '@/components/SalesOrderPrint.vue'
import dayjs from 'dayjs'

const orders = ref<SalesOrder[]>([])
const loading = ref(false)
const formVisible = ref(false)
const detailVisible = ref(false)
const printVisible = ref(false)
const isEdit = ref(false)
const currentOrder = ref<SalesOrder | undefined>(undefined)
const dateRange = ref<[any, any] | undefined>(undefined)

const searchParams = reactive<SalesOrderQueryParams>({
  page: 1,
  pageSize: 10,
  orderNumber: '',
  customerName: '',
  customerCode: '',
  startDate: '',
  endDate: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
  pageSizeOptions: ['10', '20', '50', '100'],
})

const columns = [
  {
    title: '默认单据编号',
    dataIndex: 'order_number',
    key: 'order_number',
    width: 150,
  },
  {
    title: '合同编号',
    dataIndex: 'contract_number',
    key: 'contract_number',
    width: 150,
  },
  {
    title: '客户名称',
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 300,
  },
  {
    title: '客户代码',
    dataIndex: 'customer_code',
    key: 'customer_code',
    width: 120,
  },
  {
    title: '商品信息',
    key: 'product_info',
    width: 600,
  },
  {
    title: '结算方式',
    key: 'payment_method',
    width: 80,
    align: 'center',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
    align: 'center',
  },
  {
    title: '录入日期',
    dataIndex: 'entry_date',
    key: 'entry_date',
    width: 120,
  },
  {
    title: '总价',
    key: 'tax_included_amount',
    width: 120,
  },
  {
    title: '币种',
    key: 'currency',
    width: 120,
  },
  {
    title: '销售人',
    dataIndex: 'sales_person',
    key: 'sales_person',
    width: 80,
    align: 'center',
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
  },
]

const loadOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: searchParams.page,
      pageSize: searchParams.pageSize,
    }

    if (searchParams.orderNumber) params.orderNumber = searchParams.orderNumber
    if (searchParams.customerName) params.customerName = searchParams.customerName
    if (searchParams.customerCode) params.customerCode = searchParams.customerCode
    if (searchParams.startDate) params.salesDate = searchParams.startDate

    const response = await salesOrdersApi.getAll(params)
    console.log('销售订单响应:', response.data)
    orders.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载销售订单失败:', error)
    message.error('加载销售订单失败')
    orders.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadOrders()
}

const handleReset = () => {
  searchParams.orderNumber = ''
  searchParams.customerName = ''
  searchParams.customerCode = ''
  searchParams.startDate = ''
  searchParams.endDate = ''
  dateRange.value = undefined
  handleSearch()
}

const handleDateRangeChange = (dates: [any, any]) => {
  if (dates && dates[0] && dates[1]) {
    searchParams.startDate = dates[0].format('YYYY-MM-DD')
    searchParams.endDate = dates[1].format('YYYY-MM-DD')
  } else {
    searchParams.startDate = ''
    searchParams.endDate = ''
  }
}

const handleTableChange = (pag: any) => {
  searchParams.page = pag.current
  searchParams.pageSize = pag.pageSize
  loadOrders()
}

const handleAdd = () => {
  isEdit.value = false
  currentOrder.value = undefined
  formVisible.value = true
}

const handleEdit = (order: SalesOrder) => {
  isEdit.value = true
  currentOrder.value = order
  formVisible.value = true
}

const handleViewDetail = (order: SalesOrder) => {
  currentOrder.value = order
  detailVisible.value = true
}

const handleDelete = (order: SalesOrder) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除销售订单 ${order.order_number} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await salesOrdersApi.delete(order.sales_order_id)
        message.success('删除成功')
        loadOrders()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleReturn = (order: SalesOrder) => {
  Modal.confirm({
    title: '确认退货',
    content: `确定要将销售订单 ${order.order_number} 标记为退货吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await salesOrdersApi.return(order.sales_order_id)
        message.success('退货成功')
        loadOrders()
      } catch (error) {
        message.error('退货失败')
      }
    },
  })
}

const handlePrint = (order: SalesOrder) => {
  console.log('order1111', order)
  currentOrder.value = order
  printVisible.value = true
}

const handleSuccess = () => {
  loadOrders()
}

const formatMoney = (amount: number | string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${(numAmount || 0).toFixed(2)}`
}

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD')
}

const getItemCount = (salesItems: string) => {
  try {
    const items = JSON.parse(salesItems || '[]')
    return items.length
  } catch {
    return 0
  }
}

const parseSalesItems = (salesItems: string) => {
  try {
    return JSON.parse(salesItems || '[]')
  } catch {
    return []
  }
}

const getStatusColor = (status: number) => {
  const colorMap: Record<number, string> = {
    1: 'blue', // 未出库
    2: 'green', // 已全部出库
    3: 'orange', // 已部分出库
    4: 'red', // 退货
  }
  return colorMap[status] || 'default'
}

const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: '未出库',
    2: '已全部出库',
    3: '已部分出库',
    4: '退货',
  }
  return textMap[status] || '未知'
}

const getTotalAmount = (salesItems: string) => {
  try {
    const items = JSON.parse(salesItems || '[]')
    return items.reduce(
      (sum: number, item: any) => sum + (parseFloat(item.tax_included_amount) || 0),
      0
    )
  } catch {
    return 0
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped lang="scss">
.sales-orders-container {
  padding: 24px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
  }

  .search-bar {
    margin-bottom: 16px;
  }

  .items-mini-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;

    th, td {
      padding: 2px 6px;
      border: 1px solid #f0f0f0;
      white-space: nowrap;
    }

    th {
      background: #fafafa;
      font-weight: 500;
    }

    td.num {
      text-align: right;
    }
  }
}
</style>
