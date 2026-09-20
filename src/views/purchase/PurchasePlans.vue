<template>
  <div class="purchase-plans-container">
    <div class="header">
      <h1>采购计划</h1>
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
              <a-select-option value="pending">未采购</a-select-option>
              <a-select-option value="partial">部分采购</a-select-option>
              <a-select-option value="purchased">已采购</a-select-option>
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
              <ColumnConfig :columns="allColumns" @update:columns="handleColumnConfigUpdate" cacheKey="purchasePlans" />
              <a-button type="primary" :disabled="selectedRowKeys.length === 0" @click="handleGeneratePurchaseOrder">
                生成采购订单
              </a-button>
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
        :scroll="{ x: 2800, y: 'calc(100vh - 300px)' }"
        :row-selection="rowSelection"
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
            <a-tag :color="statusColorMap[record.status] || 'default'">
              {{ statusTextMap[record.status] || '未采购' }}
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

    <!-- 生成采购订单表单 -->
    <PurchaseOrderForm
      v-model:visible="purchaseOrderFormVisible"
      :isEdit="false"
      :purchaseOrderData="purchaseOrderPrefill"
      @success="handlePurchaseOrderSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { purchasePlansApi } from '@/api/purchasePlans'
import type { PurchasePlan, PurchasePlanQueryParams } from '@/types'
import PurchaseOrderForm from '@/components/PurchaseOrderForm.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import { formatDate } from '@/utils/date'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'

const plans = ref<PurchasePlan[]>([])
const loading = ref(false)
const purchaseOrderFormVisible = ref(false)
const purchaseOrderPrefill = ref<any>(undefined)
const currentPlanId = ref<string | null>(null)
const dateRange = ref<[any, any] | undefined>(undefined)
const selectedRowKeys = ref<string[]>([])

