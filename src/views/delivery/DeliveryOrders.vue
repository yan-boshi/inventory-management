<template>
  <div class="delivery-orders-container">
    <div class="header">
      <h1>出库单管理</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增出库单
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="出库单号">
            <a-input
              v-model:value="searchParams.orderNumber"
              placeholder="请输入出库单号"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="产品名称">
            <a-input
              v-model:value="searchParams.productName"
              placeholder="请输入产品名称"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="产品代码">
            <a-input
              v-model:value="searchParams.productCode"
              placeholder="请输入产品代码"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="出库日期">
            <a-range-picker
              v-model:value="dateRange"
              @change="handleDateRangeChange"
              style="width: 260px"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch">
                <SearchOutlined />
                查询
              </a-button>
              <a-button @click="handleReset">
                <ReloadOutlined />
                重置
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="columns"
        :data-source="orders"
        :loading="loading"
        :pagination="pagination"
        rowKey="delivery_order_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <a @click="handleViewDetail(record)">{{ record.order_number || '-' }}</a>
          </template>

          <template v-else-if="column.key === 'delivery_items'">
            <a-tag
              v-for="(item, index) in getDeliveryItems(record)"
              :key="index"
              style="margin: 2px"
            >
              {{ item.product_name }} x{{ item.quantity }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'total_amount'">
            <span style="color: #f5222d; font-weight: 500">
              {{ record.total_amount }}
            </span>
          </template>

          <template v-else-if="column.key === 'delivery_time'">
            {{ formatDateTime(record.delivery_time) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleEdit(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
              <a-button type="link" size="small" @click="handlePrint(record)">
                打印
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <DeliveryOrderForm
      v-model:open="formVisible"
      :isEdit="isEdit"
      :deliveryOrderData="currentOrder"
      @success="handleSuccess"
      @print="handlePrintFromForm"
    />

    <DeliveryOrderPrint v-model:visible="printVisible" :order="printOrder" />

    <DeliveryOrderDetail
      v-model:open="detailVisible"
      :deliveryOrder="currentOrder"
      @print="handlePrint"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { deliveryOrdersApi } from '@/api/deliveryOrders'
import type { DeliveryOrder, DeliveryOrderQueryParams } from '@/types'
import DeliveryOrderForm from '@/components/DeliveryOrderForm.vue'
import DeliveryOrderPrint from '@/components/DeliveryOrderPrint.vue'
import DeliveryOrderDetail from '@/components/DeliveryOrderDetail.vue'
import dayjs from 'dayjs'

const orders = ref<DeliveryOrder[]>([])
const loading = ref(false)
const formVisible = ref(false)
const printVisible = ref(false)
const detailVisible = ref(false)
const isEdit = ref(false)
const currentOrder = ref<DeliveryOrder | null>(null)
const printOrder = ref<DeliveryOrder | null>(null)
const dateRange = ref<[any, any] | undefined>(undefined)

const searchParams = reactive<DeliveryOrderQueryParams>({
  page: 1,
  pageSize: 10,
  orderNumber: '',
  productName: '',
  productCode: '',
  deliveryDate: '',
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
    title: '出库单编号',
    dataIndex: 'order_number',
    key: 'order_number',
    width: 180,
  },
  {
    title: '销售订单编号',
    dataIndex: 'sales_order_number',
    key: 'sales_order_number',
    width: 150,
  },
  {
    title: '出库商品',
    key: 'delivery_items',
    width: 300,
  },
  {
    title: '客户名称',
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 150,
  },
  {
    title: '出库时间',
    dataIndex: 'delivery_time',
    key: 'delivery_time',
    width: 160,
  },
  {
    title: '总计',
    key: 'total_amount',
    width: 120,
    align: 'right',
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
  },
]

const loadOrders = async () => {
  loading.value = true
  try {
    const response = await deliveryOrdersApi.getAll(searchParams)
    orders.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载出库单失败:', error)
    message.error('加载出库单失败')
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
  searchParams.productName = ''
  searchParams.productCode = ''
  searchParams.deliveryDate = ''
  dateRange.value = undefined
  handleSearch()
}

const handleDateRangeChange = (dates: [any, any]) => {
  if (dates && dates[0] && dates[1]) {
    searchParams.deliveryDate = dates[0].format('YYYY-MM-DD')
  } else {
    searchParams.deliveryDate = ''
  }
}

const handleTableChange = (pag: any) => {
  searchParams.page = pag.current
  searchParams.pageSize = pag.pageSize
  loadOrders()
}

const handleAdd = () => {
  isEdit.value = false
  currentOrder.value = null
  formVisible.value = true
}

const handleEdit = (order: DeliveryOrder) => {
  isEdit.value = true
  currentOrder.value = order
  formVisible.value = true
}

const handleViewDetail = (order: DeliveryOrder) => {
  currentOrder.value = order
  detailVisible.value = true
}

const handleDelete = (order: DeliveryOrder) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除出库单 ${order.order_number} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deliveryOrdersApi.delete(order.delivery_order_id)
        message.success('删除成功')
        loadOrders()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handlePrint = (order?: DeliveryOrder) => {
  const data = order || currentOrder.value
  if (!data) return

  printOrder.value = data
  printVisible.value = true
}

const handlePrintFromForm = (data: any) => {
  printOrder.value = {
    ...data,
    delivery_items: JSON.stringify(data.delivery_items),
  }
  printVisible.value = true
}

const handleSuccess = () => {
  loadOrders()
}

const getDeliveryItems = (order: DeliveryOrder) => {
  try {
    return typeof order.delivery_items === 'string'
      ? JSON.parse(order.delivery_items)
      : order.delivery_items || []
  } catch {
    return []
  }
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return '-'
  return dayjs(dateString).format('YYYY-MM-DD HH:mm')
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped lang="scss">
.delivery-orders-container {
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
}
</style>
