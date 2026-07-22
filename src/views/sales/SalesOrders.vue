<template>
  <div class="sales-orders-container">
    <div class="header">
      <h1>{{ t.salesOrder.title }}</h1>
      <a-space>
        <a-radio-group v-model:value="lang" size="small" class="lang-switch">
          <a-radio-button value="zh">中文</a-radio-button>
          <a-radio-button value="en">English</a-radio-button>
        </a-radio-group>
        <a-button type="primary" @click="handleAdd">
          <template #icon>
            <PlusOutlined />
          </template>
          {{ t.salesOrder.newTitle }}
        </a-button>
      </a-space>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item :label="t.salesOrder.orderNumber">
            <a-input
              v-model:value="searchParams.orderNumber"
              :placeholder="t.common.pleaseInput + t.salesOrder.orderNumber"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.customerName">
            <a-input
              v-model:value="searchParams.customerName"
              :placeholder="t.common.pleaseInput + t.salesOrder.customerName"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.customerCode">
            <a-input
              v-model:value="searchParams.customerCode"
              :placeholder="t.common.pleaseInput + t.salesOrder.customerCode"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.productCode">
            <a-input
              v-model:value="searchParams.productCode"
              :placeholder="t.common.pleaseInput + t.salesOrder.productCode"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.productName">
            <a-input
              v-model:value="searchParams.productName"
              :placeholder="t.common.pleaseInput + t.salesOrder.productName"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.model">
            <a-input
              v-model:value="searchParams.productModel"
              :placeholder="t.common.pleaseInput + t.salesOrder.model"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.salesDate">
            <a-range-picker
              v-model:value="dateRange"
              @change="handleDateRangeChange"
              style="width: 260px"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch"> <SearchOutlined /> {{ t.common.search }} </a-button>
              <a-button @click="handleReset"> <ReloadOutlined /> {{ t.common.reset }} </a-button>
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
                {{ t.common.edit }}
              </a-button>
              <a-button
                type="link"
                size="small"
                danger
                @click="handleDelete(record)"
                :disabled="record.status === 4"
              >
                {{ t.common.delete }}
              </a-button>
              <a-button
                type="link"
                size="small"
                @click="handleReturn(record)"
                :disabled="record.status === 4"
              >
                {{ t.salesOrder.returned }}
              </a-button>
              <a-button type="link" size="small" @click="handlePrint(record)"> {{ t.common.print }} </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        :show-total="(total: number) => t.salesOrder.totalRecords.replace('{total}', String(total))"
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
import { getLocale, type Lang } from '@/locales'
import dayjs from 'dayjs'

const lang = ref<Lang>('zh')
const t = computed(() => getLocale(lang.value))

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
  pageSize: 100,
  orderNumber: '',
  customerName: '',
  customerCode: '',
  startDate: '',
  endDate: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 100,
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
// 结算方式筛选选项
const paymentMethodFilters = generateFilters('payment_method')
// 币种筛选选项
const currencyFilters = generateFilters('currency')
// 销售员筛选选项
const salesPersonFilters = generateFilters('sales_person')
// 状态筛选选项
const statusFilters = computed(() => [
  { text: t.value.salesOrder.notShipped, value: '1' },
  { text: t.value.salesOrder.fullyShipped, value: '2' },
  { text: t.value.salesOrder.partiallyShipped, value: '3' },
  { text: t.value.salesOrder.returned, value: '4' },
])
// 采购状态筛选选项
const purchaseStatusFilters = computed(() => [
  { text: t.value.salesOrder.notPurchased, value: '1' },
  { text: t.value.salesOrder.partiallyPurchased, value: '2' },
  { text: t.value.salesOrder.purchased, value: '3' },
  { text: t.value.salesOrder.noNeedToPurchase, value: '4' },
])

