<template>
  <div class="basic-profit-report-container">
    <div class="header">
      <h1>基础毛利表</h1>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="录入日期">
            <a-range-picker
              v-model:value="dateRange"
              format="YYYY-MM-DD"
              :placeholder="['开始日期', '结束日期']"
              style="width: 240px"
            />
          </a-form-item>

          <a-form-item label="销售合同编号">
            <a-input
              v-model:value="searchParams.contractNumber"
              placeholder="请输入销售合同编号"
              allowClear
              style="width: 160px"
            />
          </a-form-item>

          <a-form-item label="客户名称">
            <a-input
              v-model:value="searchParams.customerName"
              placeholder="请输入客户名称"
              allowClear
              style="width: 160px"
            />
          </a-form-item>

          <a-form-item label="产品代码">
            <a-input
              v-model:value="searchParams.productCode"
              placeholder="请输入产品代码"
              allowClear
              style="width: 140px"
            />
          </a-form-item>

          <a-form-item label="销售员">
            <a-input
              v-model:value="searchParams.salesPerson"
              placeholder="请输入销售员"
              allowClear
              style="width: 120px"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch" :loading="loading">
                <template #icon><SearchOutlined /></template>
                查询
              </a-button>
              <a-button @click="handleReset">
                <template #icon><ReloadOutlined /></template>
                重置
              </a-button>
              <a-button @click="handleExport" :loading="exportLoading">
                <template #icon><DownloadOutlined /></template>
                导出Excel
              </a-button>
              <ColumnConfig
                :columns="allColumns"
                @update:columns="handleColumnConfigUpdate"
                cacheKey="basicProfitReport"
              />
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        v-scroll-topbar
        :columns="visibleColumns"
        :data-source="reportData"
        :loading="loading"
        :pagination="false"
        rowKey="index"
        bordered
        size="small"
        :scroll="{ x: 5000, y: 'calc(100vh - 320px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'entry_date'">
            {{ formatDate(record.entry_date) }}
          </template>
          <template v-else-if="column.key === 'quantity'">
            {{ formatNumber(record.quantity) }}
          </template>
          <template v-else-if="column.key === 'purchase_quantity'">
            {{ formatNumber(record.purchase_quantity) }}
          </template>
          <template v-else-if="column.key === 'sales_customs_rate' || column.key === 'purchase_customs_rate'">
            {{ formatRate(record[column.key]) }}
          </template>
          <template v-else-if="column.key === 'gross_profit_rate'">
            {{ record.gross_profit_rate !== null && record.gross_profit_rate !== undefined ? record.gross_profit_rate.toFixed(2) + '%' : '' }}
          </template>
          <template v-else-if="isMoneyColumn(column.key)">
            {{ formatMoney(record[column.key]) }}
          </template>
          <template v-else-if="column.key === 'gross_profit'">
            <span :style="{ color: record.gross_profit >= 0 ? '#52c41a' : '#f5222d', fontWeight: 'bold' }">
              {{ formatMoney(record.gross_profit) }}
            </span>
          </template>
        </template>
        <template #summary>
          <a-table-summary>
            <a-table-summary-row>
              <!-- 0-3: 销售合同编号, 客户名称, 销售员, 录入日期 -->
              <a-table-summary-cell :index="0" :colSpan="4" />
              <!-- 4-7: 产品名称, 产品代码, 规格型号, 销售数量 -->
              <a-table-summary-cell :index="4" :colSpan="4" />
              <!-- 8: 币种 -->
              <a-table-summary-cell :index="8" :colSpan="1" />
              <!-- 9: 销售单价 -->
              <a-table-summary-cell :index="9" :colSpan="1" />
              <!-- 10: 销售金额（原币） -->
              <a-table-summary-cell :index="10" :align="'right'">
                <strong>{{ formatMoney(totals.amount) }}</strong>
              </a-table-summary-cell>
              <!-- 11: 海关汇率（销售） -->
              <a-table-summary-cell :index="11" :colSpan="1" />
              <!-- 12: 销售金额（CNY） -->
              <a-table-summary-cell :index="12" :align="'right'">
                <strong>{{ formatMoney(totals.sales_amount_cny) }}</strong>
              </a-table-summary-cell>
              <!-- 13-15: 采购合同编号, 供应商名称, 采购员 -->
              <a-table-summary-cell :index="13" :colSpan="3" />
              <!-- 16: 采购数量 -->
              <a-table-summary-cell :index="16" :colSpan="1" />
              <!-- 17: 采购币种 -->
              <a-table-summary-cell :index="17" :colSpan="1" />
              <!-- 18: 采购单价 -->
              <a-table-summary-cell :index="18" :colSpan="1" />
              <!-- 19: 采购金额（原币） -->
              <a-table-summary-cell :index="19" :align="'right'">
                <strong>{{ formatMoney(totals.purchase_amount) }}</strong>
              </a-table-summary-cell>
              <!-- 20: 海关汇率（采购） -->
              <a-table-summary-cell :index="20" :colSpan="1" />
              <!-- 21: 采购金额（CNY） -->
              <a-table-summary-cell :index="21" :align="'right'">
                <strong>{{ formatMoney(totals.purchase_amount_cny) }}</strong>
              </a-table-summary-cell>
              <!-- 22: 采购费用（CNY） -->
              <a-table-summary-cell :index="22" :align="'right'">
                <strong>{{ formatMoney(totals.purchase_expense_cny) }}</strong>
              </a-table-summary-cell>
              <!-- 23: 毛利（CNY） -->
              <a-table-summary-cell :index="23" :align="'right'">
                <strong :style="{ color: totals.gross_profit >= 0 ? '#52c41a' : '#f5222d' }">
                  {{ formatMoney(totals.gross_profit) }}
                </strong>
              </a-table-summary-cell>
              <!-- 24: 毛利率 -->
              <a-table-summary-cell :index="24" :colSpan="1" />
              <!-- 25: 备注 -->
              <a-table-summary-cell :index="25" :colSpan="1" />
            </a-table-summary-row>
          </a-table-summary>
        </template>
      </a-table>
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        show-total
        show-size-changer
        show-quick-jumper
        :page-size-options="['20', '50', '100', '200']"
        style="margin-top: 16px; text-align: right"
        @change="handlePageChange"
        @showSizeChange="handlePageChange"
      />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { basicProfitReportApi } from '@/api/basicProfitReport'
