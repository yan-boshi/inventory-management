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
              <a-button @click="handleExport" :loading="exportLoading">
                <template #icon><DownloadOutlined /></template>
                导出Excel
              </a-button>
              <ColumnConfig
                :columns="allColumns"
                @update:columns="handleColumnConfigUpdate"
                cacheKey="profitReport"
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
        :scroll="{ x: 8000, y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'delivery_date'">
            {{ formatDate(record.delivery_date) }}
          </template>
          <template v-else-if="column.key === 'last_write_off_date'">
            {{ formatDate(record.last_write_off_date) }}
          </template>
          <template v-else-if="column.key === 'warehousing_date'">
            {{ formatDate(record.warehousing_date) }}
          </template>
          <template v-else-if="column.key === 'settlement_status'">
            <a-tag :color="record.settlement_status === '已结算' ? 'green' : record.settlement_status === '部分结算' ? 'orange' : 'default'">
              {{ record.settlement_status || '未结算' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'delivery_quantity'">
            {{ formatNumber(record.delivery_quantity) }}
          </template>
          <template v-else-if="column.key === 'warehousing_quantity'">
            {{ formatNumber(record.warehousing_quantity) }}
          </template>
          <template v-else-if="column.key === 'write_off_count'">
            {{ formatNumber(record.write_off_count) }}
          </template>
          <template v-else-if="column.key === 'bank_rate' || column.key === 'customs_rate'">
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
              <!-- 0-12: 出货日期, 出库单号, 销售合同编号, 销售员, 客户名称, 结算方式, 分类, 产品名称, 产品代码, 规格型号, 规格描述, 单位, 出货数量 -->
              <a-table-summary-cell :index="0" :colSpan="13" />
              <!-- 13: 单价（含税） -->
              <a-table-summary-cell :index="13" :colSpan="1" />
              <!-- 14: 销售额（含税） -->
              <a-table-summary-cell :index="14" :align="'right'">
                <strong>{{ formatMoney(totals.sales_amount_included) }}</strong>
              </a-table-summary-cell>
              <!-- 15: 未税单价 -->
              <a-table-summary-cell :index="15" :colSpan="1" />
              <!-- 16: 未税金额 -->
              <a-table-summary-cell :index="16" :align="'right'">
                <strong>{{ formatMoney(totals.sales_amount_excluded) }}</strong>
              </a-table-summary-cell>
              <!-- 17: 税率(%) -->
              <a-table-summary-cell :index="17" :colSpan="1" />
              <!-- 18: 结算状态 -->
              <a-table-summary-cell :index="18" :colSpan="1" />
              <!-- 19: 应收金额 -->
              <a-table-summary-cell :index="19" :align="'right'">
                <strong>{{ formatMoney(totals.receivable_amount) }}</strong>
              </a-table-summary-cell>
              <!-- 20: 已结算金额 -->
              <a-table-summary-cell :index="20" :align="'right'">
                <strong>{{ formatMoney(totals.received_amount) }}</strong>
              </a-table-summary-cell>
              <!-- 21: 待结算余额 -->
              <a-table-summary-cell :index="21" :align="'right'">
                <strong>{{ formatMoney(totals.balance_amount) }}</strong>
              </a-table-summary-cell>
              <!-- 22-24: 最近核销日期, 核销单号, 核销次数 -->
              <a-table-summary-cell :index="22" :colSpan="3" />
              <!-- 25: 成本单价(未税) -->
              <a-table-summary-cell :index="25" :colSpan="1" />
              <!-- 26: 成本单价(含税) -->
              <a-table-summary-cell :index="26" :colSpan="1" />
              <!-- 27: 成本金额(未税) -->
              <a-table-summary-cell :index="27" :align="'right'">
                <strong>{{ formatMoney(totals.cost_amount_excluded) }}</strong>
              </a-table-summary-cell>
              <!-- 28: 成本金额(含税) -->
              <a-table-summary-cell :index="28" :align="'right'">
                <strong>{{ formatMoney(totals.cost_amount_included) }}</strong>
              </a-table-summary-cell>
              <!-- 29-32: 采购合同编号, 采购员, 入库日期, 入库数量 -->
              <a-table-summary-cell :index="29" :colSpan="4" />
              <!-- 33: 入库单价（未税） -->
              <a-table-summary-cell :index="33" :colSpan="1" />
              <!-- 34: 入库单价（含税） -->
              <a-table-summary-cell :index="34" :colSpan="1" />
              <!-- 35: 入库金额（含税） -->
              <a-table-summary-cell :index="35" :align="'right'">
                <strong>{{ formatMoney(totals.warehousing_amount_included) }}</strong>
              </a-table-summary-cell>
              <!-- 36: 入库金额 -->
              <a-table-summary-cell :index="36" :align="'right'">
                <strong>{{ formatMoney(totals.warehousing_amount) }}</strong>
              </a-table-summary-cell>
              <!-- 37: 采购-运输费 -->
              <a-table-summary-cell :index="37" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_transportation) }}</strong>
              </a-table-summary-cell>
              <!-- 38: 采购-运营费 -->
              <a-table-summary-cell :index="38" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_operating) }}</strong>
              </a-table-summary-cell>
              <!-- 39: 采购-增值税 -->
              <a-table-summary-cell :index="39" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_vat) }}</strong>
              </a-table-summary-cell>
              <!-- 40: 采购-手续费 -->
              <a-table-summary-cell :index="40" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_handling) }}</strong>
              </a-table-summary-cell>
              <!-- 41: 采购-其他 -->
              <a-table-summary-cell :index="41" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_other) }}</strong>
              </a-table-summary-cell>
              <!-- 42: 采购费用小计 -->
              <a-table-summary-cell :index="42" :align="'right'">
                <strong>{{ formatMoney(totals.po_expense_total) }}</strong>
              </a-table-summary-cell>
              <!-- 43: 销售-运输费 -->
              <a-table-summary-cell :index="43" :align="'right'">
                <strong>{{ formatMoney(totals.sl_expense_transportation) }}</strong>
              </a-table-summary-cell>
              <!-- 44: 销售-手续费 -->
              <a-table-summary-cell :index="44" :align="'right'">
                <strong>{{ formatMoney(totals.sl_expense_handling) }}</strong>
              </a-table-summary-cell>
              <!-- 45: 销售-其他 -->
              <a-table-summary-cell :index="45" :align="'right'">
                <strong>{{ formatMoney(totals.sl_expense_other) }}</strong>
              </a-table-summary-cell>
              <!-- 46: 销售费用小计 -->
              <a-table-summary-cell :index="46" :align="'right'">
                <strong>{{ formatMoney(totals.sl_expense_total) }}</strong>
              </a-table-summary-cell>
              <!-- 47: 入库-关税 -->
              <a-table-summary-cell :index="47" :align="'right'">
                <strong>{{ formatMoney(totals.wh_expense_tariff) }}</strong>
              </a-table-summary-cell>
              <!-- 48: 入库-运杂费 -->
              <a-table-summary-cell :index="48" :align="'right'">
                <strong>{{ formatMoney(totals.wh_expense_transportation) }}</strong>
              </a-table-summary-cell>
              <!-- 49: 入库-报关费 -->
              <a-table-summary-cell :index="49" :align="'right'">
                <strong>{{ formatMoney(totals.wh_expense_customs) }}</strong>
              </a-table-summary-cell>
              <!-- 50: 入库-其他 -->
              <a-table-summary-cell :index="50" :align="'right'">
                <strong>{{ formatMoney(totals.wh_expense_other) }}</strong>
              </a-table-summary-cell>
              <!-- 51: 入库费用小计 -->
              <a-table-summary-cell :index="51" :align="'right'">
                <strong>{{ formatMoney(totals.wh_expense_total) }}</strong>
              </a-table-summary-cell>
              <!-- 52: 出库-快递费 -->
              <a-table-summary-cell :index="52" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_express) }}</strong>
              </a-table-summary-cell>
              <!-- 53: 出库-运杂费 -->
              <a-table-summary-cell :index="53" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_transportation) }}</strong>
              </a-table-summary-cell>
              <!-- 54: 出库-报关费 -->
              <a-table-summary-cell :index="54" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_customs) }}</strong>
              </a-table-summary-cell>
              <!-- 55: 出库-其他 -->
              <a-table-summary-cell :index="55" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_other) }}</strong>
              </a-table-summary-cell>
              <!-- 56: 出库费用小计 -->
              <a-table-summary-cell :index="56" :align="'right'">
                <strong>{{ formatMoney(totals.dl_expense_total) }}</strong>
              </a-table-summary-cell>
              <!-- 57: 费用合计 -->
              <a-table-summary-cell :index="57" :align="'right'">
                <strong>{{ formatMoney(totals.total_expense) }}</strong>
              </a-table-summary-cell>
              <!-- 58: 总成本 -->
              <a-table-summary-cell :index="58" :align="'right'">
                <strong>{{ formatMoney(totals.total_cost) }}</strong>
              </a-table-summary-cell>
              <!-- 59: 毛利 -->
              <a-table-summary-cell :index="59" :align="'right'">
                <strong :style="{ color: totals.gross_profit >= 0 ? '#52c41a' : '#f5222d' }">
                  {{ formatMoney(totals.gross_profit) }}
                </strong>
              </a-table-summary-cell>
              <!-- 60: 毛利率(%) -->
              <a-table-summary-cell :index="60" :colSpan="1" />
              <!-- 61: 币种 -->
              <a-table-summary-cell :index="61" :colSpan="1" />
              <!-- 62: 银行汇率 -->
              <a-table-summary-cell :index="62" :colSpan="1" />
              <!-- 63: 海关汇率 -->
              <a-table-summary-cell :index="63" :colSpan="1" />
              <!-- 64: CNY销售额(银行,含税) -->
              <a-table-summary-cell :index="64" :align="'right'">
                <strong>{{ formatMoney(totals.sales_amount_included_cny_bank) }}</strong>
              </a-table-summary-cell>
              <!-- 65: CNY销售额(银行,未税) -->
              <a-table-summary-cell :index="65" :align="'right'">
                <strong>{{ formatMoney(totals.sales_amount_excluded_cny_bank) }}</strong>
              </a-table-summary-cell>
              <!-- 66: CNY销售额(海关,含税) -->
              <a-table-summary-cell :index="66" :align="'right'">
                <strong>{{ formatMoney(totals.sales_amount_included_cny_customs) }}</strong>
              </a-table-summary-cell>
              <!-- 67: CNY销售额(海关,未税) -->
              <a-table-summary-cell :index="67" :align="'right'">
                <strong>{{ formatMoney(totals.sales_amount_excluded_cny_customs) }}</strong>
              </a-table-summary-cell>
              <!-- 68: 汇率差(含税) -->
              <a-table-summary-cell :index="68" :align="'right'">
                <strong :style="{ color: totals.exchange_diff_included >= 0 ? '#52c41a' : '#f5222d' }">
                  {{ formatMoney(totals.exchange_diff_included) }}
                </strong>
              </a-table-summary-cell>
              <!-- 69: 汇率差(未税) -->
              <a-table-summary-cell :index="69" :align="'right'">
                <strong :style="{ color: totals.exchange_diff_excluded >= 0 ? '#52c41a' : '#f5222d' }">
                  {{ formatMoney(totals.exchange_diff_excluded) }}
                </strong>
              </a-table-summary-cell>
              <!-- 70: 提成比例 -->
              <a-table-summary-cell :index="70" :colSpan="1" />
              <!-- 71: 应发提成 -->
              <a-table-summary-cell :index="71" :align="'right'">
                <strong>{{ formatMoney(totals.commission_amount) }}</strong>
              </a-table-summary-cell>
              <!-- 72: 备注 -->
              <a-table-summary-cell :index="72" :colSpan="1" />
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { profitReportApi } from '@/api/profitReport'
import type { ProfitReportItem, ProfitReportParams } from '@/api/profitReport'
import { formatDate } from '@/utils/date'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'
import ColumnConfig from '@/components/ColumnConfig.vue'
import type { Dayjs } from 'dayjs'

