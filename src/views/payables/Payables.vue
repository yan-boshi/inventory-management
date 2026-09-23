<template>
  <div class="payables-container">
    <div class="header">
      <h1>应付账款</h1>
    </div>

    <a-card>
      <div class="action-bar">
        <a-button
          type="primary"
          :disabled="selectedRowKeys.length === 0"
          @click="handleGenerateStatement"
        >
          <template #icon><FileTextOutlined /></template>
          生成应付对账单
        </a-button>
        <a-button
          style="margin-left: 8px"
          :disabled="selectedRowKeys.length === 0"
          @click="handleGenerateWriteOff"
        >
          <template #icon><AuditOutlined /></template>
          生成应付核销单
        </a-button>
        <span v-if="selectedRowKeys.length > 0" class="selected-count">
          已选择 {{ selectedRowKeys.length }} 项
        </span>
      </div>

      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="供应商名称">
            <a-input
              v-model:value="searchParams.supplier_name"
              placeholder="请输入供应商名称"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="结算状态">
            <a-select
              v-model:value="searchParams.status"
              placeholder="请选择状态"
              allow-clear
              mode="multiple"
              :max-tag-count="2"
            >
              <a-select-option :value="0">未结算</a-select-option>
              <a-select-option :value="1">部分结算</a-select-option>
              <a-select-option :value="2">已结算</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="开票状态">
            <a-select
              v-model:value="searchParams.billing_status"
              placeholder="请选择状态"
              allow-clear
              mode="multiple"
              :max-tag-count="2"
            >
              <a-select-option :value="0">未开票</a-select-option>
              <a-select-option :value="1">已开票</a-select-option>
              <a-select-option :value="2">部分开票</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="结算日期">
            <a-range-picker
              v-model:value="dateRange"
              format="YYYY-MM-DD"
              :placeholder="['开始日期', '结束日期']"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch">
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
        :data-source="payables"
        :loading="loading"
        :pagination="false"
        rowKey="payable_id"
        :scroll="{ y: 'calc(100vh - 300px)' }"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
        bordered
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'source_bill_type'">
            <a-tag :color="record.source_bill_type === 1 ? 'blue' : 'orange'">
              {{ record.source_bill_type === 1 ? '入库单' : '采购退货单' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'billing_status'">
            <a-tag :color="getBillingStatusColor(record.billing_status)">
              {{ getBillingStatusText(record.billing_status) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'amount'">
            {{ formatMoney(record.amount) }}
          </template>

          <template v-else-if="column.key === 'received_amount'">
            <a-input-number
              v-model:value="record.received_amount"
              :min="0"
              :precision="2"
              style="width: 100%"
              size="small"
              @change="() => handleReceivedAmountChange(record)"
            />
          </template>

          <template v-else-if="column.key === 'balance_amount'">
            <span
              :style="{
                color: record.balance_amount > 0 ? '#f5222d' : '#52c41a',
                fontWeight: 'bold',
              }"
            >
              {{ formatMoney(record.balance_amount) }}
            </span>
          </template>

          <template v-else-if="column.key === 'handling_fee'">
            {{ formatMoney(record.handling_fee) }}
          </template>

          <template v-else-if="column.key === 'status'">
            <a-select
              v-model:value="record.status"
              style="width: 100%"
              size="small"
            >
              <a-select-option :value="0">未结算</a-select-option>
              <a-select-option :value="1">部分结算</a-select-option>
              <a-select-option :value="2">已结算</a-select-option>
            </a-select>
          </template>

          <template v-else-if="column.key === 'due_date'">
            <a-date-picker
              v-model:value="record._due_date"
              format="YYYY-MM-DD"
              style="width: 100%"
              size="small"
              :allowClear="true"
              @change="(date: any) => { record.due_date = date ? date.format('YYYY-MM-DD') : null }"
            />
          </template>

          <template v-else-if="column.key === 'warehousing_time'">
            {{ formatDate(record.warehousing_time) }}
          </template>

          <template v-else-if="column.key === 'create_time'">
            {{ formatDate(record.create_time) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="primary" size="small" @click="handleSave(record)" :loading="record._saving">
                保存
              </a-button>
              <a-popconfirm
                v-if="userStore.isAdmin"
                title="确定删除该记录吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDeleteRecord(record)"
              >
                <a-button type="link" danger size="small"> 删除 </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>

        <template #summary>
          <a-table-summary>
            <a-table-summary-row>
              <a-table-summary-cell :index="0" />
              <a-table-summary-cell :index="1" :colSpan="3" align="right">
                <strong>合计</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="4" align="right">
                <strong>{{ formatMoney(pageTotals.amount) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="5" align="right">
                <strong>{{ formatMoney(pageTotals.received_amount) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="6" align="right">
                <strong>{{ formatMoney(pageTotals.balance_amount) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="7" align="right">
                <strong>{{ formatMoney(pageTotals.handling_fee) }}</strong>
              </a-table-summary-cell>
              <a-table-summary-cell :index="8" :colSpan="5" />
            </a-table-summary-row>
          </a-table-summary>
        </template>

        <template #customFilterDropdown="{ setSelectedKeys, selectedKeys, confirm, clearFilters, column }">
          <div style="padding: 8px">
            <a-input
              :placeholder="`搜索${column.title}`"
              :value="selectedKeys[0]"
              style="width: 188px; margin-bottom: 8px; display: block"
              @change="(e: any) => setSelectedKeys(e.target.value ? [e.target.value] : [])"
              @pressEnter="confirm()"
            />
            <a-button type="primary" size="small" style="width: 90px; margin-right: 8px" @click="confirm()">
              搜索
            </a-button>
            <a-button size="small" style="width: 90px" @click="clearFilters?.()">重置</a-button>
          </div>
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

    <SettlementFormModal
      v-model:visible="statementModalVisible"
      :type="2"
      :pre-selected-records="selectedRecords"
      @success="handleStatementSuccess"
    />

    <WriteOffFormModal
      v-model:visible="writeOffModalVisible"
      :type="2"
      :pre-selected-records="selectedRecords"
      @success="handleWriteOffSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, FileTextOutlined, AuditOutlined } from '@ant-design/icons-vue'
import { payablesApi } from '@/api/payables'
import { useUserStore } from '@/stores/user'
import SettlementFormModal from '@/views/settlement/SettlementFormModal.vue'
import WriteOffFormModal from '@/views/write-off/WriteOffFormModal.vue'
import type { Payable, PayableQueryParams } from '@/types'
import { formatDate } from '@/utils/date'
import dayjs from 'dayjs'

const payables = ref<Payable[]>([])
const loading = ref(false)
const userStore = useUserStore()
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
const selectedRowKeys = ref<string[]>([])
const selectedRecords = ref<Payable[]>([])
const statementModalVisible = ref(false)
const writeOffModalVisible = ref(false)

const searchParams = reactive<PayableQueryParams>({
  page: 1,
  pageSize: 100,
  supplier_name: '',
  status: undefined,
  billing_status: [0, 2], // 默认查询未开票和部分开票
  start_date: '',
  end_date: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 100,
  total: 0,
})

const columns = [
  {
    title: '供应商名称',
    dataIndex: 'supplier_name',
    key: 'supplier_name',
    width: 150,
    customFilterDropdown: true,
    onFilter: (value: string, record: Payable) =>
      (record.supplier_name || '').toLowerCase().includes(value.toLowerCase()),
  },
  {
    title: '来源单据',
    dataIndex: 'source_bill_type',
    key: 'source_bill_type',
    width: 100,
    filters: [
      { text: '入库单', value: 1 },
      { text: '采购退货单', value: 2 },
    ],
    onFilter: (value: number, record: Payable) => record.source_bill_type === value,
  },
  {
    title: '来源单据编号',
    dataIndex: 'source_bill_id',
    key: 'source_bill_id',
    width: 150,
  },
  {
    title: '应付金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 110,
    align: 'right',
  },
  {
    title: '已付金额',
    dataIndex: 'received_amount',
    key: 'received_amount',
    width: 110,
    align: 'right',
  },
  {
    title: '未付余额',
    dataIndex: 'balance_amount',
    key: 'balance_amount',
    width: 110,
    align: 'right',
  },
  {
    title: '手续费',
    dataIndex: 'handling_fee',
    key: 'handling_fee',
    width: 130,
    align: 'right',
  },
  {
    title: '结算状态',
    dataIndex: 'status',
    key: 'status',
    width: 90,
    align: 'center',
    filters: [
      { text: '未结算', value: 0 },
      { text: '部分结算', value: 1 },
      { text: '已结算', value: 2 },
    ],
    onFilter: (value: number, record: Payable) => record.status === value,
  },
  {
    title: '开票状态',
    dataIndex: 'billing_status',
    key: 'billing_status',
    width: 100,
    align: 'center',
    filters: [
      { text: '未开票', value: 0 },
      { text: '已开票', value: 1 },
      { text: '部分开票', value: 2 },
    ],
    onFilter: (value: number, record: Payable) => record.billing_status === value,
  },
  {
    title: '结算日期',
    dataIndex: 'due_date',
    key: 'due_date',
    width: 110,
  },
  {
    title: '入库时间',
    dataIndex: 'warehousing_time',
    key: 'warehousing_time',
    width: 160,
  },
  {
    title: '创建时间',
    dataIndex: 'create_time',
    key: 'create_time',
    width: 160,
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    fixed: 'right',
  },
]

const getStatusColor = (status: number) => {
  switch (status) {
    case 0:
      return 'default'
    case 1:
      return 'orange'
    case 2:
      return 'green'
    default:
      return 'default'
  }
}

const getStatusText = (status: number) => {
  switch (status) {
    case 0:
      return '未结算'
    case 1:
      return '部分结算'
    case 2:
      return '已结算'
    default:
      return '未知'
  }
}

const getBillingStatusColor = (status: number) => {
  switch (status) {
    case 0:
      return 'default'
    case 1:
      return 'green'
    case 2:
      return 'orange'
    default:
      return 'default'
  }
}

const getBillingStatusText = (status: number) => {
  switch (status) {
    case 0:
      return '未开票'
    case 1:
      return '已开票'
    case 2:
      return '部分开票'
    default:
      return '未知'
  }
}

const formatMoney = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '0.0000'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

const pageTotals = computed(() => {
  return payables.value.reduce(
    (totals, item) => {
      totals.amount += Number(item.amount) || 0
      totals.received_amount += Number(item.received_amount) || 0
      totals.balance_amount += Number(item.balance_amount) || 0
      totals.handling_fee += Number(item.handling_fee) || 0
      return totals
    },
    { amount: 0, received_amount: 0, balance_amount: 0, handling_fee: 0 }
  )
})

const fetchPayables = async () => {
  loading.value = true
  try {
    const params: PayableQueryParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }

    if (searchParams.supplier_name) {
      params.supplier_name = searchParams.supplier_name
    }

    if (searchParams.status !== undefined && searchParams.status !== null) {
      params.status = searchParams.status
    }

    if (searchParams.billing_status !== undefined && searchParams.billing_status !== null) {
      params.billing_status = searchParams.billing_status
    }

    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      params.start_date = dateRange.value[0].format('YYYY-MM-DD')
      params.end_date = dateRange.value[1].format('YYYY-MM-DD')
    }

    const res = await payablesApi.getAll(params)
    payables.value = (res.data || []).map((item: any) => ({
      ...item,
      _due_date: item.due_date ? dayjs(item.due_date) : null,
      _saving: false,
    }))
    pagination.total = res.pagination?.total || 0
  } catch (error: any) {
    message.error(error.message || '获取应付账款列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchPayables()
}

const handleReset = () => {
  searchParams.supplier_name = ''
  searchParams.status = undefined
  searchParams.billing_status = [0, 2] // 默认查询未开票和部分开票
  searchParams.start_date = ''
  searchParams.end_date = ''
  dateRange.value = null
  pagination.current = 1
  fetchPayables()
}

const handlePageChange = (page: number, pageSize: number) => {
  pagination.current = page
  pagination.pageSize = pageSize
  fetchPayables()
}

const handleReceivedAmountChange = (record: any) => {
  const amount = Number(record.amount) || 0
  const received = Number(record.received_amount) || 0
  record.balance_amount = parseFloat((amount - received).toFixed(2))
  // 自动更新结算状态
  if (received <= 0) {
    record.status = 0
  } else if (received >= amount) {
    record.status = 2
  } else {
    record.status = 1
  }
}

const handleSave = async (record: any) => {
  record._saving = true
  try {
    await payablesApi.update(record.payable_id, {
      received_amount: record.received_amount,
      balance_amount: record.balance_amount,
      status: record.status,
      due_date: record._due_date ? record._due_date.format('YYYY-MM-DD') : null,
    })
    message.success('保存成功')
  } catch (error: any) {
    message.error(error.message || '保存失败')
  } finally {
    record._saving = false
  }
}

const onSelectChange = (keys: string[], rows: Payable[]) => {
  selectedRowKeys.value = keys
  selectedRecords.value = rows
}

const handleGenerateStatement = () => {
  if (selectedRecords.value.length === 0) {
    message.warning('请先选择要生成对账单的记录')
    return
  }

  // 检查是否都是同一供应商
  const supplierIds = [...new Set(selectedRecords.value.map(r => r.supplier_id))]
  if (supplierIds.length > 1) {
    message.warning('请选择同一供应商的记录生成对账单')
    return
  }

  // 检查是否包含入库单类型的记录
  const hasWarehousingOrders = selectedRecords.value.some(r => r.source_bill_type === 1)
  if (!hasWarehousingOrders) {
    message.warning('请选择包含入库单的记录')
    return
  }

  statementModalVisible.value = true
}

const handleStatementSuccess = () => {
  statementModalVisible.value = false
  selectedRowKeys.value = []
  selectedRecords.value = []
  fetchPayables()
}

const handleGenerateWriteOff = () => {
  if (selectedRecords.value.length === 0) {
    message.warning('请先选择要生成核销单的记录')
    return
  }

  // 检查是否都是同一供应商
  const supplierIds = [...new Set(selectedRecords.value.map(r => r.supplier_id))]
  if (supplierIds.length > 1) {
    message.warning('请选择同一供应商的记录生成核销单')
    return
  }

  // 检查是否全部已结算
  const unsettledRecords = selectedRecords.value.filter(r => r.status !== 2)
  if (unsettledRecords.length === 0) {
    message.warning('所选记录均已结算，无法核销')
    return
  }

  writeOffModalVisible.value = true
}

const handleWriteOffSuccess = () => {
  writeOffModalVisible.value = false
  selectedRowKeys.value = []
  selectedRecords.value = []
  fetchPayables()
}

const handleDeleteRecord = async (record: Payable) => {
  try {
    await payablesApi.delete(record.payable_id)
    message.success('删除成功')
    fetchPayables()
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  fetchPayables()
})
</script>

<style scoped>
.payables-container {
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

.action-bar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.selected-count {
  color: #666;
  font-size: 14px;
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

  :deep(.ant-select-multiple) {
    width: 240px;
  }
}
</style>