// 使用 computed 使列定义响应式
const allColumns = computed(() => [
  {
    title: t.value.salesOrder.sequence,
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
    title: t.value.salesOrder.defaultDocNumber,
    dataIndex: 'order_number',
    key: 'order_number',
    width: 150,
    fixed: 'left',
  },
  {
    title: t.value.salesOrder.contractNumberLabel,
    dataIndex: 'contract_number',
    key: 'contract_number',
    width: 150,
  },
  {
    title: t.value.salesOrder.customerName,
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 250,
  },
  {
    title: t.value.salesOrder.customerCode,
    dataIndex: 'customer_code',
    key: 'customer_code',
    width: 120,
  },
  {
    title: t.value.salesOrder.productCode,
    dataIndex: 'product_code',
    key: 'product_code',
    width: 120,
    filters: productCodeFilters.value,
    onFilter: (value: string, record: any) => record.product_code === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.productName,
    dataIndex: 'product_name',
    key: 'product_name',
    width: 150,
    filters: productNameFilters.value,
    onFilter: (value: string, record: any) => record.product_name === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.model,
    dataIndex: 'model',
    key: 'model',
    width: 120,
    filters: modelFilters.value,
    onFilter: (value: string, record: any) => record.model === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.description,
    dataIndex: 'description',
    key: 'description',
    width: 150,
    filters: descriptionFilters.value,
    onFilter: (value: string, record: any) => record.description === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.quantity,
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
    align: 'right',
  },
  {
    title: t.value.salesOrder.unit,
    dataIndex: 'unit',
    key: 'unit',
    width: 60,
    align: 'center',
  },
  {
    title: t.value.salesOrder.amount,
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    align: 'right',
  },
  {
    title: t.value.salesOrder.paymentMethod.replace('：', '').replace(':', ''),
    key: 'payment_method',
    width: 80,
    align: 'center',
    filters: paymentMethodFilters.value,
    onFilter: (value: string, record: any) => String(record.payment_method) === value,
    filterMultiple: true,
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
    title: t.value.common.status,
    dataIndex: 'item_status',
    key: 'status',
    width: 80,
    align: 'center',
    filters: statusFilters.value,
    onFilter: (value: string, record: any) => String(record.item_status) === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.purchaseStatus,
    dataIndex: 'purchase_status',
    key: 'purchase_status',
    width: 100,
    align: 'center',
    filters: purchaseStatusFilters.value,
    onFilter: (value: string, record: any) => String(record.purchase_status) === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.entryDate,
    dataIndex: 'entry_date',
    key: 'entry_date',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
  },
  {
    title: t.value.salesOrder.totalWithTax.replace('：', ''),
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
    title: t.value.salesOrder.currency.replace('：', ''),
    key: 'currency',
    width: 80,
    align: 'center',
    filters: currencyFilters.value,
    onFilter: (value: string, record: any) => String(record.currency) === value,
    filterMultiple: true,
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
    title: t.value.salesOrder.salesPerson,
    dataIndex: 'sales_person',
    key: 'sales_person',
    width: 80,
    align: 'center',
    filters: salesPersonFilters.value,
    onFilter: (value: string, record: any) => String(record.sales_person) === value,
    filterMultiple: true,
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
    title: t.value.common.action,
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
    if (searchParams.productCode) params.productCode = searchParams.productCode
    if (searchParams.productName) params.productName = searchParams.productName
    if (searchParams.productModel) params.productModel = searchParams.productModel
    if (searchParams.startDate) params.salesDate = searchParams.startDate

    const response = await salesOrdersApi.getAll(params)
    console.log('销售订单响应:', response.data)
    orders.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载销售订单失败:', error)
    message.error(t.value.salesOrder.loadOrdersFail)
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
  searchParams.productCode = ''
  searchParams.productName = ''
  searchParams.productModel = ''
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
    title: t.value.salesOrder.deleteConfirmTitle,
    content: t.value.salesOrder.deleteConfirmContent.replace('{orderNumber}', order.order_number),
    okText: t.value.common.confirm,
    cancelText: t.value.common.cancel,
    onOk: async () => {
      try {
        await salesOrdersApi.delete(order.sales_order_id)
        message.success(t.value.salesOrder.deleteSuccess)
        loadOrders()
      } catch (error) {
        message.error(t.value.salesOrder.deleteFail)
      }
    },
  })
}

const handleReturn = (order: SalesOrder) => {
  Modal.confirm({
    title: t.value.salesOrder.returnConfirmTitle,
    content: t.value.salesOrder.returnConfirmContent.replace('{orderNumber}', order.order_number),
    okText: t.value.common.confirm,
    cancelText: t.value.common.cancel,
    onOk: async () => {
      try {
        await salesOrdersApi.return(order.sales_order_id)
        message.success(t.value.salesOrder.returnSuccess)
        loadOrders()
      } catch (error) {
        message.error(t.value.salesOrder.returnFail)
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
    1: t.value.salesOrder.notShipped,
    2: t.value.salesOrder.fullyShipped,
    3: t.value.salesOrder.partiallyShipped,
    4: t.value.salesOrder.returned,
  }
  return textMap[status] || t.value.salesOrder.unknown
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
    1: t.value.salesOrder.notPurchased,
    2: t.value.salesOrder.partiallyPurchased,
    3: t.value.salesOrder.purchased,
    4: t.value.salesOrder.noNeedToPurchase,
  }
  return textMap[status] || t.value.salesOrder.notPurchased
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

    .lang-switch {
      flex-shrink: 0;
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