const loading = ref(false)
const exportLoading = ref(false)
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

// 结算状态筛选选项
const settlementStatusFilters = [
  { text: '已结算', value: '已结算' },
  { text: '部分结算', value: '部分结算' },
  { text: '未结算', value: '未结算' },
]

// 动态生成筛选选项的辅助函数
const generateFilters = (dataKey: keyof ProfitReportItem) => {
  return computed(() => {
    const values = [...new Set(reportData.value.map(item => item[dataKey]).filter(Boolean))]
    return values.map(value => ({ text: String(value), value: String(value) }))
  })
}

// 筛选选项
const salesPersonFilters = generateFilters('sales_person')
const customerNameFilters = generateFilters('customer_name')
const paymentMethodFilters = generateFilters('payment_method')
const classificationFilters = generateFilters('classification')
const productNameFilters = generateFilters('product_name')
const productCodeFilters = generateFilters('product_code')
const modelFilters = generateFilters('model')
const currencyFilters = generateFilters('currency')

// 使用 ref 使列配置可通过 ColumnConfig 组件更新
const allColumns = ref([
  // ========== 出货信息 ==========
  { title: '出货日期', dataIndex: 'delivery_date', key: 'delivery_date', width: 100, fixed: 'left' as const },
  { title: '出库单号', dataIndex: 'order_number', key: 'order_number', width: 130, fixed: 'left' as const },
  { title: '销售合同编号', dataIndex: 'sales_contract_number', key: 'sales_contract_number', width: 130 },
  {
    title: '销售员',
    dataIndex: 'sales_person',
    key: 'sales_person',
    width: 80,
    filters: salesPersonFilters.value,
    onFilter: (value: string, record: ProfitReportItem) => record.sales_person === value,
    filterMultiple: true,
  },
  {
    title: '客户名称',
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 150,
    filters: customerNameFilters.value,
    onFilter: (value: string, record: ProfitReportItem) => record.customer_name === value,
    filterMultiple: true,
  },
  {
    title: '结算方式',
    dataIndex: 'payment_method',
    key: 'payment_method',
    width: 100,
    filters: paymentMethodFilters.value,
    onFilter: (value: string, record: ProfitReportItem) => record.payment_method === value,
    filterMultiple: true,
  },
  {
    title: '分类',
    dataIndex: 'classification',
    key: 'classification',
    width: 100,
    filters: classificationFilters.value,
    onFilter: (value: string, record: ProfitReportItem) => record.classification === value,
    filterMultiple: true,
  },

  // ========== 商品信息 ==========
  {
    title: '产品名称',
    dataIndex: 'product_name',
    key: 'product_name',
    width: 150,
    filters: productNameFilters.value,
    onFilter: (value: string, record: ProfitReportItem) => record.product_name === value,
    filterMultiple: true,
  },
  {
    title: '产品代码',
    dataIndex: 'product_code',
    key: 'product_code',
    width: 120,
    filters: productCodeFilters.value,
    onFilter: (value: string, record: ProfitReportItem) => record.product_code === value,
    filterMultiple: true,
  },
  {
    title: '规格型号',
    dataIndex: 'model',
    key: 'model',
    width: 100,
    filters: modelFilters.value,
    onFilter: (value: string, record: ProfitReportItem) => record.model === value,
    filterMultiple: true,
  },
  { title: '规格描述', dataIndex: 'description', key: 'description', width: 120 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
  { title: '出货数量', dataIndex: 'delivery_quantity', key: 'delivery_quantity', width: 80, align: 'right' as const },

  // ========== 销售信息 ==========
  { title: '单价（含税）', dataIndex: 'unit_price', key: 'unit_price', width: 100, align: 'right' as const },
  { title: '销售额（含税）', dataIndex: 'sales_amount_included', key: 'sales_amount_included', width: 120, align: 'right' as const },
  { title: '未税单价', dataIndex: 'unit_price_excluded', key: 'unit_price_excluded', width: 100, align: 'right' as const },
  { title: '未税金额', dataIndex: 'sales_amount_excluded', key: 'sales_amount_excluded', width: 110, align: 'right' as const },
  { title: '税率(%)', dataIndex: 'tax_rate', key: 'tax_rate', width: 70, align: 'right' as const },

  // ========== 结算信息 ==========
  {
    title: '结算状态',
    dataIndex: 'settlement_status',
    key: 'settlement_status',
    width: 90,
    filters: settlementStatusFilters,
    onFilter: (value: string, record: ProfitReportItem) => (record.settlement_status || '未结算') === value,
    filterMultiple: true,
  },
  { title: '应收金额', dataIndex: 'receivable_amount', key: 'receivable_amount', width: 100, align: 'right' as const },
  { title: '已结算金额', dataIndex: 'received_amount', key: 'received_amount', width: 100, align: 'right' as const },
  { title: '待结算余额', dataIndex: 'balance_amount', key: 'balance_amount', width: 100, align: 'right' as const },
  { title: '最近核销日期', dataIndex: 'last_write_off_date', key: 'last_write_off_date', width: 110 },
  { title: '核销单号', dataIndex: 'last_write_off_number', key: 'last_write_off_number', width: 130 },
  { title: '核销次数', dataIndex: 'write_off_count', key: 'write_off_count', width: 80, align: 'right' as const },

  // ========== 出库成本 ==========
  { title: '成本单价(未税)', dataIndex: 'cost_unit_price_excluded', key: 'cost_unit_price_excluded', width: 110, align: 'right' as const },
  { title: '成本单价(含税)', dataIndex: 'cost_unit_price_included', key: 'cost_unit_price_included', width: 110, align: 'right' as const },
  { title: '成本金额(未税)', dataIndex: 'cost_amount_excluded', key: 'cost_amount_excluded', width: 110, align: 'right' as const },
  { title: '成本金额(含税)', dataIndex: 'cost_amount_included', key: 'cost_amount_included', width: 110, align: 'right' as const },

  // ========== 采购信息 ==========
  { title: '采购合同编号', dataIndex: 'purchase_contract_number', key: 'purchase_contract_number', width: 130 },
  { title: '采购员', dataIndex: 'purchase_person', key: 'purchase_person', width: 80 },
  { title: '入库日期', dataIndex: 'warehousing_date', key: 'warehousing_date', width: 100 },
  { title: '入库数量', dataIndex: 'warehousing_quantity', key: 'warehousing_quantity', width: 80, align: 'right' as const },
  { title: '入库单价（未税）', dataIndex: 'warehousing_unit_price_excluded', key: 'warehousing_unit_price_excluded', width: 120, align: 'right' as const },
  { title: '入库单价（含税）', dataIndex: 'warehousing_unit_price_included', key: 'warehousing_unit_price_included', width: 120, align: 'right' as const },
  { title: '入库金额（含税）', dataIndex: 'warehousing_amount_included', key: 'warehousing_amount_included', width: 120, align: 'right' as const },
  { title: '入库金额', dataIndex: 'warehousing_amount', key: 'warehousing_amount', width: 110, align: 'right' as const },

  // ========== 费用 ==========
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
  { title: '费用合计', dataIndex: 'total_expense', key: 'total_expense', width: 100, align: 'right' as const },

  // ========== 利润 ==========
  { title: '总成本', dataIndex: 'total_cost', key: 'total_cost', width: 110, align: 'right' as const },
  { title: '毛利', dataIndex: 'gross_profit', key: 'gross_profit', width: 110, align: 'right' as const },
  { title: '毛利率(%)', dataIndex: 'gross_profit_rate', key: 'gross_profit_rate', width: 90, align: 'right' as const },

  // ========== 汇率换算 ==========
  {
    title: '币种',
    dataIndex: 'currency',
    key: 'currency',
    width: 70,
    filters: currencyFilters.value,
    onFilter: (value: string, record: ProfitReportItem) => record.currency === value,
    filterMultiple: true,
  },
  { title: '银行汇率', dataIndex: 'bank_rate', key: 'bank_rate', width: 90, align: 'right' as const },
  { title: '海关汇率', dataIndex: 'customs_rate', key: 'customs_rate', width: 90, align: 'right' as const },
  { title: 'CNY销售额(银行,含税)', dataIndex: 'sales_amount_included_cny_bank', key: 'sales_amount_included_cny_bank', width: 150, align: 'right' as const },
  { title: 'CNY销售额(银行,未税)', dataIndex: 'sales_amount_excluded_cny_bank', key: 'sales_amount_excluded_cny_bank', width: 150, align: 'right' as const },
  { title: 'CNY销售额(海关,含税)', dataIndex: 'sales_amount_included_cny_customs', key: 'sales_amount_included_cny_customs', width: 150, align: 'right' as const },
  { title: 'CNY销售额(海关,未税)', dataIndex: 'sales_amount_excluded_cny_customs', key: 'sales_amount_excluded_cny_customs', width: 150, align: 'right' as const },
  { title: '汇率差(含税)', dataIndex: 'exchange_diff_included', key: 'exchange_diff_included', width: 110, align: 'right' as const },
  { title: '汇率差(未税)', dataIndex: 'exchange_diff_excluded', key: 'exchange_diff_excluded', width: 110, align: 'right' as const },

  // ========== 其他 ==========
  { title: '提成比例', dataIndex: 'commission_rate', key: 'commission_rate', width: 80, align: 'right' as const },
  { title: '应发提成', dataIndex: 'commission_amount', key: 'commission_amount', width: 100, align: 'right' as const },
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
  'unit_price', 'sales_amount_included', 'unit_price_excluded', 'sales_amount_excluded',
  'receivable_amount', 'received_amount', 'balance_amount',
  'cost_unit_price_excluded', 'cost_unit_price_included', 'cost_amount_excluded', 'cost_amount_included',
  'warehousing_unit_price_excluded', 'warehousing_unit_price_included', 'warehousing_amount', 'warehousing_amount_included',
  'po_expense_transportation', 'po_expense_operating', 'po_expense_vat', 'po_expense_handling', 'po_expense_other', 'po_expense_total',
  'sl_expense_transportation', 'sl_expense_handling', 'sl_expense_other', 'sl_expense_total',
  'wh_expense_tariff', 'wh_expense_transportation', 'wh_expense_customs', 'wh_expense_other', 'wh_expense_total',
  'dl_expense_express', 'dl_expense_transportation', 'dl_expense_customs', 'dl_expense_other', 'dl_expense_total',
  'total_expense', 'total_cost',
  'sales_amount_included_cny_bank', 'sales_amount_excluded_cny_bank',
  'sales_amount_included_cny_customs', 'sales_amount_excluded_cny_customs',
  'exchange_diff_included', 'exchange_diff_excluded',
  'commission_amount',
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
      acc.sales_amount_included += item.sales_amount_included || 0
      acc.sales_amount_excluded += item.sales_amount_excluded || 0
      acc.receivable_amount += item.receivable_amount || 0
      acc.received_amount += item.received_amount || 0
      acc.balance_amount += item.balance_amount || 0
      acc.cost_amount_excluded += item.cost_amount_excluded || 0
      acc.cost_amount_included += item.cost_amount_included || 0
      acc.warehousing_amount += item.warehousing_amount || 0
      acc.warehousing_amount_included += item.warehousing_amount_included || 0
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
      acc.total_expense += item.total_expense || 0
      acc.total_cost += item.total_cost || 0
      acc.gross_profit += item.gross_profit || 0
      acc.sales_amount_included_cny_bank += item.sales_amount_included_cny_bank || 0
      acc.sales_amount_excluded_cny_bank += item.sales_amount_excluded_cny_bank || 0
      acc.sales_amount_included_cny_customs += item.sales_amount_included_cny_customs || 0
      acc.sales_amount_excluded_cny_customs += item.sales_amount_excluded_cny_customs || 0
      acc.exchange_diff_included += item.exchange_diff_included || 0
      acc.exchange_diff_excluded += item.exchange_diff_excluded || 0
      acc.commission_amount += item.commission_amount || 0
      return acc
    },
    {
      sales_amount_included: 0,
      sales_amount_excluded: 0,
      receivable_amount: 0,
      received_amount: 0,
      balance_amount: 0,
      cost_amount_excluded: 0,
      cost_amount_included: 0,
      warehousing_amount: 0,
      warehousing_amount_included: 0,
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
      total_expense: 0,
      total_cost: 0,
      gross_profit: 0,
      sales_amount_included_cny_bank: 0,
      sales_amount_excluded_cny_bank: 0,
      sales_amount_included_cny_customs: 0,
      sales_amount_excluded_cny_customs: 0,
      exchange_diff_included: 0,
      exchange_diff_excluded: 0,
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

const handleExport = async () => {
  exportLoading.value = true
  try {
    const params: ProfitReportParams = { ...searchParams }
    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      params.startDate = dateRange.value[0].format('YYYY-MM-DD')
      params.endDate = dateRange.value[1].format('YYYY-MM-DD')
    }
    // 获取所有数据（不分页）
    params.page = 1
    params.pageSize = 99999
    const res = await profitReportApi.getReport(params)
    const allData = res.data || []

    if (allData.length === 0) {
      message.warning('没有可导出的数据')
      return
    }

    const exportColumns: ExportColumn[] = visibleColumns.value.map(col => ({
      key: col.dataIndex || col.key,
      title: col.title,
      formatter: col.key === 'delivery_date' || col.key === 'last_write_off_date' || col.key === 'warehousing_date'
        ? (value: any) => value ? formatDate(value) : ''
        : col.key === 'bank_rate' || col.key === 'customs_rate'
        ? (value: any) => value ? value.toFixed(6) : ''
        : col.key === 'gross_profit_rate'
        ? (value: any) => value !== null && value !== undefined ? value.toFixed(2) + '%' : ''
        : undefined,
    }))

    exportToExcel({
      filename: '毛利表',
      columns: exportColumns,
      data: allData,
      sheetName: '毛利表',
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