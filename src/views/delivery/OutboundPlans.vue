<template>
  <div class="outbound-plans-container">
    <div class="header">
      <h1>出库计划</h1>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="计划单编号">
            <a-input
              v-model:value="searchParams.planNumber"
              placeholder="请输入计划单编号"
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

          <a-form-item label="客户名称">
            <a-input
              v-model:value="searchParams.customerName"
              placeholder="请输入客户名称"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="状态">
            <a-select
              v-model:value="searchParams.status"
              placeholder="请选择状态"
              allow-clear
              style="width: 120px"
            >
              <a-select-option value="pending">待出库</a-select-option>
              <a-select-option value="completed">已完成</a-select-option>
              <a-select-option value="cancelled">已取消</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="录入日期">
            <a-range-picker
              v-model:value="dateRange"
              @change="handleDateRangeChange"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch"> <SearchOutlined /> 查询 </a-button>
              <a-button @click="handleReset"> <ReloadOutlined /> 重置 </a-button>
              <a-button @click="handleExport"> <DownloadOutlined /> 导出Excel </a-button>
              <ColumnConfig :columns="allColumns" @update:columns="handleColumnConfigUpdate" cacheKey="outboundPlans" />
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        v-scroll-topbar
        :columns="visibleColumns"
        :data-source="expandedPlans"
        :loading="loading"
        :pagination="false"
        rowKey="row_key"
        :scroll="{ x: 3000, y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'plan_number'">
            <span class="order-link">{{ record.plan_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'contract_number'">
            <span>{{ record.contract_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'customer_name'">
            <span>{{ record.customer_name || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'completed' ? 'green' : record.status === 'cancelled' ? 'red' : 'orange'">
              {{ statusTextMap[record.status] || '待出库' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'outbound_status'">
            <a-tag :color="record.outbound_status === 'completed' ? 'green' : record.outbound_status === 'partial' ? 'blue' : 'default'">
              {{ outboundStatusTextMap[record.outbound_status] || '待出库' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'entry_date'">
            <span>{{ formatDate(record.entry_date) }}</span>
          </template>

          <template v-else-if="column.key === 'delivery_date'">
            <span>{{ formatDate(record.delivery_date) }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleGenerateDeliveryOrder(record)">
                生成出库单
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
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

    <!-- 生成出库单表单 -->
    <DeliveryOrderForm
      v-model:open="deliveryOrderFormVisible"
      :isEdit="false"
      :deliveryOrderData="deliveryOrderPrefill"
      @success="handleDeliveryOrderSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { outboundPlansApi } from '@/api/outboundPlans'
import type { OutboundPlan, OutboundPlanQueryParams } from '@/types'
import DeliveryOrderForm from '@/components/DeliveryOrderForm.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import { formatDate } from '@/utils/date'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'

const plans = ref<OutboundPlan[]>([])
const loading = ref(false)
const deliveryOrderFormVisible = ref(false)
const deliveryOrderPrefill = ref<any>(undefined)
const dateRange = ref<[any, any] | undefined>(undefined)

// 展开计划数据，每个明细项一行
const expandedPlans = computed(() => {
  const result: any[] = []
  let rowIndex = 0
  plans.value.forEach((plan, planIndex) => {
    let items: any[] = []
    try {
      items = typeof plan.plan_items === 'string' ? JSON.parse(plan.plan_items) : plan.plan_items || []
    } catch {
      items = []
    }

    if (items.length === 0) {
      result.push({
        ...plan,
        row_key: plan.outbound_plan_id,
        product_code: '-',
        product_name: '-',
        model: '-',
        description: '-',
        quantity: '-',
        unit: '-',
        delivery_date: '',
        item_remarks: '',
        outbound_status: 'pending',
        _isFirstRow: true,
        _rowCount: 1,
        _planIndex: planIndex,
        _rowIndex: rowIndex++,
      })
    } else {
      items.forEach((item: any, index: number) => {
        result.push({
          ...plan,
          row_key: `${plan.outbound_plan_id}_${index}`,
          product_code: item.product_code || '-',
          product_name: item.product_name || '-',
          model: item.model || '-',
          description: item.description || '-',
          quantity: item.quantity || '-',
          unit: item.unit || '-',
          delivery_date: item.delivery_date || '',
          item_remarks: item.remarks || '',
          outbound_status: item.outbound_status || 'pending',
          _isFirstRow: index === 0,
          _rowCount: items.length,
          _planIndex: planIndex,
          _rowIndex: rowIndex++,
        })
      })
    }
  })
  return result
})

const searchParams = reactive<OutboundPlanQueryParams>({
  page: 1,
  pageSize: 100,
  planNumber: '',
  contractNumber: '',
  customerName: '',
  status: undefined,
  startDate: '',
  endDate: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 100,
  total: 0,
})

const statusTextMap: Record<string, string> = {
  pending: '待出库',
  completed: '已完成',
  cancelled: '已取消',
}

const outboundStatusTextMap: Record<string, string> = {
  pending: '待出库',
  partial: '部分出库',
  completed: '已完成',
}

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
    title: '计划单编号',
    dataIndex: 'plan_number',
    key: 'plan_number',
    width: 180,
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
    width: 200,
  },
  {
    title: '产品代码',
    dataIndex: 'product_code',
    key: 'product_code',
    width: 120,
  },
  {
    title: '产品名称',
    dataIndex: 'product_name',
    key: 'product_name',
    width: 150,
  },
  {
    title: '产品型号',
    dataIndex: 'model',
    key: 'model',
    width: 120,
  },
  {
    title: '产品描述',
    dataIndex: 'description',
    key: 'description',
    width: 150,
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
    title: '交货日期',
    dataIndex: 'delivery_date',
    key: 'delivery_date',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
    sorter: (a: any, b: any) => (a.delivery_date || '').localeCompare(b.delivery_date || ''),
  },
  {
    title: '出库状态',
    dataIndex: 'outbound_status',
    key: 'outbound_status',
    width: 100,
    align: 'center',
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
    dataIndex: 'status',
    key: 'status',
    width: 100,
    align: 'center',
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
    title: '销售员',
    dataIndex: 'sales_person',
    key: 'sales_person',
    width: 80,
    align: 'center',
  },
  {
    title: '备注',
    dataIndex: 'item_remarks',
    key: 'item_remarks',
    width: 150,
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
  },
])

let isUpdatingFromConfig = false

const handleColumnConfigUpdate = (newColumns: any[]) => {
  isUpdatingFromConfig = true
  allColumns.value = newColumns
  isUpdatingFromConfig = false
}

const visibleColumns = computed(() => {
  return allColumns.value.filter((col: any) => col.visible !== false)
})

const loadPlans = async () => {
  loading.value = true
  try {
    const params: any = {
      page: searchParams.page,
      pageSize: searchParams.pageSize,
    }
    if (searchParams.planNumber) params.planNumber = searchParams.planNumber
    if (searchParams.contractNumber) params.contractNumber = searchParams.contractNumber
    if (searchParams.customerName) params.customerName = searchParams.customerName
    if (searchParams.status) params.status = searchParams.status
    if (searchParams.startDate) params.startDate = searchParams.startDate
    if (searchParams.endDate) params.endDate = searchParams.endDate

    const response = await outboundPlansApi.getAll(params)
    plans.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载出库计划失败:', error)
    message.error('加载出库计划失败')
    plans.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadPlans()
}

const handleReset = () => {
  searchParams.planNumber = ''
  searchParams.contractNumber = ''
  searchParams.customerName = ''
  searchParams.status = undefined
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
  loadPlans()
}

// 生成出库单
const handleGenerateDeliveryOrder = (record: any) => {
  const plan = plans.value.find(p => p.outbound_plan_id === record.outbound_plan_id)
  if (!plan) return

  let items: any[] = []
  try {
    items = typeof plan.plan_items === 'string' ? JSON.parse(plan.plan_items) : plan.plan_items || []
  } catch {
    items = []
  }

  // 映射计划明细到出库明细
  const deliveryItems = items.map((item: any, index: number) => ({
    no: index + 1,
    product_code: item.product_code || '',
    product_name: item.product_name || '',
    model: item.model || '',
    specification: item.description || '',
    unit: item.unit || '',
    quantity: item.quantity || 0,
    max_quantity: item.quantity || 0,
    tax_included_price: item.tax_included_price || 0,
    tax_rate: item.tax_rate || 0,
    remarks: item.remarks || '',
  }))

  deliveryOrderPrefill.value = {
    contract_number: plan.contract_number || '',
    customer_name: plan.customer_name || '',
    currency: plan.currency || 'CNY',
    delivery_items: deliveryItems,
    entry_date: plan.entry_date,
    remarks: plan.remarks || '',
  }

  deliveryOrderFormVisible.value = true
}

const handleDeliveryOrderSuccess = () => {
  deliveryOrderFormVisible.value = false
  deliveryOrderPrefill.value = undefined
  message.success('出库单创建成功')
}

const handleDelete = (record: any) => {
  const plan = plans.value.find(p => p.outbound_plan_id === record.outbound_plan_id)
  if (!plan) return

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除出库计划 ${plan.plan_number} 吗？`,
    onOk: async () => {
      try {
        await outboundPlansApi.delete(plan.outbound_plan_id)
        message.success('删除成功')
        loadPlans()
      } catch {
        message.error('删除失败')
      }
    },
  })
}

// 导出Excel
const exportColumns: ExportColumn[] = [
  { key: 'plan_number', title: '计划单编号' },
  { key: 'contract_number', title: '合同编号' },
  { key: 'customer_name', title: '客户名称' },
  { key: 'product_code', title: '产品代码' },
  { key: 'product_name', title: '产品名称' },
  { key: 'model', title: '产品型号' },
  { key: 'description', title: '产品描述' },
  { key: 'quantity', title: '数量' },
  { key: 'unit', title: '单位' },
  { key: 'delivery_date', title: '交货日期', formatter: (v) => formatDate(v) },
  { key: 'outbound_status', title: '出库状态', formatter: (v) => outboundStatusTextMap[v] || v || '待出库' },
  { key: 'currency', title: '币种' },
  { key: 'status', title: '状态', formatter: (v) => statusTextMap[v] || v || '待出库' },
  { key: 'entry_date', title: '录入日期', formatter: (v) => formatDate(v) },
  { key: 'sales_person', title: '销售员' },
  { key: 'item_remarks', title: '备注' },
]

const handleExport = async () => {
  try {
    const params: any = { page: 1, pageSize: 99999 }
    if (searchParams.planNumber) params.planNumber = searchParams.planNumber
    if (searchParams.contractNumber) params.contractNumber = searchParams.contractNumber
    if (searchParams.customerName) params.customerName = searchParams.customerName
    if (searchParams.status) params.status = searchParams.status
    if (searchParams.startDate) params.startDate = searchParams.startDate
    if (searchParams.endDate) params.endDate = searchParams.endDate

    const response = await outboundPlansApi.getAll(params)
    const allPlans: OutboundPlan[] = response.data || []
    const rows: any[] = []

    allPlans.forEach((plan) => {
      let items: any[] = []
      try {
        items = typeof plan.plan_items === 'string' ? JSON.parse(plan.plan_items) : plan.plan_items || []
      } catch {
        items = []
      }

      if (items.length === 0) {
        rows.push({
          ...plan,
          product_code: '-', product_name: '-', model: '-', description: '-',
          quantity: '-', unit: '-', delivery_date: '', outbound_status: 'pending',
          item_remarks: '',
        })
      } else {
        items.forEach((item: any) => {
          rows.push({
            ...plan,
            product_code: item.product_code || '-',
            product_name: item.product_name || '-',
            model: item.model || '-',
            description: item.description || '-',
            quantity: item.quantity || '-',
            unit: item.unit || '-',
            delivery_date: item.delivery_date || '',
            outbound_status: item.outbound_status || 'pending',
            item_remarks: item.remarks || '',
          })
        })
      }
    })

    const visibleKeySet = new Set(visibleColumns.value.flatMap((col: any) => [col.dataIndex, col.key]).filter(Boolean))
    const filteredExportColumns = exportColumns.filter(col => visibleKeySet.has(col.key))
    exportToExcel({ filename: '出库计划', columns: filteredExportColumns, data: rows })
  } catch {
    message.error('导出失败')
  }
}

onMounted(() => {
  loadPlans()
})
</script>

<style scoped lang="scss">
.outbound-plans-container {
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
