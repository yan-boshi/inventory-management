<template>
  <div class="warehousing-orders-container">
    <div class="header">
      <h1>入库单管理</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增入库单
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

          <a-form-item label="入库日期">
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
        rowKey="warehousing_order_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <a @click="handleViewDetail(record)">{{ record.order_number || '-' }}</a>
          </template>

          <template v-else-if="column.key === 'warehousing_items'">
            <div class="product-info-cell">
              <div v-for="(item, idx) in getParsedWarehousingItems(record)" :key="idx" class="product-info-item">
                {{ item.product_name }}
                <span v-if="item.product_code">（{{ item.product_code }}）</span>
                <span v-if="item.description"> {{ item.description }}</span>
                <span v-if="item.quantity"> × {{ item.quantity }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'total_amount'">
            <span style="color: #f5222d; font-weight: 500">
              {{ record.total_amount }}
            </span>
          </template>

          <template v-else-if="column.key === 'warehousing_time'">
            {{ formatDateTime(record.warehousing_time) }}
          </template>

          <template v-else-if="column.key === 'entry_date'">
            {{ formatDate(record.entry_date) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleEdit(record)"> 编辑 </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
              <a-button type="link" size="small" @click="handlePrint(record)"> 打印 </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <WarehousingOrderForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :warehousingOrderData="currentOrder"
      @success="handleSuccess"
      @print="handlePrint"
    />

    <WarehousingOrderPrint v-model:visible="printVisible" :order="printOrder" />

    <WarehousingOrderDetail v-model:visible="detailVisible" :order="currentOrder" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { warehousingOrdersApi } from '@/api/warehousingOrders'
import type { WarehousingOrder, WarehousingOrderQueryParams } from '@/types'
import WarehousingOrderForm from '@/components/WarehousingOrderForm.vue'
import WarehousingOrderPrint from '@/components/WarehousingOrderPrint.vue'
import WarehousingOrderDetail from '@/components/WarehousingOrderDetail.vue'
import dayjs from 'dayjs'

const orders = ref<WarehousingOrder[]>([])
const loading = ref(false)
const formVisible = ref(false)
const printVisible = ref(false)
const detailVisible = ref(false)
const isEdit = ref(false)
const currentOrder = ref<WarehousingOrder | undefined>(undefined)
const printOrder = ref<any>(undefined)
const dateRange = ref<[any, any] | undefined>(undefined)

const searchParams = reactive<WarehousingOrderQueryParams>({
  page: 1,
  pageSize: 10,
  orderNumber: '',
  productName: '',
  productCode: '',
  warehousingDate: '',
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
    title: '入库单编号',
    dataIndex: 'order_number',
    key: 'order_number',
    width: 180,
  },
  {
    title: '采购合同编号',
    dataIndex: 'contract_number',
    key: 'contract_number',
    width: 150,
  },
  {
    title: '入库商品',
    key: 'warehousing_items',
    width: 300,
  },
  {
    title: '客户名称',
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 150,
  },
  {
    title: '入库时间',
    dataIndex: 'warehousing_time',
    key: 'warehousing_time',
    width: 160,
  },
  {
    title: '录入日期',
    dataIndex: 'entry_date',
    key: 'entry_date',
    width: 120,
  },
  {
    title: '快递单号',
    dataIndex: 'tracking_number',
    key: 'tracking_number',
    width: 150,
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
    const response = await warehousingOrdersApi.getAll(searchParams)
    orders.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载入库单失败:', error)
    message.error('加载入库单失败')
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
  searchParams.warehousingDate = ''
  dateRange.value = undefined
  handleSearch()
}

const handleDateRangeChange = (dates: [any, any]) => {
  if (dates && dates[0] && dates[1]) {
    searchParams.warehousingDate = dates[0].format('YYYY-MM-DD')
  } else {
    searchParams.warehousingDate = ''
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

const handleEdit = (order: WarehousingOrder) => {
  isEdit.value = true
  currentOrder.value = order
  formVisible.value = true
}

const handleViewDetail = (order: WarehousingOrder) => {
  currentOrder.value = order
  detailVisible.value = true
}

const handleDelete = (order: WarehousingOrder) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除入库单 ${order.order_number} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await warehousingOrdersApi.delete(order.warehousing_order_id)
        message.success('删除成功')
        loadOrders()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handlePrint = (order?: any) => {
  const data = order || currentOrder.value
  if (!data) return

  printOrder.value = {
    order_number: data.order_number,
    contract_number: data.contract_number,
    warehousing_items: data.warehousing_items,
    warehousing_time: data.warehousing_time,
    tracking_number: data.tracking_number,
    customer_name: data.customer_name,
    customer_address: data.customer_address,
    total_amount: data.total_amount,
    currency: data.currency,
    warehousing_person: data.warehousing_person,
    contact_phone: data.contact_phone,
    remarks: data.remarks,
  }
  printVisible.value = true
}

const handleSuccess = () => {
  loadOrders()
}

const getParsedWarehousingItems = (order: WarehousingOrder) => {
  console.log('order', order.warehousing_items)
  try {
    return JSON.parse(order.warehousing_items || '[]')
  } catch {
    return []
  }
}

const formatDateTime = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm')
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return dayjs(dateString).format('YYYY-MM-DD')
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped lang="scss">
.warehousing-orders-container {
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

  .product-info-cell {
    .product-info-item {
      font-size: 12px;
      line-height: 1.6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &:not(:last-child) {
        border-bottom: 1px dashed #f0f0f0;
        padding-bottom: 2px;
        margin-bottom: 2px;
      }
    }
  }
}
</style>
