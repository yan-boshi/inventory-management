<template>
  <div class="purchase-orders-container">
    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="订单号">
            <a-input
              v-model:value="searchParams.orderNumber"
              placeholder="请输入订单号"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="供应商名称">
            <a-input
              v-model:value="searchParams.supplierName"
              placeholder="请输入供应商名称"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="供应商代码">
            <a-input
              v-model:value="searchParams.supplierCode"
              placeholder="请输入供应商代码"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="合同编号">
            <a-input
              v-model:value="searchParams.contractNumber"
              placeholder="请输入合同编号"
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

          <a-form-item label="采购日期">
            <a-range-picker v-model:value="dateRange" @change="handleDateRangeChange" />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch"> <SearchOutlined /> 查询 </a-button>
              <a-button @click="handleReset"> <ReloadOutlined /> 重置 </a-button>
              <a-button @click="handleExport"> <DownloadOutlined /> 导出Excel </a-button>
              <ColumnConfig
                :columns="allColumns"
                @update:columns="handleColumnConfigUpdate"
                cacheKey="purchaseOrders"
              />
              <a-button type="primary" @click="handleAdd" style="margin-left: 16px;">
                <template #icon><PlusOutlined /></template>
                新增采购订单
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
        :scroll="{ x: 3600, y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <span class="order-link">{{ record.order_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'contract_number'">
            <span>{{ record.contract_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'supplier_name'">
            <span>{{ record.supplier_name || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'supplier_code'">
            <span>{{ record.supplier_code || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'total_amount'">
            <span style="color: #f5222d; font-weight: 500">
              {{ record.amount }}
            </span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.item_status)">
              {{ getStatusText(record.item_status) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'entry_date'">
            <span>{{ formatDate(record.entry_date) }}</span>
          </template>

          <template v-else-if="column.key === 'purchase_person'">
            <span>{{ record.purchase_person || '-' }}</span>
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
              <a-button type="link" size="small" @click="handleEdit(record)"> 编辑 </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
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

    <PurchaseOrderForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :purchaseOrderData="currentOrder"
      @success="handleSuccess"
    />

    <PurchaseOrderDetail v-model:visible="detailVisible" :order="currentOrder" />

    <PurchaseOrderPrint v-model:visible="printVisible" :order="currentOrder" />
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
} from '@ant-design/icons-vue'
import { purchaseOrdersApi } from '@/api/purchaseOrders'
import { suppliersApi } from '@/api/suppliers'
import type { PurchaseOrder, PurchaseOrderQueryParams } from '@/types'
import PurchaseOrderForm from '@/components/PurchaseOrderForm.vue'
import PurchaseOrderDetail from '@/components/PurchaseOrderDetail.vue'
import PurchaseOrderPrint from '@/components/PurchaseOrderPrint.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import { formatDate } from '@/utils/date'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'
import dayjs from 'dayjs'

const orders = ref<PurchaseOrder[]>([])
const loading = ref(false)
const formVisible = ref(false)
const detailVisible = ref(false)
const printVisible = ref(false)
const isEdit = ref(false)
const currentOrder = ref<PurchaseOrder | undefined>(undefined)
const dateRange = ref<[any, any] | undefined>(undefined)

// 展开订单数据，每个商品一行
const expandedOrders = computed(() => {
  const result: any[] = []
  let rowIndex = 0
  orders.value.forEach((order, orderIndex) => {
    const items = getParsedPurchaseItems(order)
    if (items.length === 0) {
      result.push({
        ...order,
        row_key: order.purchase_order_id,
        product_code: '-',
        product_name: '-',
        model: '-',
        description: '-',
        quantity: '-',
        tax_included_price: 0,
        unit: '-',
        amount: 0,
        tax_rate: 0,
        tax_excluded_amount: 0,
        tax_excluded_price: 0,
        business_category: '',
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
        _isFirstRow: true,
        _rowCount: 1,
        _orderIndex: orderIndex,
        _rowIndex: rowIndex++,
      })
    } else {
      items.forEach((item: any, index: number) => {
        result.push({
          ...order,
          row_key: `${order.purchase_order_id}_${index}`,
          product_code: item.product_code || '-',
          product_name: item.product_name || '-',
          model: item.model || '-',
          description: item.description || '-',
          quantity: item.quantity || '-',
          tax_included_price: item.tax_included_price || 0,
          unit: item.unit || '-',
          amount: item.tax_included_amount || 0,
          tax_rate: item.tax_rate || 0,
          tax_excluded_amount: item.tax_excluded_amount || 0,
          tax_excluded_price: item.tax_excluded_price || 0,
          business_category: item.business_category || '',
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

const searchParams = reactive<PurchaseOrderQueryParams>({
  page: 1,
  pageSize: 100,
  orderNumber: '',
  supplierName: '',
  supplierCode: '',
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
// 采购人筛选选项
const purchasePersonFilters = generateFilters('purchase_person')
// 状态筛选选项
const statusFilters = computed(() => [
  { text: '未入库', value: '1' },
  { text: '已全部入库', value: '2' },
  { text: '已部分入库', value: '3' },
])

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
    title: '供应商名称',
    dataIndex: 'supplier_name',
    key: 'supplier_name',
    width: 250,
  },
  {
    title: '供应商代码',
    dataIndex: 'supplier_code',
    key: 'supplier_code',
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
    sorter: (a: any, b: any) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0),
  },
  {
    title: '单位',
    dataIndex: 'unit',
    key: 'unit',
    width: 60,
    align: 'center',
  },
  {
    title: '含税单价',
    dataIndex: 'tax_included_price',
    key: 'tax_included_price',
    width: 100,
    align: 'right',
    customRender: ({ text }: { text: number }) => formatMoney(text),
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
    title: '含税金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    align: 'right',
    customRender: ({ text }: { text: number }) => formatMoney(text),
    sorter: (a: any, b: any) => (a.amount || 0) - (b.amount || 0),
  },
  {
    title: '未税金额',
    dataIndex: 'tax_excluded_amount',
    key: 'tax_excluded_amount',
    width: 100,
    align: 'right',
    customRender: ({ text }: { text: number }) => formatMoney(text),
    sorter: (a: any, b: any) => (a.tax_excluded_amount || 0) - (b.tax_excluded_amount || 0),
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
    title: '业务分类',
    dataIndex: 'business_category',
    key: 'business_category',
    width: 100,
  },
  {
    title: '币种',
    dataIndex: 'currency',
    key: 'currency',
    width: 80,
    align: 'center',
  },
  {
    title: '状态',
    dataIndex: 'item_status',
    key: 'status',
    width: 100,
    align: 'center',
    filters: statusFilters.value,
    onFilter: (value: string, record: any) => String(record.item_status) === value,
    filterMultiple: true,
  },
  {
    title: '录入日期',
    dataIndex: 'entry_date',
    key: 'entry_date',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
    sorter: (a: any, b: any) => (a.entry_date || '').localeCompare(b.entry_date || ''),
  },
  {
    title: '采购人',
    dataIndex: 'purchase_person',
    key: 'purchase_person',
    width: 80,
    align: 'center',
    filters: purchasePersonFilters.value,
    onFilter: (value: string, record: any) => String(record.purchase_person) === value,
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
    title: '发票日期',
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
    title: '发票已收',
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
    title: '操作',
    key: 'actions',
    width: 220,
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
    purchasePersonFilters,
    statusFilters,
  ],
  () => {
    if (isUpdatingFromConfig) return
    const cols = allColumns.value
    const filterMap: Record<string, any> = {
      product_code: productCodeFilters.value,
      product_name: productNameFilters.value,
      model: modelFilters.value,
      description: descriptionFilters.value,
      purchase_person: purchasePersonFilters.value,
      status: statusFilters.value,
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
    const response = await purchaseOrdersApi.getAll(searchParams)
    orders.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载采购订单失败:', error)
    message.error('加载采购订单失败')
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
  searchParams.supplierName = ''
  searchParams.supplierCode = ''
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

const handleEdit = (order: PurchaseOrder) => {
  isEdit.value = true
  currentOrder.value = order
  formVisible.value = true
}

const handleViewDetail = (order: PurchaseOrder) => {
  currentOrder.value = order
  detailVisible.value = true
}

const handleDelete = (order: PurchaseOrder) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除采购订单 ${order.order_number} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await purchaseOrdersApi.delete(order.purchase_order_id)
        message.success('删除成功')
        loadOrders()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleStatusChange = (order: PurchaseOrder, status: string) => {
  Modal.confirm({
    title: '确认更新状态',
    content: `确定要将采购订单 ${order.order_number} 的状态更新为 ${getStatusText(
      parseInt(status)
    )}吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await purchaseOrdersApi.updateStatus(
          order.purchase_order_id,
          parseInt(status) as 1 | 2 | 3 | 4
        )
        message.success('状态更新成功')
        loadOrders()
      } catch (error) {
        message.error('状态更新失败')
      }
    },
  })
}

const getParsedPurchaseItems = (order: PurchaseOrder) => {
  try {
    return JSON.parse(order.purchase_items || '[]')
  } catch {
    return []
  }
}

const getTotalAmount = (order: PurchaseOrder) => {
  const items = getParsedPurchaseItems(order)
  return items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
}

const handleSuccess = () => {
  loadOrders()
}

const handlePrint = (order: PurchaseOrder) => {
  currentOrder.value = order
  printVisible.value = true
}

const formatMoney = (amount: number | string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${(numAmount || 0).toFixed(4)}`
}

const getStatusColor = (status: number) => {
  const colorMap: Record<number, string> = {
    1: 'blue', // 未入库
    2: 'green', // 已全部入库
    3: 'orange', // 已部分入库
  }
  return colorMap[status] || 'default'
}

const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: '未入库',
    2: '已全部入库',
    3: '已部分入库',
  }
  return textMap[status] || '未知'
}

// 导出Excel
const settlementStatusTextMap: Record<string, string> = {
  未结算: '未结算',
  部分结算: '部分结算',
  全部结算: '全部结算',
}

const exportColumns: ExportColumn[] = [
  { key: 'order_number', title: '默认单据编号' },
  { key: 'contract_number', title: '合同编号' },
  { key: 'supplier_name', title: '供应商名称' },
  { key: 'supplier_code', title: '供应商代码' },
  { key: 'product_code', title: '产品代码' },
  { key: 'product_name', title: '产品名称' },
  { key: 'model', title: '产品型号' },
  { key: 'description', title: '产品描述' },
  { key: 'quantity', title: '数量' },
  { key: 'tax_included_price', title: '含税单价', formatter: v => formatMoney(v) },
  { key: 'tax_excluded_price', title: '未税单价', formatter: v => formatMoney(v) },
  { key: 'unit', title: '单位' },
  { key: 'amount', title: '含税金额', formatter: v => formatMoney(v) },
  { key: 'tax_excluded_amount', title: '未税金额', formatter: v => formatMoney(v) },
  { key: 'tax_rate', title: '税率(%)' },
  { key: 'business_category', title: '业务分类' },
  { key: 'currency', title: '币种' },
  { key: 'item_status', title: '状态', formatter: v => getStatusText(v) },
  { key: 'entry_date', title: '录入日期', formatter: v => formatDate(v) },
  { key: 'purchase_person', title: '采购人' },
  { key: 'delivery_date', title: '交货日期', formatter: v => formatDate(v) },
  { key: 'invoice_date', title: '发票日期', formatter: v => formatDate(v) },
  { key: 'invoice_number', title: '发票号码' },
  { key: 'invoice_received', title: '发票已收' },
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
    const response = await purchaseOrdersApi.getAll({ ...searchParams, page: 1, pageSize: 99999 })
    const allOrders: PurchaseOrder[] = response.data || []
    const rows: any[] = []
    allOrders.forEach(order => {
      const items = getParsedPurchaseItems(order)
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
          tax_rate: 0,
          business_category: '',
          item_status: order.status,
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
            tax_rate: item.tax_rate || 0,
            business_category: item.business_category || '',
            item_status: item.status || 1,
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
    const visibleDataIndexSet = new Set(
      visibleColumns.value.map((col: any) => col.dataIndex || col.key).filter(Boolean)
    )
    const filteredExportColumns = exportColumns.filter(col => visibleDataIndexSet.has(col.key))
    exportToExcel({ filename: '采购订单', columns: filteredExportColumns, data: rows })
  } catch {
    message.error('导出失败')
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped lang="scss">
.purchase-orders-container {
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
