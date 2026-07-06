<template>
  <div class="profit-report-container">
    <div class="header">
      <h1>毛利表</h1>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="出货日期">
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
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="columns"
        :data-source="reportData"
        :loading="loading"
        :pagination="false"
        rowKey="index"
        bordered
        size="small"
        :scroll="{ x: 5800 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'delivery_date'">
            {{ formatDate(record.delivery_date) }}
          </template>
          <template v-else-if="column.key === 'settlement_date'">
            {{ formatDate(record.settlement_date) }}
          </template>
          <template v-else-if="column.key === 'settlement_status'">
            <a-tag :color="record.settlement_status === '全部结算' ? 'green' : record.settlement_status === '部分结算' ? 'orange' : 'default'">
              {{ record.settlement_status || '未结算' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'warehousing_date'">
            {{ formatDate(record.warehousing_date) }}
          </template>
          <template v-else-if="column.key === 'delivery_quantity'">
            {{ formatNumber(record.delivery_quantity) }}
          </template>
          <template v-else-if="column.key === 'warehousing_quantity'">
            {{ formatNumber(record.warehousing_quantity) }}
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
              <a-table-summary-cell :index="0" :colSpan="15" />
              <a-table-summary-cell :index="15" :align="'right'">
                <strong>{{ formatMoney(totals.sales_amount_included) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="16" :colSpan="1" />
              <a-table-summary-cell :index="17" :align="'right'">
                <strong>{{ formatMoney(totals.sales_amount_excluded) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="18" :colSpan="5" />
              <a-table-summary-cell :index="23" :align="'right'">
                <strong>{{ formatMoney(totals.warehousing_amount) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="24" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_transportation) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="25" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_operating) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="26" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_vat) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="27" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_handling) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="28" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_other) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="29" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_total) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="30" :align="'right'">
                <strong>{{ formatMoney(totals.sl_expense_transportation) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="31" :align="'right'">
                <strong>{{ formatMoney(totals.sl_expense_handling) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="32" :align="'right'">
                <strong>{{ formatMoney(totals.sl_expense_other) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="33" :align="'right'">
                <strong>{{ formatMoney(totals.sl_expense_total) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="34" :align="'right'">
                <strong>{{ formatMoney(totals.wh_expense_tariff) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="35" :colSpan="1" />
              <a-table-summary-cell :index="36" :align="'right'">
                <strong>{{ formatMoney(totals.wh_expense_customs) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="37" :align="'right'">
                <strong>{{ formatMoney(totals.wh_expense_other) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="38" :align="'right'">
                <strong>{{ formatMoney(totals.wh_expense_total) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="39" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_express) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="40" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_transportation) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="41" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_customs) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="42" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_other) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="43" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_total) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="44" :align="'right'">
                <strong :style="{ color: totals.gross_profit >= 0 ? '#52c41a' : '#f5222d' }">
                  {{ formatMoney(totals.gross_profit) }}
                </strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="45" :colSpan="1" />
              <a-table-summary-cell :index="46" :align="'right'">
                <strong>{{ formatMoney(totals.commission_amount) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="47" :colSpan="1" />
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
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { profitReportApi } from '@/api/profitReport'
import type { ProfitReportItem, ProfitReportParams } from '@/api/profitReport'
import type { Dayjs } from 'dayjs'

const loading = ref(false)
const reportData = ref<ProfitReportItem[]>([])
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const searchParams = reactive<ProfitReportParams>({
  startDate: undefined,
  endDate: undefined,
  contractNumber: undefined,
  customerName: undefined,
  productCode: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 50,
  total: 0,
})

const columns = [
  { title: '出货日期', dataIndex: 'delivery_date', key: 'delivery_date', width: 100, fixed: 'left' as const },
  { title: '结算状态', dataIndex: 'settlement_status', key: 'settlement_status', width: 90, fixed: 'left' as const },
  { title: '结算日期', dataIndex: 'settlement_date', key: 'settlement_date', width: 100 },
  { title: '销售合同编号', dataIndex: 'sales_contract_number', key: 'sales_contract_number', width: 130 },
  { title: '销售员', dataIndex: 'sales_person', key: 'sales_person', width: 80 },
  { title: '公司名称', dataIndex: 'customer_name', key: 'customer_name', width: 150 },
  { title: '结算方式', dataIndex: 'payment_method', key: 'payment_method', width: 100 },
  { title: '分类', dataIndex: 'classification', key: 'classification', width: 100 },
  { title: '产品名称', dataIndex: 'product_name', key: 'product_name', width: 150 },
  { title: '产品代码', dataIndex: 'product_code', key: 'product_code', width: 120 },
  { title: '规格型号', dataIndex: 'model', key: 'model', width: 100 },
  { title: '规格描述', dataIndex: 'description', key: 'description', width: 120 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
  { title: '出货数量', dataIndex: 'delivery_quantity', key: 'delivery_quantity', width: 80, align: 'right' as const },
  { title: '单价（含税）', dataIndex: 'unit_price', key: 'unit_price', width: 100, align: 'right' as const },
  { title: '销售额（含税）', dataIndex: 'sales_amount_included', key: 'sales_amount_included', width: 120, align: 'right' as const },
  { title: '未税单价', dataIndex: 'unit_price_excluded', key: 'unit_price_excluded', width: 100, align: 'right' as const },
  { title: '未税金额', dataIndex: 'sales_amount_excluded', key: 'sales_amount_excluded', width: 110, align: 'right' as const },
  { title: '采购合同编号', dataIndex: 'purchase_contract_number', key: 'purchase_contract_number', width: 130 },
  { title: '采购员', dataIndex: 'purchase_person', key: 'purchase_person', width: 80 },
  { title: '入库日期', dataIndex: 'warehousing_date', key: 'warehousing_date', width: 100 },
  { title: '入库数量', dataIndex: 'warehousing_quantity', key: 'warehousing_quantity', width: 80, align: 'right' as const },
  { title: '入库单价（未税）', dataIndex: 'warehousing_unit_price_excluded', key: 'warehousing_unit_price_excluded', width: 120, align: 'right' as const },
  { title: '入库金额', dataIndex: 'warehousing_amount', key: 'warehousing_amount', width: 110, align: 'right' as const },
  { title: '采购-运输费', dataIndex: 'po_expense_transportation', key: 'po_expense_transportation', width: 100, align: 'right' as const },
  { title: '采购-运营费', dataIndex: 'po_expense_operating', key: 'po_expense_operating', width: 100, align: 'right' as const },
  { title: '采购-增值税', dataIndex: 'po_expense_vat', key: 'po_expense_vat', width: 100, align: 'right' as const },
  { title: '采购-手续费', dataIndex: 'po_expense_handling', key: 'po_expense_handling', width: 100, align: 'right' as const },
  { title: '采购-其他', dataIndex: 'po_expense_other', key: 'po_expense_other', width: 90, align: 'right' as const },
  { title: '采购费用小计', dataIndex: 'po_expense_total', key: 'po_expense_total', width: 110, align: 'right' as const },
  { title: '销售-运输费', dataIndex: 'sl_expense_transportation', key: 'sl_expense_transportation', width: 100, align: 'right' as const },
  { title: '销售-手续费', dataIndex: 'sl_expense_handling', key: 'sl_expense_handling', width: 100, align: 'right' as const },
  { title: '销售-其他', dataIndex: 'sl_expense_other', key: 'sl_expense_other', width: 90, align: 'right' as const },
  { title: '销售费用小计', dataIndex: 'sl_expense_total', key: 'sl_expense_total', width: 110, align: 'right' as const },
  { title: '入库-关税', dataIndex: 'wh_expense_tariff', key: 'wh_expense_tariff', width: 90, align: 'right' as const },
  { title: '入库-运杂费', dataIndex: 'wh_expense_transportation', key: 'wh_expense_transportation', width: 100, align: 'right' as const },
  { title: '入库-报关费', dataIndex: 'wh_expense_customs', key: 'wh_expense_customs', width: 100, align: 'right' as const },
  { title: '入库-其他', dataIndex: 'wh_expense_other', key: 'wh_expense_other', width: 90, align: 'right' as const },
  { title: '入库费用小计', dataIndex: 'wh_expense_total', key: 'wh_expense_total', width: 110, align: 'right' as const },
  { title: '出库-快递费', dataIndex: 'dl_expense_express', key: 'dl_expense_express', width: 100, align: 'right' as const },
  { title: '出库-运杂费', dataIndex: 'dl_expense_transportation', key: 'dl_expense_transportation', width: 100, align: 'right' as const },
  { title: '出库-报关费', dataIndex: 'dl_expense_customs', key: 'dl_expense_customs', width: 100, align: 'right' as const },
  { title: '出库-其他', dataIndex: 'dl_expense_other', key: 'dl_expense_other', width: 90, align: 'right' as const },
  { title: '出库费用小计', dataIndex: 'dl_expense_total', key: 'dl_expense_total', width: 110, align: 'right' as const },
  { title: '毛利', dataIndex: 'gross_profit', key: 'gross_profit', width: 110, align: 'right' as const },
  { title: '提成比例', dataIndex: 'commission_rate', key: 'commission_rate', width: 80, align: 'right' as const },
  { title: '应发提成', dataIndex: 'commission_amount', key: 'commission_amount', width: 100, align: 'right' as const },
  { title: '备注', dataIndex: 'remarks', key: 'remarks', width: 150 },
]

const moneyKeys = new Set([
  'unit_price', 'sales_amount_included', 'unit_price_excluded', 'sales_amount_excluded',
  'warehousing_unit_price_excluded', 'warehousing_amount',
  'po_expense_transportation', 'po_expense_operating', 'po_expense_vat', 'po_expense_handling', 'po_expense_other', 'po_expense_total',
  'sl_expense_transportation', 'sl_expense_handling', 'sl_expense_other', 'sl_expense_total',
  'wh_expense_tariff', 'wh_expense_transportation', 'wh_expense_customs', 'wh_expense_other', 'wh_expense_total',
  'dl_expense_express', 'dl_expense_transportation', 'dl_expense_customs', 'dl_expense_other', 'dl_expense_total',
  'commission_amount',
])

const isMoneyColumn = (key: string) => moneyKeys.has(key)

const formatDate = (date: string | null | undefined) => {
  if (!date) return ''
  return String(date).slice(0, 10)
}

const formatMoney = (value: number | null | undefined) => {
  if (value === null || value === undefined) return ''
  return value.toFixed(2)
}

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const totals = computed(() => {
  return reportData.value.reduce(
    (acc, item) => {
      acc.sales_amount_included += item.sales_amount_included || 0
      acc.sales_amount_excluded += item.sales_amount_excluded || 0
      acc.warehousing_amount += item.warehousing_amount || 0
      acc.po_expense_transportation += item.po_expense_transportation || 0
      acc.po_expense_operating += item.po_expense_operating || 0
      acc.po_expense_vat += item.po_expense_vat || 0
      acc.po_expense_handling += item.po_expense_handling || 0
      acc.po_expense_other += item.po_expense_other || 0
      acc.po_expense_total += item.po_expense_total || 0
      acc.sl_expense_transportation += item.sl_expense_transportation || 0
      acc.sl_expense_handling += item.sl_expense_handling || 0
      acc.sl_expense_other += item.sl_expense_other || 0
      acc.sl_expense_total += item.sl_expense_total || 0
      acc.wh_expense_tariff += item.wh_expense_tariff || 0
      acc.wh_expense_customs += item.wh_expense_customs || 0
      acc.wh_expense_other += item.wh_expense_other || 0
      acc.wh_expense_total += item.wh_expense_total || 0
      acc.dl_expense_express += item.dl_expense_express || 0
      acc.dl_expense_transportation += item.dl_expense_transportation || 0
      acc.dl_expense_customs += item.dl_expense_customs || 0
      acc.dl_expense_other += item.dl_expense_other || 0
      acc.dl_expense_total += item.dl_expense_total || 0
      acc.gross_profit += item.gross_profit || 0
      acc.commission_amount += item.commission_amount || 0
      return acc
    },
    {
      sales_amount_included: 0,
      sales_amount_excluded: 0,
      warehousing_amount: 0,
      po_expense_transportation: 0,
      po_expense_operating: 0,
      po_expense_vat: 0,
      po_expense_handling: 0,
      po_expense_other: 0,
      po_expense_total: 0,
      sl_expense_transportation: 0,
      sl_expense_handling: 0,
      sl_expense_other: 0,
      sl_expense_total: 0,
      wh_expense_tariff: 0,
      wh_expense_customs: 0,
      wh_expense_other: 0,
      wh_expense_total: 0,
      dl_expense_express: 0,
      dl_expense_transportation: 0,
      dl_expense_customs: 0,
      dl_expense_other: 0,
      dl_expense_total: 0,
      gross_profit: 0,
      commission_amount: 0,
    }
  )
})

const fetchReport = async () => {
  loading.value = true
  try {
    const params: ProfitReportParams = {
      ...searchParams,
      page: pagination.current,
      pageSize: pagination.pageSize,
    }

    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      params.startDate = dateRange.value[0].format('YYYY-MM-DD')
      params.endDate = dateRange.value[1].format('YYYY-MM-DD')
    }

    const res = await profitReportApi.getReport(params)
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
  pagination.current = 1
  fetchReport()
}

const handlePageChange = (page: number, pageSize: number) => {
  pagination.current = page
  pagination.pageSize = pageSize
  fetchReport()
}

onMounted(() => {
  fetchReport()
})
</script>

<style scoped>
.profit-report-container {
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