import type { BasicProfitReportItem, BasicProfitReportParams } from '@/api/basicProfitReport'
import { formatDate } from '@/utils/date'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'
import ColumnConfig from '@/components/ColumnConfig.vue'
import type { Dayjs } from 'dayjs'

const loading = ref(false)
const exportLoading = ref(false)
const reportData = ref<BasicProfitReportItem[]>([])
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const searchParams = reactive<BasicProfitReportParams>({
  startDate: undefined,
  endDate: undefined,
  contractNumber: undefined,
  customerName: undefined,
  productCode: undefined,
  salesPerson: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 50,
  total: 0,
})

// 动态生成筛选选项的辅助函数
const generateFilters = (dataKey: keyof BasicProfitReportItem) => {
  return computed(() => {
    const values = [...new Set(reportData.value.map(item => item[dataKey]).filter(Boolean))]
    return values.map(value => ({ text: String(value), value: String(value) }))
  })
}

// 筛选选项
const salesPersonFilters = generateFilters('sales_person')
const customerNameFilters = generateFilters('customer_name')
const currencyFilters = generateFilters('currency')
const productNameFilters = generateFilters('product_name')
const productCodeFilters = generateFilters('product_code')
const modelFilters = generateFilters('model')
const supplierNameFilters = generateFilters('supplier_name')
const purchaseCurrencyFilters = generateFilters('purchase_currency')

