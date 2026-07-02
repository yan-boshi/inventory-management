<template>
  <div class="warehousing-expense-report-container">
    <div class="header">
      <h1>入库明细表</h1>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="入库时间">
            <a-range-picker
              v-model:value="dateRange"
              format="YYYY-MM-DD"
              :placeholder="['开始日期', '结束日期']"
              style="width: 240px"
            />
          </a-form-item>

          <a-form-item label="入库单号">
            <a-input
              v-model:value="searchParams.orderNumber"
              placeholder="请输入入库单号"
              allowClear
              style="width: 160px"
            />
          </a-form-item>

          <a-form-item label="采购合同编号">
            <a-input
              v-model:value="searchParams.contractNumber"
              placeholder="请输入采购合同编号"
              allowClear
              style="width: 160px"
            />
          </a-form-item>

          <a-form-item label="商品关键字">
            <a-input
              v-model:value="searchParams.productKeyword"
              placeholder="商品名称/编码"
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
              <ColumnConfig v-model:columns="allColumns" cacheKey="warehousingExpenseReport" />
              <a-button @click="handlePrint" :disabled="reportData.length === 0">
                <template #icon><PrinterOutlined /></template>
                打印
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="filteredColumns"
        :data-source="reportData"
        :loading="loading"
        :pagination="false"
        rowKey="warehousing_order_id"
        bordered
        size="small"
        :scroll="{ x: 2600 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'warehousing_time'">
            {{ formatDate(record.warehousing_time) }}
          </template>
          <template v-else-if="column.key === 'quantity'">
            {{ formatNumber(record.quantity) }}
          </template>
          <template v-else-if="column.key === 'tax_included_price'">
            {{ formatMoney(record.tax_included_price) }}
          </template>
          <template v-else-if="column.key === 'total_price'">
            {{ formatMoney(record.total_price) }}
          </template>
          <template v-else-if="column.key === 'express_delivery_fee'">
            {{ formatMoney(record.express_delivery_fee) }}
          </template>
          <template v-else-if="column.key === 'transportation_fee'">
            {{ formatMoney(record.transportation_fee) }}
          </template>
          <template v-else-if="column.key === 'customs_fee'">
            {{ formatMoney(record.customs_fee) }}
          </template>
          <template v-else-if="column.key === 'warehousing_other_fee'">
            {{ formatMoney(record.warehousing_other_fee) }}
          </template>
          <template v-else-if="column.key === 'warehousing_expense_subtotal'">
            <strong>{{ formatMoney(record.warehousing_expense_subtotal) }}</strong>
          </template>
          <template v-else-if="column.key === 'purchase_transportation_fee'">
            {{ formatMoney(record.purchase_transportation_fee) }}
          </template>
          <template v-else-if="column.key === 'purchase_entertainment_fee'">
            {{ formatMoney(record.purchase_entertainment_fee) }}
          </template>
          <template v-else-if="column.key === 'purchase_gift_fee'">
            {{ formatMoney(record.purchase_gift_fee) }}
          </template>
          <template v-else-if="column.key === 'purchase_other_fee'">
            {{ formatMoney(record.purchase_other_fee) }}
          </template>
          <template v-else-if="column.key === 'purchase_expense_subtotal'">
            <strong>{{ formatMoney(record.purchase_expense_subtotal) }}</strong>
          </template>
          <template v-else-if="column.key === 'total_expenses'">
            <span style="color: #f5222d; font-weight: bold">{{
              formatMoney(record.total_expenses)
            }}</span>
          </template>
        </template>

        <template #summary v-if="reportData.length > 0">
          <a-table-summary>
            <a-table-summary-row>
              <a-table-summary-cell :index="0" :colSpan="11" :align="'right'">
                <strong>合计</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="11" :align="'right'">
                <strong>{{ formatMoney(totals.total_price) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="12" :align="'right'">
                {{ formatMoney(totals.express_delivery_fee) }}
              </a-table-summary-cell>
              <a-table-summary-cell :index="13" :align="'right'">
                {{ formatMoney(totals.transportation_fee) }}
              </a-table-summary-cell>
              <a-table-summary-cell :index="14" :align="'right'">
                {{ formatMoney(totals.customs_fee) }}
              </a-table-summary-cell>
              <a-table-summary-cell :index="15" :align="'right'">
                {{ formatMoney(totals.warehousing_other_fee) }}
              </a-table-summary-cell>
              <a-table-summary-cell :index="16" :align="'right'">
                <strong>{{ formatMoney(totals.warehousing_expense_subtotal) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="17" :align="'right'">
                {{ formatMoney(totals.purchase_transportation_fee) }}
              </a-table-summary-cell>
              <a-table-summary-cell :index="18" :align="'right'">
                {{ formatMoney(totals.purchase_entertainment_fee) }}
              </a-table-summary-cell>
              <a-table-summary-cell :index="19" :align="'right'">
                {{ formatMoney(totals.purchase_gift_fee) }}
              </a-table-summary-cell>
              <a-table-summary-cell :index="20" :align="'right'">
                {{ formatMoney(totals.purchase_other_fee) }}
              </a-table-summary-cell>
              <a-table-summary-cell :index="21" :align="'right'">
                <strong>{{ formatMoney(totals.purchase_expense_subtotal) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="22" :align="'right'">
                <span style="color: #f5222d; font-weight: bold">{{
                  formatMoney(totals.total_expenses)
                }}</span>
              </a-table-summary-cell>
              <a-table-summary-cell :index="23" :colSpan="2" />
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
        :page-size-options="['10', '20', '50', '100']"
        style="margin-top: 16px; text-align: right"
        @change="handlePageChange"
        @showSizeChange="handlePageChange"
      />
    </a-card>

    <WarehousingExpenseReportPrint
      v-model:visible="printVisible"
      :data="reportData"
      :search-params="searchParams"
      :visible-columns="visibleColumns.map(col => col.key)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  SearchOutlined,
  ReloadOutlined,
  PrinterOutlined,
} from '@ant-design/icons-vue'
import { warehousingExpenseReportApi } from '@/api/warehousingExpenseReport'
import WarehousingExpenseReportPrint from '@/components/WarehousingExpenseReportPrint.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import type { WarehousingExpenseReportItem, WarehousingExpenseReportParams } from '@/types'
import type { Dayjs } from 'dayjs'

const loading = ref(false)
const reportData = ref<WarehousingExpenseReportItem[]>([])
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const printVisible = ref(false)

const searchParams = reactive<WarehousingExpenseReportParams>({
  startDate: undefined,
  endDate: undefined,
  orderNumber: undefined,
  contractNumber: undefined,
  productKeyword: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 计算同一入库单号的行合并信息，返回 recordIndex 对应的 rowSpan（0 表示被合并隐藏）
const getMergeRowSpan = (_record: WarehousingExpenseReportItem, recordIndex: number): number => {
  const data = reportData.value
  if (!data.length) return 1
  const orderNo = data[recordIndex].order_number
  // 向前查找，找到该入库单号连续区间的起始位置
  let start = recordIndex
  while (start > 0 && data[start - 1].order_number === orderNo) {
    start--
  }
  if (start !== recordIndex) return 0 // 不是第一行，隐藏
  // 统计连续相同入库单号的行数
  let count = 1
  while (start + count < data.length && data[start + count].order_number === orderNo) {
    count++
  }
  return count
}

const columns = [
  {
    title: '入库单号',
    dataIndex: 'order_number',
    key: 'order_number',
    width: 160,
    fixed: 'left' as const,
    customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
  },
  {
    title: '入库时间',
    dataIndex: 'warehousing_time',
    key: 'warehousing_time',
    width: 110,
    fixed: 'left' as const,
    customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
  },
  {
    title: '采购合同编号',
    dataIndex: 'contract_number',
    key: 'contract_number',
    width: 160,
    customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
  },
  { title: '商品编码', dataIndex: 'product_code', key: 'product_code', width: 120 },
  { title: '商品名称', dataIndex: 'product_name', key: 'product_name', width: 150 },
  { title: '规格型号', dataIndex: 'model', key: 'model', width: 100 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 60, align: 'center' as const },
  { title: '入库数量', dataIndex: 'quantity', key: 'quantity', width: 90, align: 'right' as const },
  {
    title: '含税单价',
    dataIndex: 'tax_included_price',
    key: 'tax_included_price',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '含税金额',
    dataIndex: 'total_price',
    key: 'total_price',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '入库费用',
    children: [
      {
        title: '快递费',
        dataIndex: 'express_delivery_fee',
        key: 'express_delivery_fee',
        width: 90,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
      {
        title: '运杂费',
        dataIndex: 'transportation_fee',
        key: 'transportation_fee',
        width: 90,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
      {
        title: '报关费',
        dataIndex: 'customs_fee',
        key: 'customs_fee',
        width: 90,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
      {
        title: '其他',
        dataIndex: 'warehousing_other_fee',
        key: 'warehousing_other_fee',
        width: 80,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
      {
        title: '小计',
        dataIndex: 'warehousing_expense_subtotal',
        key: 'warehousing_expense_subtotal',
        width: 100,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
    ],
  },
  {
    title: '采购费用',
    children: [
      {
        title: '交通费',
        dataIndex: 'purchase_transportation_fee',
        key: 'purchase_transportation_fee',
        width: 90,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
      {
        title: '招待费',
        dataIndex: 'purchase_entertainment_fee',
        key: 'purchase_entertainment_fee',
        width: 90,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
      {
        title: '礼品费',
        dataIndex: 'purchase_gift_fee',
        key: 'purchase_gift_fee',
        width: 90,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
      {
        title: '其他',
        dataIndex: 'purchase_other_fee',
        key: 'purchase_other_fee',
        width: 80,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
      {
        title: '小计',
        dataIndex: 'purchase_expense_subtotal',
        key: 'purchase_expense_subtotal',
        width: 100,
        align: 'right' as const,
        customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
      },
    ],
  },
  {
    title: '费用合计',
    dataIndex: 'total_expenses',
    key: 'total_expenses',
    width: 110,
    align: 'right' as const,
    customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
  },
  {
    title: '入库人',
    dataIndex: 'warehousing_person',
    key: 'warehousing_person',
    width: 80,
    customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
  },
  {
    title: '备注',
    dataIndex: 'remarks',
    key: 'remarks',
    width: 120,
    customCell: (_: any, index: number) => ({ rowSpan: getMergeRowSpan(_, index) }),
  },
]

// 列配置（带序号列）
const allColumns = ref([
  {
    title: '序号',
    key: 'index',
    width: 60,
    align: 'center' as const,
    fixed: 'left' as const,
    customRender: ({ index }: { index: number }) => index + 1,
  },
  ...columns.map(col => ({
    ...col,
    visible: true,
  })),
])

// 获取可见的列（带分组）
const visibleColumns = computed(() => {
  return allColumns.value.filter(col => col.visible !== false)
})

const filteredColumns = computed(() => {
  const result: any[] = []
  const visible = visibleColumns.value

  visible.forEach(col => {
    if (col.key === 'index') {
      result.push(col)
    } else if (!col.children) {
      result.push(col)
    } else {
      // 处理分组列
      const visibleChildren = col.children.filter((c: any) => {
        const allCol = allColumns.value.find(ac => ac.key === c.key)
        return allCol ? allCol.visible !== false : true
      })
      if (visibleChildren.length > 0) {
        result.push({
          ...col,
          children: visibleChildren,
        })
      }
    }
  })

  return result
})

// 汇总计算
const totals = computed(() => {
  return reportData.value.reduce(
    (acc, item) => {
      acc.total_price += item.total_price || 0
      acc.express_delivery_fee += item.express_delivery_fee || 0
      acc.transportation_fee += item.transportation_fee || 0
      acc.customs_fee += item.customs_fee || 0
      acc.warehousing_other_fee += item.warehousing_other_fee || 0
      acc.warehousing_expense_subtotal += item.warehousing_expense_subtotal || 0
      acc.purchase_transportation_fee += item.purchase_transportation_fee || 0
      acc.purchase_entertainment_fee += item.purchase_entertainment_fee || 0
      acc.purchase_gift_fee += item.purchase_gift_fee || 0
      acc.purchase_other_fee += item.purchase_other_fee || 0
      acc.purchase_expense_subtotal += item.purchase_expense_subtotal || 0
      acc.total_expenses += item.total_expenses || 0
      return acc
    },
    {
      total_price: 0,
      express_delivery_fee: 0,
      transportation_fee: 0,
      customs_fee: 0,
      warehousing_other_fee: 0,
      warehousing_expense_subtotal: 0,
      purchase_transportation_fee: 0,
      purchase_entertainment_fee: 0,
      purchase_gift_fee: 0,
      purchase_other_fee: 0,
      purchase_expense_subtotal: 0,
      total_expenses: 0,
    }
  )
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return dateStr.substring(0, 10)
}

const formatNumber = (value: number) => {
  return value != null ? value.toLocaleString('zh-CN', { maximumFractionDigits: 4 }) : '0'
}

const formatMoney = (value: number) => {
  return value != null
    ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
}

const fetchReport = async () => {
  loading.value = true
  try {
    const params: WarehousingExpenseReportParams = { ...searchParams }
    if (dateRange.value) {
      params.startDate = dateRange.value[0].format('YYYY-MM-DD')
      params.endDate = dateRange.value[1].format('YYYY-MM-DD')
    }
    const response = await warehousingExpenseReportApi.getReport(params)
    reportData.value = response.data || []
    pagination.total = reportData.value.length
  } catch (error) {
    message.error('获取报表数据失败')
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
  searchParams.orderNumber = undefined
  searchParams.purchaseOrderNumber = undefined
  searchParams.productKeyword = undefined
  pagination.current = 1
  fetchReport()
}

const handlePageChange = (page: number, pageSize: number) => {
  pagination.current = page
  pagination.pageSize = pageSize
}

const handlePrint = () => {
  printVisible.value = true
}

onMounted(() => {
  fetchReport()
})
</script>

<style scoped>
.warehousing-expense-report-container {
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
</style>