// 行选择配置（每行独立选中）
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => {
    selectedRowKeys.value = keys
  },
}))

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
        row_key: plan.purchase_plan_id,
        product_code: '-',
        product_name: '-',
        model: '-',
        description: '-',
        quantity: '-',
        unit: '-',
        delivery_date: '',
        item_remarks: '',
        _isFirstRow: true,
        _rowCount: 1,
        _planIndex: planIndex,
        _rowIndex: rowIndex++,
      })
    } else {
      items.forEach((item: any, index: number) => {
        result.push({
          ...plan,
          row_key: `${plan.purchase_plan_id}_${index}`,
          product_code: item.product_code || '-',
          product_name: item.product_name || '-',
          model: item.model || '-',
          description: item.description || '-',
          quantity: item.quantity || '-',
          unit: item.unit || '-',
          delivery_date: item.delivery_date || '',
          item_remarks: item.remarks || '',
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

const searchParams = reactive<PurchasePlanQueryParams>({
  page: 1,
  pageSize: 100,
  planNumber: '',
  contractNumber: '',
  customerName: '',
  status: 'pending',
  startDate: '',
  endDate: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 100,
  total: 0,
})

const statusTextMap: Record<string, string> = {
  pending: '未采购',
  partial: '部分采购',
  purchased: '已采购',
  cancelled: '已取消',
}

const statusColorMap: Record<string, string> = {
  pending: 'orange',
  partial: 'blue',
  purchased: 'green',
  cancelled: 'red',
}

const formatMoney = (amount: number | string) => {
  if (!amount && amount !== 0) return '0.0000'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0.0000'
  return num.toFixed(4).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 动态生成筛选选项的辅助函数
const generateFilters = (dataKey: string) => {
  return computed(() => {
    const values = [...new Set(expandedPlans.value.map((item: any) => item[dataKey]).filter(Boolean))]
    return values.map(value => ({ text: String(value), value: String(value) }))
  })
}

// 客户名称筛选选项
const customerNameFilters = generateFilters('customer_name')
// 产品代码筛选选项
const productCodeFilters = generateFilters('product_code')
// 产品名称筛选选项
const productNameFilters = generateFilters('product_name')
// 产品型号筛选选项
const modelFilters = generateFilters('model')
// 产品描述筛选选项
const descriptionFilters = generateFilters('description')
// 状态筛选选项
const statusFilters = computed(() => [
  { text: '未采购', value: 'pending' },
  { text: '部分采购', value: 'partial' },
  { text: '已采购', value: 'purchased' },
  { text: '已取消', value: 'cancelled' },
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
    filters: customerNameFilters.value,
    onFilter: (value: string, record: any) => String(record.customer_name) === value,
    filterMultiple: true,
  },
  {
    title: '产品代码',
    dataIndex: 'product_code',
    key: 'product_code',
    width: 120,
    filters: productCodeFilters.value,
    onFilter: (value: string, record: any) => String(record.product_code) === value,
    filterMultiple: true,
  },
  {
    title: '产品名称',
    dataIndex: 'product_name',
    key: 'product_name',
    width: 150,
    filters: productNameFilters.value,
    onFilter: (value: string, record: any) => String(record.product_name) === value,
    filterMultiple: true,
  },
  {
    title: '产品型号',
    dataIndex: 'model',
    key: 'model',
    width: 120,
    filters: modelFilters.value,
    onFilter: (value: string, record: any) => String(record.model) === value,
    filterMultiple: true,
  },
  {
    title: '产品描述',
    dataIndex: 'description',
    key: 'description',
    width: 150,
    filters: descriptionFilters.value,
    onFilter: (value: string, record: any) => String(record.description) === value,
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
    title: '交货日期',
    dataIndex: 'delivery_date',
    key: 'delivery_date',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
    sorter: (a: any, b: any) => (a.delivery_date || '').localeCompare(b.delivery_date || ''),
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
    filters: statusFilters.value,
    onFilter: (value: string, record: any) => String(record.status) === value,
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
    width: 80,
    fixed: 'right',
  },
])

let isUpdatingFromConfig = false

const handleColumnConfigUpdate = (newColumns: any[]) => {
  isUpdatingFromConfig = true
  allColumns.value = newColumns
  isUpdatingFromConfig = false
}

// 当动态筛选数据变化时，更新 allColumns 中对应列的 filters
watch(
  [customerNameFilters, productCodeFilters, productNameFilters, modelFilters, descriptionFilters, statusFilters],
  () => {
    if (isUpdatingFromConfig) return
    const cols = allColumns.value
    const filterMap: Record<string, any> = {
      customer_name: customerNameFilters.value,
      product_code: productCodeFilters.value,
      product_name: productNameFilters.value,
      model: modelFilters.value,
      description: descriptionFilters.value,
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

    const response = await purchasePlansApi.getAll(params)
    plans.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载采购计划失败:', error)
    message.error('加载采购计划失败')
    plans.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  selectedRowKeys.value = []
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
  selectedRowKeys.value = []
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
  selectedRowKeys.value = []
  loadPlans()
}

// 生成采购订单（只合并选中行的商品）
const handleGeneratePurchaseOrder = () => {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要生成采购订单的商品行')
    return
  }

  // 直接从 expandedPlans 中取选中的行
  const selectedKeySet = new Set(selectedRowKeys.value)
  const selectedRows = expandedPlans.value.filter((r: any) => selectedKeySet.has(r.row_key))

  if (selectedRows.length === 0) {
    message.warning('请先选择要生成采购订单的商品行')
    return
  }

  // 从选中行中去重提取计划ID（用于后续更新状态）
  const selectedPlanIds = [...new Set(selectedRows.map((r: any) => r.purchase_plan_id))]
  currentPlanId.value = selectedPlanIds[0]

  // 合并相同商品（按 product_code 分组，数量相加）
  const mergedMap = new Map<string, any>()
  selectedRows.forEach((row: any) => {
    const code = row.product_code || ''
    const qty = Number(row.quantity) || 0
    if (mergedMap.has(code)) {
      mergedMap.get(code).quantity += qty
    } else {
      mergedMap.set(code, {
        product_code: code,
        product_name: row.product_name || '',
        model: row.model || '',
        description: row.description || '',
        unit: row.unit || '',
        quantity: qty,
        delivery_date: row.delivery_date || '',
        remarks: row.item_remarks || '',
      })
    }
  })

  const allPurchaseItems: any[] = [...mergedMap.values()].map((item, index) => ({
    no: index + 1,
    business_category: '',
    product_code: item.product_code,
    product_name: item.product_name,
    model: item.model,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    tax_rate: 13,
    tax_included_price: 0,
    tax_excluded_price: 0,
    tax_included_amount: 0,
    tax_excluded_amount: 0,
    tax_amount: 0,
    status: 1,
    delivery_date: item.delivery_date,
    remarks: item.remarks,
    inbound_quantity: 0,
    total_price: 0,
  }))

  // 取第一个选中行所属计划的公共信息
  const firstPlan = plans.value.find(p => p.purchase_plan_id === selectedRows[0].purchase_plan_id)

  // 构建关联销售订单明细
  const relatedSalesOrders: any[] = []
  selectedRows.forEach((row: any) => {
    if (row.sales_order_id && row.product_code) {
      relatedSalesOrders.push({
        sales_order_id: row.sales_order_id,
        order_number: row.contract_number || '',
        product_code: row.product_code,
        quantity: Number(row.quantity) || 1,
      })
    }
  })

  purchaseOrderPrefill.value = {
    contract_number: firstPlan?.contract_number || '',
    currency: firstPlan?.currency || 'CNY',
    related_sales_order_id: firstPlan?.sales_order_id || '',
    related_sales_orders: relatedSalesOrders,
    purchase_items: allPurchaseItems,
    entry_date: firstPlan?.entry_date,
    remarks: firstPlan?.remarks || '',
  }

  purchaseOrderFormVisible.value = true
}

const handlePurchaseOrderSuccess = async () => {
  purchaseOrderFormVisible.value = false
  purchaseOrderPrefill.value = undefined

  // 更新所有选中计划的状态为已采购
  const selectedPlanIds = [...new Set(selectedRowKeys.value.map(key => String(key).split('_')[0]))]
  if (selectedPlanIds.length > 0) {
    let successCount = 0
    let failCount = 0
    for (const planId of selectedPlanIds) {
      try {
        await purchasePlansApi.update(planId, { status: 'purchased' })
        successCount++
      } catch (error) {
        console.error(`更新采购计划 ${planId} 状态失败:`, error)
        failCount++
      }
    }
    if (failCount === 0) {
      message.success(`采购订单创建成功，${successCount}个采购计划状态已更新为已采购`)
    } else {
      message.warning(`采购订单创建成功，${successCount}个计划更新成功，${failCount}个更新失败`)
    }
    currentPlanId.value = null
  } else {
    message.success('采购订单创建成功')
  }

  // 清空选中并重新加载列表
  selectedRowKeys.value = []
  loadPlans()
}

const handleDelete = (record: any) => {
  const plan = plans.value.find(p => p.purchase_plan_id === record.purchase_plan_id)
  if (!plan) return

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除采购计划 ${plan.plan_number} 吗？`,
    onOk: async () => {
      try {
        await purchasePlansApi.delete(plan.purchase_plan_id)
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
  { key: 'currency', title: '币种' },
  { key: 'status', title: '状态', formatter: (v) => statusTextMap[v] || v || '未采购' },
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

    const response = await purchasePlansApi.getAll(params)
    const allPlans: PurchasePlan[] = response.data || []
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
          quantity: '-', unit: '-', delivery_date: '',
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
            item_remarks: item.remarks || '',
          })
        })
      }
    })

    const visibleKeySet = new Set(visibleColumns.value.flatMap((col: any) => [col.dataIndex, col.key]).filter(Boolean))
    const filteredExportColumns = exportColumns.filter(col => visibleKeySet.has(col.key))
    exportToExcel({ filename: '采购计划', columns: filteredExportColumns, data: rows })
  } catch {
    message.error('导出失败')
  }
}

onMounted(() => {
  loadPlans()
})
</script>

<style scoped lang="scss">
.purchase-plans-container {
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