// 使用 ref 使列配置可通过 ColumnConfig 组件更新
const allColumns = ref([
  // ========== 销售订单信息 ==========
  {
    title: '销售合同编号',
    dataIndex: 'contract_number',
    key: 'contract_number',
    width: 130,
    fixed: 'left' as const,
  },
  {
    title: '客户名称',
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 150,
    filters: customerNameFilters.value,
    onFilter: (value: string, record: BasicProfitReportItem) => record.customer_name === value,
    filterMultiple: true,
  },
  {
    title: '销售员',
    dataIndex: 'sales_person',
    key: 'sales_person',
    width: 80,
    filters: salesPersonFilters.value,
    onFilter: (value: string, record: BasicProfitReportItem) => record.sales_person === value,
    filterMultiple: true,
  },
  { title: '录入日期', dataIndex: 'entry_date', key: 'entry_date', width: 100 },

  // ========== 商品信息 ==========
  {
    title: '产品名称',
    dataIndex: 'product_name',
    key: 'product_name',
    width: 150,
    filters: productNameFilters.value,
    onFilter: (value: string, record: BasicProfitReportItem) => record.product_name === value,
    filterMultiple: true,
  },
  {
    title: '产品代码',
    dataIndex: 'product_code',
    key: 'product_code',
    width: 120,
    filters: productCodeFilters.value,
    onFilter: (value: string, record: BasicProfitReportItem) => record.product_code === value,
    filterMultiple: true,
  },
  {
    title: '规格型号',
    dataIndex: 'model',
    key: 'model',
    width: 100,
    filters: modelFilters.value,
    onFilter: (value: string, record: BasicProfitReportItem) => record.model === value,
    filterMultiple: true,
  },
  { title: '销售数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' as const },

  // ========== 销售金额 ==========
  {
    title: '币种',
    dataIndex: 'currency',
    key: 'currency',
    width: 70,
    filters: currencyFilters.value,
    onFilter: (value: string, record: BasicProfitReportItem) => record.currency === value,
    filterMultiple: true,
  },
  { title: '销售单价（含税）', dataIndex: 'unit_price', key: 'unit_price', width: 120, align: 'right' as const },
  { title: '销售金额（含税）', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' as const },
  { title: '海关汇率（销售）', dataIndex: 'sales_customs_rate', key: 'sales_customs_rate', width: 120, align: 'right' as const },
  { title: '销售金额（CNY）', dataIndex: 'sales_amount_cny', key: 'sales_amount_cny', width: 120, align: 'right' as const },

  // ========== 采购订单信息 ==========
  { title: '采购合同编号', dataIndex: 'purchase_contract_number', key: 'purchase_contract_number', width: 130 },
  {
    title: '供应商名称',
    dataIndex: 'supplier_name',
    key: 'supplier_name',
    width: 150,
    filters: supplierNameFilters.value,
    onFilter: (value: string, record: BasicProfitReportItem) => record.supplier_name === value,
    filterMultiple: true,
  },
  { title: '采购员', dataIndex: 'purchase_person', key: 'purchase_person', width: 80 },
  { title: '采购数量', dataIndex: 'purchase_quantity', key: 'purchase_quantity', width: 80, align: 'right' as const },
  {
    title: '采购币种',
    dataIndex: 'purchase_currency',
    key: 'purchase_currency',
    width: 80,
    filters: purchaseCurrencyFilters.value,
    onFilter: (value: string, record: BasicProfitReportItem) => record.purchase_currency === value,
    filterMultiple: true,
  },
  { title: '采购单价（含税）', dataIndex: 'purchase_unit_price', key: 'purchase_unit_price', width: 120, align: 'right' as const },
  { title: '采购金额（含税）', dataIndex: 'purchase_amount', key: 'purchase_amount', width: 120, align: 'right' as const },
  { title: '海关汇率（采购）', dataIndex: 'purchase_customs_rate', key: 'purchase_customs_rate', width: 120, align: 'right' as const },
  { title: '采购金额（CNY）', dataIndex: 'purchase_amount_cny', key: 'purchase_amount_cny', width: 120, align: 'right' as const },

  // ========== 费用和利润 ==========
  { title: '采购费用（CNY）', dataIndex: 'purchase_expense_cny', key: 'purchase_expense_cny', width: 120, align: 'right' as const },
  { title: '毛利（CNY）', dataIndex: 'gross_profit', key: 'gross_profit', width: 110, align: 'right' as const },
  { title: '毛利率', dataIndex: 'gross_profit_rate', key: 'gross_profit_rate', width: 80, align: 'right' as const },
  { title: '备注', dataIndex: 'remarks', key: 'remarks', width: 150 },
])

// 处理 ColumnConfig 组件的列更新
const handleColumnConfigUpdate = (newColumns: any[]) => {
  allColumns.value = newColumns
}

// 可见列（过滤掉隐藏的列）
const visibleColumns = computed(() => {
  return allColumns.value.filter((col: any) => col.visible !== false)
})

const moneyKeys = new Set([
  'unit_price', 'amount', 'sales_amount_cny',
  'purchase_unit_price', 'purchase_amount', 'purchase_amount_cny',
  'purchase_expense_cny',
])

const isMoneyColumn = (key: string) => moneyKeys.has(key)

const formatMoney = (value: number | null | undefined) => {
  if (value === null || value === undefined) return ''
  return value.toFixed(2)
}

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const formatRate = (value: number | null | undefined) => {
  if (value === null || value === undefined) return ''
  return value.toFixed(6)
}

const totals = computed(() => {
  return reportData.value.reduce(
    (acc, item) => {
      acc.amount += item.amount || 0
      acc.sales_amount_cny += item.sales_amount_cny || 0
      acc.purchase_amount += item.purchase_amount || 0
      acc.purchase_amount_cny += item.purchase_amount_cny || 0
      acc.purchase_expense_cny += item.purchase_expense_cny || 0
      acc.gross_profit += item.gross_profit || 0
      return acc
    },
    {
      amount: 0,
      sales_amount_cny: 0,
      purchase_amount: 0,
      purchase_amount_cny: 0,
      purchase_expense_cny: 0,
      gross_profit: 0,
    }
  )
})

const fetchReport = async () => {
  loading.value = true
  try {
    const params: BasicProfitReportParams = {
      ...searchParams,
      page: pagination.current,
      pageSize: pagination.pageSize,
    }

    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      params.startDate = dateRange.value[0].format('YYYY-MM-DD')
      params.endDate = dateRange.value[1].format('YYYY-MM-DD')
    }

    const res = await basicProfitReportApi.getReport(params)
    reportData.value = (res.data || []).map((item, index) => ({
      ...item,
      index: (pagination.current - 1) * pagination.pageSize + index + 1,
    }))
    if (res.pagination) {
      pagination.total = res.pagination.total
    }
  } catch (error: any) {
    message.error(error?.message || '查询失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchReport()
}

const handleReset = () => {
  dateRange.value = null
  searchParams.startDate = undefined
  searchParams.endDate = undefined
  searchParams.contractNumber = undefined
  searchParams.customerName = undefined
  searchParams.productCode = undefined
  searchParams.salesPerson = undefined
  pagination.current = 1
  fetchReport()
}

const handlePageChange = (page: number, pageSize: number) => {
  pagination.current = page
  pagination.pageSize = pageSize
  fetchReport()
}

const handleExport = async () => {
  exportLoading.value = true
  try {
    const params: BasicProfitReportParams = { ...searchParams }
    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      params.startDate = dateRange.value[0].format('YYYY-MM-DD')
      params.endDate = dateRange.value[1].format('YYYY-MM-DD')
    }
    // 获取所有数据（不分页）
    params.page = 1
    params.pageSize = 99999
    const res = await basicProfitReportApi.getReport(params)
    const allData = res.data || []

    if (allData.length === 0) {
      message.warning('没有可导出的数据')
      return
    }

    const exportColumns: ExportColumn[] = visibleColumns.value.map(col => ({
      key: col.dataIndex || col.key,
      title: col.title,
      formatter: col.key === 'entry_date'
        ? (value: any) => value ? formatDate(value) : ''
        : col.key === 'sales_customs_rate' || col.key === 'purchase_customs_rate'
        ? (value: any) => value ? value.toFixed(6) : ''
        : col.key === 'gross_profit_rate'
        ? (value: any) => value !== null && value !== undefined ? value.toFixed(2) + '%' : ''
        : undefined,
    }))

    exportToExcel({
      filename: '基础毛利表',
      columns: exportColumns,
      data: allData,
      sheetName: '基础毛利表',
    })
  } catch (error: any) {
    message.error(error.message || '导出失败')
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  fetchReport()
})
</script>

<style scoped>
.basic-profit-report-container {
  padding: 0;
}

.header {
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.search-bar {
  margin-bottom: 16px;
}

:deep(.ant-table-summary) {
  position: sticky;
  bottom: 0;
  z-index: 3;
}

:deep(.ant-table-summary td) {
  background: #fafafa !important;
}

:deep(.ant-table-summary tr td:first-child) {
  background: transparent !important;
}
</style>
