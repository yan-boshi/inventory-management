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
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.customerName">
            <a-input
              v-model:value="searchParams.customerName"
              :placeholder="t.common.pleaseInput + t.salesOrder.customerName"
              allow-clear
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.customerCode">
            <a-input
              v-model:value="searchParams.customerCode"
              :placeholder="t.common.pleaseInput + t.salesOrder.customerCode"
              allow-clear
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.contractNumberLabel">
            <a-input
              v-model:value="searchParams.contractNumber"
              :placeholder="t.common.pleaseInput + t.salesOrder.contractNumberLabel"
              allow-clear
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.productCode">
            <a-input
              v-model:value="searchParams.productCode"
              :placeholder="t.common.pleaseInput + t.salesOrder.productCode"
              allow-clear
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.productName">
            <a-input
              v-model:value="searchParams.productName"
              :placeholder="t.common.pleaseInput + t.salesOrder.productName"
              allow-clear
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.model">
            <a-input
              v-model:value="searchParams.productModel"
              :placeholder="t.common.pleaseInput + t.salesOrder.model"
              allow-clear
            />
          </a-form-item>

          <a-form-item :label="t.salesOrder.salesDate">
            <a-range-picker v-model:value="dateRange" @change="handleDateRangeChange" />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch">
                <SearchOutlined /> {{ t.common.search }}
              </a-button>
              <a-button @click="handleReset"> <ReloadOutlined /> {{ t.common.reset }} </a-button>
              <a-button @click="handleExport">
                <DownloadOutlined /> {{ t.common.export || '导出Excel' }}
              </a-button>
              <ColumnConfig
                :columns="allColumns"
                @update:columns="handleColumnConfigUpdate"
                cacheKey="salesOrders"
              />
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
        :scroll="{ x: 3800, y: 'calc(100vh - 300px)' }"
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

          <template v-else-if="column.key === 'customer_code'">
            <span>{{ record.customer_code || '-' }}</span>
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
            <span>{{ formatDate(record.entry_date) }}</span>
          </template>

          <template v-else-if="column.key === 'payment_method'">
            <span>{{ record.payment_method }}</span>
          </template>

          <template v-else-if="column.key === 'tax_included_amount'">
            <span style="color: #f5222d; font-weight: 500">
              {{ record.amount }}
            </span>
          </template>
          <template v-else-if="column.key === 'currency'">
            <span>{{ record.currency }}</span>
          </template>

          <template v-else-if="column.key === 'sales_person'">
            <span>{{ record.sales_person || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'settlement_status'">
            <a-tag
              :color="
                record.settlement_status === '全部结算'
                  ? 'green'
                  : record.settlement_status === '部分结算'
                  ? 'orange'
                  : 'default'
              "
            >
              {{ record.settlement_status || '未结算' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                type="link"
                size="small"
                @click="handleEdit(record)"
              >
                {{ t.common.edit }}
              </a-button>
              <a-button
                type="link"
                size="small"
                danger
                @click="handleDelete(record)"
              >
                {{ t.common.delete }}
              </a-button>
              <a-dropdown>
                <a-button type="link" size="small">
                  {{ t.common.print }}
                  <DownOutlined />
                </a-button>
                <template #overlay>
                  <a-menu @click="({ key }: any) => handlePrintSelect(key, record)">
                    <a-menu-item key="contract">打印合同</a-menu-item>
                    <a-menu-item key="packingList">打印装箱单</a-menu-item>
                    <a-menu-item key="invoice">打印发票</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
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

    <!-- 打印弹窗 -->
    <SalesOrderPrint v-model:visible="printVisible" :order="currentOrder" />

    <!-- 装箱单打印弹窗 -->
    <PackingListForm
      v-model:visible="packingListVisible"
      source="sales"
      :po-number="currentOrder?.contract_number"
      :sales-order-data="currentOrder"
      @success="handlePackingListSuccess"
    />

    <!-- 发票打印弹窗 -->
    <InvoiceForm
      v-model:visible="invoiceVisible"
      source="sales"
      :sales-order-data="currentOrder"
      @success="handleInvoiceSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import { salesOrdersApi } from '@/api/salesOrders'
import type { SalesOrder, SalesOrderQueryParams } from '@/types'
import SalesOrderForm from '@/components/SalesOrderForm.vue'
import SalesOrderPrint from '@/components/SalesOrderPrint.vue'
import PackingListForm from '@/components/PackingListForm.vue'
import InvoiceForm from '@/components/InvoiceForm.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import { formatDate } from '@/utils/date'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'
import { getLocale, type Lang } from '@/locales'
import dayjs from 'dayjs'

const lang = ref<Lang>('zh')
const t = computed(() => getLocale(lang.value))

const orders = ref<SalesOrder[]>([])
const loading = ref(false)
const formVisible = ref(false)
const printVisible = ref(false)
const packingListVisible = ref(false)
const invoiceVisible = ref(false)
const isEdit = ref(false)
const currentOrder = ref<SalesOrder | undefined>(undefined)
const dateRange = ref<[any, any] | undefined>(undefined)

// 展开订单数据，每个商品一行
const expandedOrders = computed(() => {
  const result: any[] = []
  let rowIndex = 0
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
        tax_included_price: 0,
        unit: '-',
        amount: 0,
        tax_rate: 0,
        tax_excluded_price: 0,
        tax_excluded_amount: 0,
        tax_amount: 0,
        outbound_quantity: 0,
        delivery_date: '',
        invoice_date: '',
        invoice_number: '',
        invoice_received: '',
        settlement_date: '',
        settlement_amount: 0,
        unsettled_amount: 0,
        settlement_status: '未结算',
        remarks: '',
        item_status: order.status,
        purchase_status: 1,
        _isFirstRow: true,
        _rowCount: 1,
        _orderIndex: orderIndex,
        _rowIndex: rowIndex++,
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
          tax_included_price: item.tax_included_price || 0,
          unit: item.unit || '-',
          amount: item.tax_included_amount || 0,
          tax_rate: item.tax_rate || 0,
          tax_excluded_price: item.tax_excluded_price || 0,
          tax_excluded_amount: item.tax_excluded_amount || 0,
          tax_amount: item.tax_amount || 0,
          outbound_quantity: item.outbound_quantity || 0,
          delivery_date: item.delivery_date || '',
          invoice_date: item.invoice_date || '',
          invoice_number: item.invoice_number || '',
          invoice_received: item.invoice_received || '',
          settlement_date: item.settlement_date || '',
          settlement_amount: item.settlement_amount || 0,
          unsettled_amount: item.unsettled_amount || 0,
          settlement_status: item.settlement_status || '未结算',
          remarks: item.remarks || '',
          item_status: item.status || 1,
          purchase_status: item.purchase_status || 1,
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

const searchParams = reactive<SalesOrderQueryParams>({
  page: 1,
  pageSize: 100,
  orderNumber: '',
  customerName: '',
  customerCode: '',
  contractNumber: '',
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
])
// 采购状态筛选选项
const purchaseStatusFilters = computed(() => [
  { text: t.value.salesOrder.notPurchased, value: '1' },
  { text: t.value.salesOrder.partiallyPurchased, value: '2' },
  { text: t.value.salesOrder.purchased, value: '3' },
  { text: t.value.salesOrder.noNeedToPurchase, value: '4' },
])

// 使用 ref 使列配置可通过 ColumnConfig 组件更新
const allColumns = ref([
  {
    title: t.value.salesOrder.sequence,
    key: 'index',
    width: 60,
    align: 'center',
    fixed: 'left',
    customRender: ({ record }: { record: any }) => {
      return (pagination.current - 1) * pagination.pageSize + record._rowIndex + 1
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
    onFilter: (value: string, record: any) => String(record.product_code) === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.productName,
    dataIndex: 'product_name',
    key: 'product_name',
    width: 150,
    filters: productNameFilters.value,
    onFilter: (value: string, record: any) => String(record.product_name) === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.model,
    dataIndex: 'model',
    key: 'model',
    width: 120,
    filters: modelFilters.value,
    onFilter: (value: string, record: any) => String(record.model) === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.description,
    dataIndex: 'description',
    key: 'description',
    width: 150,
    filters: descriptionFilters.value,
    onFilter: (value: string, record: any) => String(record.description) === value,
    filterMultiple: true,
  },
  {
    title: t.value.salesOrder.quantity,
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
    align: 'right',
    sorter: (a: any, b: any) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0),
  },
  {
    title: '含税单价',
    dataIndex: 'tax_included_price',
    key: 'tax_included_price',
    width: 100,
    align: 'right',
    sorter: (a: any, b: any) => (a.tax_included_price || 0) - (b.tax_included_price || 0),
  },
  {
    title: '未税单价',
    dataIndex: 'tax_excluded_price',
    key: 'tax_excluded_price',
    width: 110,
    align: 'right',
    customRender: ({ text }: { text: number }) => formatMoney(text),
    sorter: (a: any, b: any) => (a.tax_excluded_price || 0) - (b.tax_excluded_price || 0),
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
    sorter: (a: any, b: any) => (a.amount || 0) - (b.amount || 0),
  },
  {
    title: '不含税金额',
    dataIndex: 'tax_excluded_amount',
    key: 'tax_excluded_amount',
    width: 110,
    align: 'right',
    customRender: ({ text }: { text: number }) => formatMoney(text),
    sorter: (a: any, b: any) => (a.tax_excluded_amount || 0) - (b.tax_excluded_amount || 0),
  },
  {
    title: '税额',
    dataIndex: 'tax_amount',
    key: 'tax_amount',
    width: 100,
    align: 'right',
    customRender: ({ text }: { text: number }) => formatMoney(text),
    sorter: (a: any, b: any) => (a.tax_amount || 0) - (b.tax_amount || 0),
  },
  {
    title: '税率(%)',
    dataIndex: 'tax_rate',
    key: 'tax_rate',
    width: 80,
    align: 'right',
    sorter: (a: any, b: any) => (a.tax_rate || 0) - (b.tax_rate || 0),
  },
  {
    title: '出库数量',
    dataIndex: 'outbound_quantity',
    key: 'outbound_quantity',
    width: 80,
    align: 'right',
    sorter: (a: any, b: any) =>
      (Number(a.outbound_quantity) || 0) - (Number(b.outbound_quantity) || 0),
  },
  {
    title: t.value.salesOrder.paymentMethod.replace('：', '').replace(':', ''),
    dataIndex: 'payment_method',
    key: 'payment_method',
    width: 80,
    align: 'center',
    filters: paymentMethodFilters.value,
    onFilter: (value: string, record: any) => String(record.payment_method) === value,
    filterMultiple: true,
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
    sorter: (a: any, b: any) => (a.entry_date || '').localeCompare(b.entry_date || ''),
  },
  {
    title: t.value.salesOrder.currency.replace('：', ''),
    dataIndex: 'currency',
    key: 'currency',
    width: 80,
    align: 'center',
    filters: currencyFilters.value,
    onFilter: (value: string, record: any) => String(record.currency) === value,
    filterMultiple: true,
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
  },
  {
    title: '交货日期',
    dataIndex: 'delivery_date',
    key: 'delivery_date',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
    sorter: (a: any, b: any) => (a.delivery_date || '').localeCompare(b.delivery_date || ''),
  },
  {
    title: '开票日期',
    dataIndex: 'invoice_date',
    key: 'invoice_date',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
    sorter: (a: any, b: any) => (a.invoice_date || '').localeCompare(b.invoice_date || ''),
  },
  {
    title: '发票号码',
    dataIndex: 'invoice_number',
    key: 'invoice_number',
    width: 120,
  },
  {
    title: '收到发票',
    dataIndex: 'invoice_received',
    key: 'invoice_received',
    width: 90,
    align: 'center',
  },
  {
    title: '结算日期',
    dataIndex: 'settlement_date',
    key: 'settlement_date',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
    sorter: (a: any, b: any) => (a.settlement_date || '').localeCompare(b.settlement_date || ''),
  },
  {
    title: '结算金额',
    dataIndex: 'settlement_amount',
    key: 'settlement_amount',
    width: 110,
    align: 'right',
    customRender: ({ text }: { text: number }) => formatMoney(text),
    sorter: (a: any, b: any) => (a.settlement_amount || 0) - (b.settlement_amount || 0),
  },
  {
    title: '未结算金额',
    dataIndex: 'unsettled_amount',
    key: 'unsettled_amount',
    width: 110,
    align: 'right',
    customRender: ({ text }: { text: number }) => formatMoney(text),
    sorter: (a: any, b: any) => (a.unsettled_amount || 0) - (b.unsettled_amount || 0),
  },
  {
    title: '结算状态',
    dataIndex: 'settlement_status',
    key: 'settlement_status',
    width: 100,
    align: 'center',
  },
  {
    title: '备注',
    dataIndex: 'remarks',
    key: 'remarks',
    width: 150,
  },
  {
    title: t.value.common.action,
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
  [
    productCodeFilters,
    productNameFilters,
    modelFilters,
    descriptionFilters,
    paymentMethodFilters,
    currencyFilters,
    salesPersonFilters,
    statusFilters,
    purchaseStatusFilters,
  ],
  () => {
    if (isUpdatingFromConfig) return
    const cols = allColumns.value
    const filterMap: Record<string, any> = {
      product_code: productCodeFilters.value,
      product_name: productNameFilters.value,
      model: modelFilters.value,
      description: descriptionFilters.value,
      payment_method: paymentMethodFilters.value,
      currency: currencyFilters.value,
      sales_person: salesPersonFilters.value,
      status: statusFilters.value,
      purchase_status: purchaseStatusFilters.value,
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
    const params = {
      page: searchParams.page,
      pageSize: searchParams.pageSize,
    }

    if (searchParams.orderNumber) params.orderNumber = searchParams.orderNumber
    if (searchParams.customerName) params.customerName = searchParams.customerName
    if (searchParams.customerCode) params.customerCode = searchParams.customerCode
    if (searchParams.contractNumber) params.contractNumber = searchParams.contractNumber
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
  searchParams.contractNumber = ''
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

const handlePrint = (order: SalesOrder) => {
  console.log('order1111', order)
  currentOrder.value = order
  printVisible.value = true
}

const handlePrintSelect = (key: string, order: SalesOrder) => {
  currentOrder.value = order
  if (key === 'contract') {
    printVisible.value = true
  } else if (key === 'packingList') {
    packingListVisible.value = true
  } else if (key === 'invoice') {
    invoiceVisible.value = true
  }
}

const handleSuccess = () => {
  loadOrders()
}

const handlePackingListSuccess = () => {
  packingListVisible.value = false
  message.success('装箱单创建成功')
}

const handleInvoiceSuccess = () => {
  invoiceVisible.value = false
  message.success('发票创建成功')
}

const formatMoney = (amount: number | string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${(numAmount || 0).toFixed(4)}`
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
  }
  return colorMap[status] || 'default'
}

const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: t.value.salesOrder.notShipped,
    2: t.value.salesOrder.fullyShipped,
    3: t.value.salesOrder.partiallyShipped,
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

// 导出Excel
const statusTextMap: Record<number, string> = {
  1: '未出库',
  2: '已全部出库',
  3: '已部分出库',
}
const purchaseStatusTextMap: Record<number, string> = {
  1: '未采购',
  2: '已部分采购',
  3: '已采购',
  4: '无需采购',
}

const settlementStatusTextMap: Record<string, string> = {
  未结算: '未结算',
  部分结算: '部分结算',
  全部结算: '全部结算',
}

const exportColumns: ExportColumn[] = [
  { key: 'order_number', title: '默认单据编号' },
  { key: 'contract_number', title: '合同编号' },
  { key: 'customer_name', title: '客户名称' },
  { key: 'customer_code', title: '客户代码' },
  { key: 'product_code', title: '产品代码' },
  { key: 'product_name', title: '产品名称' },
  { key: 'model', title: '产品型号' },
  { key: 'description', title: '产品描述' },
  { key: 'quantity', title: '数量' },
  { key: 'tax_included_price', title: '含税单价', formatter: v => formatMoney(v) },
  { key: 'tax_excluded_price', title: '未税单价', formatter: v => formatMoney(v) },
  { key: 'unit', title: '单位' },
  { key: 'amount', title: '金额', formatter: v => formatMoney(v) },
  { key: 'tax_excluded_amount', title: '不含税金额', formatter: v => formatMoney(v) },
  { key: 'tax_amount', title: '税额', formatter: v => formatMoney(v) },
  { key: 'tax_rate', title: '税率(%)' },
  { key: 'outbound_quantity', title: '出库数量' },
  { key: 'payment_method', title: '结算方式' },
  { key: 'item_status', title: '状态', formatter: v => statusTextMap[v] || '未知' },
  { key: 'purchase_status', title: '采购状态', formatter: v => purchaseStatusTextMap[v] || '未知' },
  { key: 'entry_date', title: '录入日期', formatter: v => formatDate(v) },
  { key: 'currency', title: '币种' },
  { key: 'sales_person', title: '销售员' },
  { key: 'delivery_date', title: '交货日期', formatter: v => formatDate(v) },
  { key: 'invoice_date', title: '开票日期', formatter: v => formatDate(v) },
  { key: 'invoice_number', title: '发票号码' },
  { key: 'invoice_received', title: '收到发票' },
  { key: 'settlement_date', title: '结算日期', formatter: v => formatDate(v) },
  { key: 'settlement_amount', title: '结算金额', formatter: v => formatMoney(v) },
  { key: 'unsettled_amount', title: '未结算金额', formatter: v => formatMoney(v) },
  {
    key: 'settlement_status',
    title: '结算状态',
    formatter: v => settlementStatusTextMap[v] || v || '未结算',
  },
  { key: 'remarks', title: '备注' },
]

const handleExport = async () => {
  try {
    const params: any = { page: 1, pageSize: 99999 }
    if (searchParams.orderNumber) params.orderNumber = searchParams.orderNumber
    if (searchParams.customerName) params.customerName = searchParams.customerName
    if (searchParams.customerCode) params.customerCode = searchParams.customerCode
    if (searchParams.contractNumber) params.contractNumber = searchParams.contractNumber
    if (searchParams.productCode) params.productCode = searchParams.productCode
    if (searchParams.productName) params.productName = searchParams.productName
    if (searchParams.productModel) params.productModel = searchParams.productModel
    if (searchParams.startDate) params.salesDate = searchParams.startDate

    const response = await salesOrdersApi.getAll(params)
    const allOrders: SalesOrder[] = response.data || []
    const rows: any[] = []
    allOrders.forEach(order => {
      const items = parseSalesItems(order.sales_items)
      if (items.length === 0) {
        rows.push({
          ...order,
          product_code: '-',
          product_name: '-',
          model: '-',
          description: '-',
          quantity: '-',
          unit: '-',
          amount: 0,
          tax_included_price: 0,
          tax_excluded_price: 0,
          tax_excluded_amount: 0,
          tax_amount: 0,
          tax_rate: 0,
          outbound_quantity: 0,
          item_status: order.status,
          purchase_status: 1,
          delivery_date: '',
          invoice_date: '',
          invoice_number: '',
          invoice_received: '',
          settlement_date: '',
          settlement_amount: 0,
          unsettled_amount: 0,
          settlement_status: '未结算',
          remarks: '',
        })
      } else {
        items.forEach((item: any) => {
          rows.push({
            ...order,
            product_code: item.product_code || '-',
            product_name: item.product_name || '-',
            model: item.model || '-',
            description: item.description || '-',
            quantity: item.quantity || '-',
            tax_included_price: item.tax_included_price || 0,
            tax_excluded_price: item.tax_excluded_price || 0,
            unit: item.unit || '-',
            amount: item.tax_included_amount || 0,
            tax_excluded_amount: item.tax_excluded_amount || 0,
            tax_amount: item.tax_amount || 0,
            tax_rate: item.tax_rate || 0,
            outbound_quantity: item.outbound_quantity || 0,
            item_status: item.status || 1,
            purchase_status: item.purchase_status || 1,
            delivery_date: item.delivery_date || '',
            invoice_date: item.invoice_date || '',
            invoice_number: item.invoice_number || '',
            invoice_received: item.invoice_received || '',
            settlement_date: item.settlement_date || '',
            settlement_amount: item.settlement_amount || 0,
            unsettled_amount: item.unsettled_amount || 0,
            settlement_status: item.settlement_status || '未结算',
            remarks: item.remarks || '',
          })
        })
      }
    })
    // 只导出显示的列
    const visibleKeySet = new Set(
      visibleColumns.value.flatMap((col: any) => [col.dataIndex, col.key]).filter(Boolean)
    )
    const filteredExportColumns = exportColumns.filter(col => visibleKeySet.has(col.key))
    exportToExcel({ filename: '销售订单', columns: filteredExportColumns, data: rows })
  } catch {
    message.error('导出失败')
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

    :deep(.ant-form-item) {
      margin-bottom: 12px;

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
