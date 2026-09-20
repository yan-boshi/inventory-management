<template>
  <div class="inbound-return-orders-container">
    <div class="header">
      <h1>入库退货单管理</h1>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="退货单号">
            <a-input
              v-model:value="searchParams.orderNumber"
              placeholder="请输入退货单号"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="采购合同编号">
            <a-input
              v-model:value="searchParams.contractNumber"
              placeholder="请输入合同编号"
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

          <a-form-item label="退货日期">
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
              <ColumnConfig :columns="allColumns" @update:columns="handleColumnConfigUpdate" cacheKey="inboundReturnOrders" />
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        v-scroll-topbar
        :columns="visibleColumns"
        :data-source="expandedOrders"
        :loading="loading"
        :pagination="pagination"
        rowKey="row_key"
        @change="handleTableChange"
        :scroll="{ x: 1800, y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <span class="order-link">{{ record.order_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'source_order_number'">
            <span>{{ record.source_order_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'contract_number'">
            <span>{{ record.contract_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'supplier_name'">
            <span>{{ record.supplier_name || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'total_amount'">
            <span style="color: #f5222d; font-weight: 500">
              {{ record.amount }}
            </span>
          </template>

          <template v-else-if="column.key === 'return_time'">
            <span>{{ formatDate(record.return_time) }}</span>
          </template>

          <template v-else-if="column.key === 'entry_date'">
            <span>{{ formatDate(record.entry_date) }}</span>
          </template>

          <template v-else-if="column.key === 'return_person'">
            <span>{{ record.return_person || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'reason'">
            <span>{{ record.reason || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'remarks'">
            <span>{{ record.remarks || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleEdit(record)"> 编辑 </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)"> 删除 </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <InboundReturnForm
      v-model:visible="formVisible"
      :editData="currentOrder"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { inboundReturnsApi } from '@/api/inboundReturns'
import type { InboundReturnOrder, InboundReturnQueryParams } from '@/types'
import InboundReturnForm from '@/components/InboundReturnForm.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import { formatDate } from '@/utils/date'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'
import dayjs from 'dayjs'

const orders = ref<InboundReturnOrder[]>([])
const loading = ref(false)
const formVisible = ref(false)
const currentOrder = ref<InboundReturnOrder | undefined>(undefined)
const dateRange = ref<[any, any] | undefined>(undefined)

// 展开订单数据，每个商品一行
const expandedOrders = computed(() => {
  const result: any[] = []
  let rowIndex = 0
  orders.value.forEach((order, orderIndex) => {
    const items = getReturnItems(order)
    if (items.length === 0) {
      result.push({
        ...order,
        row_key: order.inbound_return_id,
        product_code: '-',
        product_name: '-',
        specifications: '-',
        quantity: '-',
        unit: '-',
        amount: 0,
        _isFirstRow: true,
        _rowCount: 1,
        _orderIndex: orderIndex,
        _rowIndex: rowIndex++,
      })
    } else {
      items.forEach((item: any, index: number) => {
        const quantity = parseFloat(item.quantity) || 0
        const unitPrice = parseFloat(item.unit_price) || 0
        result.push({
          ...order,
          row_key: `${order.inbound_return_id}_${index}`,
          product_code: item.product_code || '-',
          product_name: item.product_name || '-',
          specifications: item.specifications || '-',
          quantity: item.quantity || '-',
          unit: item.unit || '-',
          amount: quantity * unitPrice,
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

const searchParams = reactive<InboundReturnQueryParams>({
  page: 1,
  pageSize: 100,
  orderNumber: '',
  contractNumber: '',
  supplierName: '',
  startDate: '',
  endDate: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 100,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
  pageSizeOptions: ['10', '20', '50', '100'],
})

// 解析退货商品
const getReturnItems = (order: InboundReturnOrder) => {
  try {
    const items = JSON.parse(order.return_items || '[]')
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

// 动态生成筛选选项的辅助函数
const generateFilters = (dataKey: string) => {
  return computed(() => {
    const values = [...new Set(expandedOrders.value.map((item: any) => item[dataKey]).filter(Boolean))]
    return values.map(value => ({ text: String(value), value: String(value) }))
  })
}

// 供应商名称筛选选项
const supplierNameFilters = generateFilters('supplier_name')
// 产品代码筛选选项
const productCodeFilters = generateFilters('product_code')
// 产品名称筛选选项
const productNameFilters = generateFilters('product_name')
// 规格型号筛选选项
const specificationsFilters = generateFilters('specifications')
// 退货人筛选选项
const returnPersonFilters = generateFilters('return_person')

// 列配置
const defaultColumns = [
  { title: '退货单号', key: 'order_number', dataIndex: 'order_number', width: '12%', visible: true },
  { title: '原入库单号', key: 'source_order_number', dataIndex: 'source_order_number', width: '10%', visible: true },
  { title: '采购合同编号', key: 'contract_number', dataIndex: 'contract_number', width: '10%', visible: true },
  { title: '供应商名称', key: 'supplier_name', dataIndex: 'supplier_name', width: '10%', visible: true, filters: supplierNameFilters.value, onFilter: (value: string, record: any) => String(record.supplier_name) === value, filterMultiple: true },
  { title: '产品代码', key: 'product_code', dataIndex: 'product_code', width: '8%', visible: true, filters: productCodeFilters.value, onFilter: (value: string, record: any) => String(record.product_code) === value, filterMultiple: true },
  { title: '产品名称', key: 'product_name', dataIndex: 'product_name', width: '10%', visible: true, filters: productNameFilters.value, onFilter: (value: string, record: any) => String(record.product_name) === value, filterMultiple: true },
  { title: '规格型号', key: 'specifications', dataIndex: 'specifications', width: '8%', visible: true, filters: specificationsFilters.value, onFilter: (value: string, record: any) => String(record.specifications) === value, filterMultiple: true },
  { title: '退货数量', key: 'quantity', dataIndex: 'quantity', width: '6%', align: 'right', visible: true },
  { title: '单位', key: 'unit', dataIndex: 'unit', width: '5%', visible: true },
  { title: '金额', key: 'total_amount', dataIndex: 'total_amount', width: '8%', align: 'right', visible: true },
  { title: '退货日期', key: 'return_time', dataIndex: 'return_time', width: '8%', visible: true },
  { title: '录入日期', key: 'entry_date', dataIndex: 'entry_date', width: '8%', visible: true },
  { title: '退货人', key: 'return_person', dataIndex: 'return_person', width: '6%', visible: true, filters: returnPersonFilters.value, onFilter: (value: string, record: any) => String(record.return_person) === value, filterMultiple: true },
  { title: '退货原因', key: 'reason', dataIndex: 'reason', width: '8%', visible: true },
  { title: '备注', key: 'remarks', dataIndex: 'remarks', width: '8%', visible: true },
  { title: '操作', key: 'actions', width: '10%', fixed: 'right', visible: true },
]

const allColumns = ref(defaultColumns)

// 当动态筛选数据变化时，更新 allColumns 中对应列的 filters
watch(
  [supplierNameFilters, productCodeFilters, productNameFilters, specificationsFilters, returnPersonFilters],
  () => {
    const cols = allColumns.value
    const filterMap: Record<string, any> = {
      supplier_name: supplierNameFilters.value,
      product_code: productCodeFilters.value,
      product_name: productNameFilters.value,
      specifications: specificationsFilters.value,
      return_person: returnPersonFilters.value,
    }
    cols.forEach((col: any) => {
      if (col.dataIndex && filterMap[col.dataIndex]) {
        col.filters = filterMap[col.dataIndex]
      }
    })
  }
)

const visibleColumns = computed(() => allColumns.value.filter(col => col.visible))

const handleColumnConfigUpdate = (newColumns: any[]) => {
  allColumns.value = newColumns
}

// 加载数据
const loadOrders = async () => {
  loading.value = true
  try {
    const params: InboundReturnQueryParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }

    if (searchParams.orderNumber) params.orderNumber = searchParams.orderNumber
    if (searchParams.contractNumber) params.contractNumber = searchParams.contractNumber
    if (searchParams.supplierName) params.supplierName = searchParams.supplierName
    if (searchParams.startDate) params.startDate = searchParams.startDate
    if (searchParams.endDate) params.endDate = searchParams.endDate

    const response = await inboundReturnsApi.getAll(params)
    orders.value = response.data || []
    pagination.total = response.pagination?.total || 0
  } catch (error) {
    message.error('加载入库退货单列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  loadOrders()
}

const handleReset = () => {
  searchParams.orderNumber = ''
  searchParams.contractNumber = ''
  searchParams.supplierName = ''
  searchParams.startDate = ''
  searchParams.endDate = ''
  dateRange.value = undefined
  pagination.current = 1
  loadOrders()
}

const handleDateRangeChange = (dates: any) => {
  if (dates && dates.length === 2) {
    searchParams.startDate = dayjs(dates[0]).format('YYYY-MM-DD')
    searchParams.endDate = dayjs(dates[1]).format('YYYY-MM-DD')
  } else {
    searchParams.startDate = ''
    searchParams.endDate = ''
  }
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadOrders()
}

const handleEdit = (order: InboundReturnOrder) => {
  currentOrder.value = order
  formVisible.value = true
}

const handleDelete = (order: InboundReturnOrder) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除入库退货单 ${order.order_number} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await inboundReturnsApi.delete(order.inbound_return_id)
        message.success('删除成功')
        loadOrders()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleSuccess = () => {
  formVisible.value = false
  loadOrders()
}

// 导出Excel
const handleExport = () => {
  const exportColumns: ExportColumn[] = [
    { title: '退货单号', dataIndex: 'order_number' },
    { title: '原入库单号', dataIndex: 'source_order_number' },
    { title: '采购合同编号', dataIndex: 'contract_number' },
    { title: '供应商名称', dataIndex: 'supplier_name' },
    { title: '退货日期', dataIndex: 'return_time' },
    { title: '录入日期', dataIndex: 'entry_date' },
    { title: '币种', dataIndex: 'currency' },
    { title: '总金额', dataIndex: 'total_amount' },
    { title: '退货人', dataIndex: 'return_person' },
    { title: '退货原因', dataIndex: 'reason' },
    { title: '备注', dataIndex: 'remarks' },
  ]

  const exportData = orders.value.map(order => ({
    ...order,
    return_time: order.return_time ? formatDate(order.return_time) : '-',
    entry_date: order.entry_date ? formatDate(order.entry_date) : '-',
    total_amount: order.total_amount || 0,
  }))

  exportToExcel(exportColumns, exportData, '入库退货单列表')
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.inbound-return-orders-container {
  padding: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.search-bar {
  margin-bottom: 16px;
}

.order-link {
  color: #1890ff;
  cursor: pointer;
}

.order-link:hover {
  text-decoration: underline;
}
</style>
