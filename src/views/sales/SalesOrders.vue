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
              <ColumnConfig v-model:columns="allColumns" cacheKey="salesOrders" />
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        v-scroll-topbar
        :columns="visibleColumns"
        :data-source="expandedOrders"
        :loading="loading"
        :pagination="false"
        rowKey="row_key"
        :scroll="{ x: 1900, y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <span class="order-link">{{ record.order_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'contract_number'">
            <span v-if="record._isFirstRow">{{ record.contract_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'customer_name'">
            <span v-if="record._isFirstRow">{{ record.customer_name || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'customer_code'">
            <span v-if="record._isFirstRow">{{ record.customer_code || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.item_status)">
              {{ getStatusText(record.item_status) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'purchase_status'">
            <a-tag :color="getPurchaseStatusColor(record.purchase_status || 1)">
              {{ getPurchaseStatusText(record.purchase_status || 1) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'entry_date'">
            <span v-if="record._isFirstRow">{{ formatDate(record.entry_date) }}</span>
          </template>

          <template v-else-if="column.key === 'payment_method'">
            <span v-if="record._isFirstRow">{{ record.payment_method }}</span>
          </template>

          <template v-else-if="column.key === 'tax_included_amount'">
            <span v-if="record._isFirstRow" style="color: #f5222d; font-weight: 500">
              {{ record.tax_included_amount }}
            </span>
          </template>
          <template v-else-if="column.key === 'currency'">
            <span v-if="record._isFirstRow">{{ record.currency }}</span>
          </template>

          <template v-else-if="column.key === 'sales_person'">
            <span v-if="record._isFirstRow">{{ record.sales_person || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space v-if="record._isFirstRow">
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
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        :show-total="(total: number) => `共 ${total} 条记录`"
        show-size-changer
        show-quick-jumper
        :page-size-options="['10', '20', '50', '100']"
        style="margin-top: 16px; text-align: right"
        @change="handlePageChange"
        @showSizeChange="handlePageChange"
      />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { salesOrdersApi } from '@/api/salesOrders'
import type { SalesOrder, SalesOrderQueryParams } from '@/types'
import SalesOrderForm from '@/components/SalesOrderForm.vue'
import SalesOrderDetail from '@/components/SalesOrderDetail.vue'
import SalesOrderPrint from '@/components/SalesOrderPrint.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import { formatDate } from '@/utils/date'
import dayjs from 'dayjs'

const orders = ref<SalesOrder[]>([])
const loading = ref(false)
const formVisible = ref(false)
const detailVisible = ref(false)
const printVisible = ref(false)
const isEdit = ref(false)
const currentOrder = ref<SalesOrder | undefined>(undefined)
const dateRange = ref<[any, any] | undefined>(undefined)

// 展开订单数据，每个商品一行
const expandedOrders = computed(() => {
  const result: any[] = []
  orders.value.forEach((order, orderIndex) => {
    const items = parseSalesItems(order.sales_items)
    if (items.length === 0) {
      result.push({
        ...order,
        row_key: order.sales_order_id,
        product_code: '-',
        product_name: '-',
        model: '-',
        description: '-',
        quantity: '-',
        unit: '-',
        amount: 0,
        item_status: order.status,
        purchase_status: 1,
        _isFirstRow: true,
        _rowCount: 1,
        _orderIndex: orderIndex,
      })
    } else {
      items.forEach((item: any, index: number) => {
        result.push({
          ...order,
          row_key: `${order.sales_order_id}_${index}`,
          product_code: item.product_code || '-',
          product_name: item.product_name || '-',
          model: item.model || '-',
          description: item.description || '-',
          quantity: item.quantity || '-',
          unit: item.unit || '-',
          amount: item.tax_included_amount || 0,
          item_status: item.status || 1,
          purchase_status: item.purchase_status || 1,
          _isFirstRow: index === 0,
          _rowCount: items.length,
          _orderIndex: orderIndex,
        })
      })
    }
  })
  return result
})

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
})

// 动态生成筛选选项的辅助函数
const generateFilters = (dataKey: string) => {
  return computed(() => {
    const values = [
      ...new Set(expandedOrders.value.map((item: any) => item[dataKey]).filter(Boolean)),
    ]
    return values.map(value => ({ text: String(value), value: String(value) }))
  })
}

// 产品代码筛选选项
const productCodeFilters = generateFilters('product_code')
// 产品名称筛选选项
const productNameFilters = generateFilters('product_name')
// 产品型号筛选选项
const modelFilters = generateFilters('model')
// 产品描述筛选选项
const descriptionFilters = generateFilters('description')

// 使用 computed 使列定义响应式
const allColumns = computed(() => [
  {
    title: '序号',
    key: 'index',
    width: 60,
    align: 'center',
    fixed: 'left',
    customRender: ({ record }: { record: any }) => {
      if (record._isFirstRow) {
        return (pagination.current - 1) * pagination.pageSize + record._orderIndex + 1
      }
      return ''
    },
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '默认单据编号',
    dataIndex: 'order_number',
    key: 'order_number',
    width: 150,
    fixed: 'left',
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
    width: 250,
  },
  {
    title: '客户代码',
    dataIndex: 'customer_code',
    key: 'customer_code',
    width: 120,
  },
  {
    title: '产品代码',
    dataIndex: 'product_code',
    key: 'product_code',
    width: 120,
    filters: productCodeFilters.value,
    onFilter: (value: string, record: any) => record.product_code === value,
    filterMultiple: true,
  },
  {
    title: '产品名称',
    dataIndex: 'product_name',
    key: 'product_name',
    width: 150,
    filters: productNameFilters.value,
    onFilter: (value: string, record: any) => record.product_name === value,
    filterMultiple: true,
  },
  {
    title: '产品型号',
    dataIndex: 'model',
    key: 'model',
    width: 120,
    filters: modelFilters.value,
    onFilter: (value: string, record: any) => record.model === value,
    filterMultiple: true,
  },
  {
    title: '产品描述',
    dataIndex: 'description',
    key: 'description',
    width: 150,
    filters: descriptionFilters.value,
    onFilter: (value: string, record: any) => record.description === value,
    filterMultiple: true,
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
    align: 'right',
  },
  {
    title: '单位',
    dataIndex: 'unit',
    key: 'unit',
    width: 60,
    align: 'center',
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    align: 'right',
  },
  {
    title: '结算方式',
    key: 'payment_method',
    width: 80,
    align: 'center',
  },
  {
    title: '状态',
    dataIndex: 'item_status',
    key: 'status',
    width: 80,
    align: 'center',
  },
  {
    title: '采购状态',
    dataIndex: 'purchase_status',
    key: 'purchase_status',
    width: 100,
    align: 'center',
  },
  {
    title: '录入日期',
    dataIndex: 'entry_date',
    key: 'entry_date',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
  },
  {
    title: '总价',
    key: 'tax_included_amount',
    width: 120,
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '币种',
    key: 'currency',
    width: 80,
    align: 'center',
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '销售员',
    dataIndex: 'sales_person',
    key: 'sales_person',
    width: 80,
    align: 'center',
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
])

const visibleColumns = computed(() => {
  return allColumns.value.filter((col: any) => col.visible !== false)
})

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

const handlePageChange = (page: number, pageSize: number) => {
  searchParams.page = page
  searchParams.pageSize = pageSize
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

const getPurchaseStatusColor = (status: number) => {
  const colorMap: Record<number, string> = {
    1: 'default', // 未采购
    2: 'orange', // 部分采购
    3: 'green', // 已采购
    4: 'blue', // 无需采购
  }
  return colorMap[status] || 'default'
}

const getPurchaseStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: '未采购',
    2: '部分采购',
    3: '已采购',
    4: '无需采购',
  }
  return textMap[status] || '未采购'
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

  .order-link {
    color: #1890ff;
    cursor: pointer;

    &:hover {
      color: #40a9ff;
    }
  }
}
</style>
