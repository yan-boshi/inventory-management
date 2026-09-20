<template>
  <div class="delivery-orders-container">
    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="出库单号">
            <a-input
              v-model:value="searchParams.orderNumber"
              placeholder="请输入出库单号"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="销售合同编号">
            <a-input
              v-model:value="searchParams.contractNumber"
              placeholder="请输入销售合同编号"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="客户名称">
            <a-input
              v-model:value="searchParams.customerName"
              placeholder="请输入客户名称"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="产品代码">
            <a-input
              v-model:value="searchParams.productCode"
              placeholder="请输入产品代码"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="产品名称">
            <a-input
              v-model:value="searchParams.productName"
              placeholder="请输入产品名称"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="产品型号">
            <a-input
              v-model:value="searchParams.productModel"
              placeholder="请输入产品型号"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="快递单号">
            <a-input
              v-model:value="searchParams.trackingNumber"
              placeholder="请输入快递单号"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="出库日期">
            <a-range-picker
              v-model:value="dateRange"
              @change="handleDateRangeChange"
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
              <a-button @click="handleExport">
                <DownloadOutlined />
                导出Excel
              </a-button>
              <ColumnConfig :columns="allColumns" @update:columns="handleColumnConfigUpdate" cacheKey="deliveryOrders" />
              <a-button type="primary" @click="handleAdd" style="margin-left: 16px;">
                <template #icon><PlusOutlined /></template>
                新增出库单
              </a-button>
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
        :scroll="{ x: 1800, y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <span class="order-link">{{ record.order_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'contract_number'">
            <span>{{ record.contract_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'customer_name'">
            <span>{{ record.customer_name || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'delivery_time'">
            <span>{{ formatDateTime(record.delivery_time) }}</span>
          </template>

          <template v-else-if="column.key === 'entry_date'">
            <span>{{ formatDate(record.entry_date) }}</span>
          </template>

          <template v-else-if="column.key === 'delivery_person'">
            <span>{{ record.delivery_person || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'tracking_number'">
            <span>{{ record.tracking_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleEdit(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
              <a-button type="link" size="small" @click="handleReturn(record)">
                退货
              </a-button>
              <a-button type="link" size="small" @click="handlePrint(record)">
                打印
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        show-total
        show-size-changer
        show-quick-jumper
        :page-size-options="['10', '20', '50', '100']"
        style="margin-top: 16px; text-align: right"
        @change="handlePageChange"
        @showSizeChange="handlePageChange"
      />
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

    <OutboundReturnForm
      v-model:visible="returnFormVisible"
      :sourceOrder="returnSourceOrder"
      @success="loadOrders"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { deliveryOrdersApi } from '@/api/deliveryOrders'
import type { DeliveryOrder, DeliveryOrderQueryParams } from '@/types'
import DeliveryOrderForm from '@/components/DeliveryOrderForm.vue'
import DeliveryOrderPrint from '@/components/DeliveryOrderPrint.vue'
import DeliveryOrderDetail from '@/components/DeliveryOrderDetail.vue'
import OutboundReturnForm from '@/components/OutboundReturnForm.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import { formatDate, formatDateTime } from '@/utils/date'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'
import dayjs from 'dayjs'

const orders = ref<DeliveryOrder[]>([])
const loading = ref(false)
const formVisible = ref(false)
const printVisible = ref(false)
const detailVisible = ref(false)
const returnFormVisible = ref(false)
const isEdit = ref(false)
const currentOrder = ref<DeliveryOrder | null>(null)
const printOrder = ref<DeliveryOrder | null>(null)
const returnSourceOrder = ref<any>(null)
const dateRange = ref<[any, any] | undefined>(undefined)

// 展开订单数据，每个商品一行
const expandedOrders = computed(() => {
  const result: any[] = []
  let rowIndex = 0
  orders.value.forEach((order, orderIndex) => {
    const items = getDeliveryItems(order)
    if (items.length === 0) {
      result.push({
        ...order,
        row_key: order.delivery_order_id,
        product_code: '-',
        product_name: '-',
        model: '-',
        specification: '-',
        quantity: '-',
        unit: '-',
        _isFirstRow: true,
        _rowCount: 1,
        _orderIndex: orderIndex,
        _rowIndex: rowIndex++,
      })
    } else {
      items.forEach((item: any, index: number) => {
        result.push({
          ...order,
          row_key: `${order.delivery_order_id}_${index}`,
          product_code: item.product_code || '-',
          product_name: item.product_name || '-',
          model: item.model || '-',
          specification: item.specification || '-',
          quantity: item.quantity || '-',
          unit: item.unit || '-',
          _isFirstRow: index === 0,
          _rowCount: items.length,
          _orderIndex: orderIndex,
          _rowIndex: rowIndex++,
        })
      })
    }
  })
  return result
})

const searchParams = reactive<DeliveryOrderQueryParams>({
  page: 1,
  pageSize: 100,
  orderNumber: '',
  contractNumber: '',
  customerName: '',
  productName: '',
  productCode: '',
  productModel: '',
  deliveryDate: '',
  trackingNumber: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 100,
  total: 0,
})

// 动态生成筛选选项的辅助函数
const generateFilters = (dataKey: string) => {
  return computed(() => {
    const values = [...new Set(expandedOrders.value.map((item: any) => item[dataKey]).filter(Boolean))]
    return values.map(value => ({ text: String(value), value: String(value) }))
  })
}

// 产品代码筛选选项
const productCodeFilters = generateFilters('product_code')
// 产品名称筛选选项
const productNameFilters = generateFilters('product_name')
// 产品型号筛选选项
const modelFilters = generateFilters('model')
// 产品描述筛选选项（出库单使用 specification 字段）
const specificationFilters = generateFilters('specification')
// 客户名称筛选选项
const customerNameFilters = generateFilters('customer_name')
// 制单人筛选选项
const deliveryPersonFilters = generateFilters('delivery_person')

// 使用 ref 使列配置可通过 ColumnConfig 组件更新
const allColumns = ref([
  {
    title: '序号',
    key: 'index',
    width: 60,
    align: 'center',
    fixed: 'left',
    customRender: ({ record }: { record: any }) => {
      return (pagination.current - 1) * pagination.pageSize + record._rowIndex + 1
    },
  },
  {
    title: '出库单编号',
    dataIndex: 'order_number',
    key: 'order_number',
    width: 180,
    fixed: 'left',
  },
  {
    title: '销售合同编号',
    dataIndex: 'contract_number',
    key: 'contract_number',
    width: 150,
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
    dataIndex: 'specification',
    key: 'specification',
    width: 150,
    filters: specificationFilters.value,
    onFilter: (value: string, record: any) => record.specification === value,
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
    title: '客户名称',
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 150,
    filters: customerNameFilters.value,
    onFilter: (value: string, record: any) => String(record.customer_name) === value,
    filterMultiple: true,
  },
  {
    title: '出库时间',
    dataIndex: 'delivery_time',
    key: 'delivery_time',
    width: 160,
  },
  {
    title: '录入日期',
    dataIndex: 'entry_date',
    key: 'entry_date',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
  },
  {
    title: '制单人',
    dataIndex: 'delivery_person',
    key: 'delivery_person',
    width: 100,
    filters: deliveryPersonFilters.value,
    onFilter: (value: string, record: any) => String(record.delivery_person) === value,
    filterMultiple: true,
  },
  {
    title: '快递单号',
    dataIndex: 'tracking_number',
    key: 'tracking_number',
    width: 150,
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
  },
])

// 标记是否正在从 ColumnConfig 更新，防止 watcher 覆盖
let isUpdatingFromConfig = false

// 处理 ColumnConfig 组件的列更新
const handleColumnConfigUpdate = (newColumns: any[]) => {
  isUpdatingFromConfig = true
  allColumns.value = newColumns
  isUpdatingFromConfig = false
}

// 当动态筛选数据变化时，更新 allColumns 中对应列的 filters
watch(
  [productCodeFilters, productNameFilters, modelFilters, specificationFilters, customerNameFilters, deliveryPersonFilters],
  () => {
    if (isUpdatingFromConfig) return
    const cols = allColumns.value
    const filterMap: Record<string, any> = {
      product_code: productCodeFilters.value,
      product_name: productNameFilters.value,
      model: modelFilters.value,
      specification: specificationFilters.value,
      customer_name: customerNameFilters.value,
      delivery_person: deliveryPersonFilters.value,
    }
    cols.forEach((col: any) => {
      if (col.dataIndex && filterMap[col.dataIndex]) {
        col.filters = filterMap[col.dataIndex]
      }
    })
  }
)

const visibleColumns = computed(() => {
  return allColumns.value.filter((col: any) => col.visible !== false)
})

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
  searchParams.contractNumber = ''
  searchParams.customerName = ''
  searchParams.productName = ''
  searchParams.productCode = ''
  searchParams.productModel = ''
  searchParams.trackingNumber = ''
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

const handlePageChange = (page: number, pageSize: number) => {
  searchParams.page = page
  searchParams.pageSize = pageSize
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

const handleReturn = (order: DeliveryOrder) => {
  returnSourceOrder.value = order
  returnFormVisible.value = true
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

// 导出Excel
const exportColumns: ExportColumn[] = [
  { key: 'order_number', title: '出库单编号' },
  { key: 'contract_number', title: '销售合同编号' },
  { key: 'product_code', title: '产品代码' },
  { key: 'product_name', title: '产品名称' },
  { key: 'model', title: '产品型号' },
  { key: 'specification', title: '产品描述' },
  { key: 'quantity', title: '数量' },
  { key: 'unit', title: '单位' },
  { key: 'customer_name', title: '客户名称' },
  { key: 'delivery_time', title: '出库时间' },
  { key: 'entry_date', title: '录入日期', formatter: (v) => formatDate(v) },
  { key: 'delivery_person', title: '制单人' },
  { key: 'tracking_number', title: '快递单号' },
]

const handleExport = async () => {
  try {
    const response = await deliveryOrdersApi.getAll({ ...searchParams, page: 1, pageSize: 99999 })
    const allOrders: DeliveryOrder[] = response.data || []
    // 展开订单数据
    const rows: any[] = []
    allOrders.forEach((order) => {
      const items = getDeliveryItems(order)
      if (items.length === 0) {
        rows.push({ ...order, product_code: '-', product_name: '-', model: '-', specification: '-', quantity: '-', unit: '-' })
      } else {
        items.forEach((item: any) => {
          rows.push({
            ...order,
            product_code: item.product_code || '-',
            product_name: item.product_name || '-',
            model: item.model || '-',
            specification: item.specification || '-',
            quantity: item.quantity || '-',
            unit: item.unit || '-',
          })
        })
      }
    })
    // 只导出显示的列
    const visibleKeySet = new Set(visibleColumns.value.flatMap((col: any) => [col.dataIndex, col.key]).filter(Boolean))
    const filteredExportColumns = exportColumns.filter(col => visibleKeySet.has(col.key))
    exportToExcel({ filename: '出库单', columns: filteredExportColumns, data: rows })
  } catch {
    message.error('导出失败')
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped lang="scss">
.delivery-orders-container {
  padding: 16px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
  }

  .search-bar {
    margin-bottom: 8px;

    :deep(.ant-form-item) {
      margin-bottom: 8px;

      > .ant-form-item-label {
        width: 80px;
        text-align: right;
        padding-right: 8px;
      }
    }

    :deep(.ant-input),
    :deep(.ant-input-affix-wrapper) {
      width: 180px;
    }

    :deep(.ant-picker) {
      width: 240px;
    }

    :deep(.ant-select) {
      width: 180px;
    }
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
