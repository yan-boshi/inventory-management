<template>
  <div class="receivables-container">
    <div class="header">
      <h1>应收账款</h1>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="客户名称">
            <a-input
              v-model:value="searchParams.customer_name"
              placeholder="请输入客户名称"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="结算状态">
            <a-select
              v-model:value="searchParams.status"
              placeholder="请选择状态"
              allow-clear
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
        :data-source="receivables"
        :loading="loading"
        :pagination="false"
        rowKey="receivable_id"
        :scroll="{ y: 'calc(100vh - 300px)' }"
        bordered
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'source_bill_type'">
            <a-tag :color="record.source_bill_type === 1 ? 'blue' : 'orange'">
              {{ record.source_bill_type === 1 ? '出库单' : '销售退货单' }}
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

          <template v-else-if="column.key === 'delivery_time'">
            {{ formatDate(record.delivery_time) }}
          </template>

          <template v-else-if="column.key === 'create_time'">
            {{ formatDate(record.create_time) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="primary" size="small" @click="handleSave(record)" :loading="record._saving">
                保存
              </a-button>
              <a-button type="link" size="small" @click="handleViewDetail(record)"> 详情 </a-button>
            </a-space>
          </template>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { receivablesApi } from '@/api/receivables'
import type { Receivable, ReceivableQueryParams } from '@/types'
import { formatDate } from '@/utils/date'
import dayjs from 'dayjs'

const receivables = ref<Receivable[]>([])
const loading = ref(false)
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

const searchParams = reactive<ReceivableQueryParams>({
  page: 1,
  pageSize: 100,
  customer_name: '',
  status: undefined,
  billing_status: undefined,
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
    title: '客户名称',
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 150,
  },
  {
    title: '来源单据',
    dataIndex: 'source_bill_type',
    key: 'source_bill_type',
    width: 100,
  },
  {
    title: '来源单据编号',
    dataIndex: 'source_bill_id',
    key: 'source_bill_id',
    width: 150,
  },
  {
    title: '应收金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 110,
    align: 'right',
  },
  {
    title: '已收金额',
    dataIndex: 'received_amount',
    key: 'received_amount',
    width: 110,
    align: 'right',
  },
  {
    title: '未收余额',
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
  },
  {
    title: '开票状态',
    dataIndex: 'billing_status',
    key: 'billing_status',
    width: 100,
    align: 'center',
  },
  {
    title: '结算日期',
    dataIndex: 'due_date',
    key: 'due_date',
    width: 110,
  },
  {
    title: '出库时间',
    dataIndex: 'delivery_time',
    key: 'delivery_time',
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

const fetchReceivables = async () => {
  loading.value = true
  try {
    const params: ReceivableQueryParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }

    if (searchParams.customer_name) {
      params.customer_name = searchParams.customer_name
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

    const res = await receivablesApi.getAll(params)
    receivables.value = (res.data || []).map((item: any) => ({
      ...item,
      _due_date: item.due_date ? dayjs(item.due_date) : null,
      _saving: false,
    }))
    pagination.total = res.pagination?.total || 0
  } catch (error: any) {
    message.error(error.message || '获取应收账款列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchReceivables()
}

const handleReset = () => {
  searchParams.customer_name = ''
  searchParams.status = undefined
  searchParams.billing_status = undefined
  searchParams.start_date = ''
  searchParams.end_date = ''
  dateRange.value = null
  pagination.current = 1
  fetchReceivables()
}

const handlePageChange = (page: number, pageSize: number) => {
  pagination.current = page
  pagination.pageSize = pageSize
  fetchReceivables()
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
    await receivablesApi.update(record.receivable_id, {
      received_amount: record.received_amount,
      balance_amount: record.balance_amount,
      status: record.status,
      due_date: record.due_date || null,
    })
    message.success('保存成功')
  } catch (error: any) {
    message.error(error.message || '保存失败')
  } finally {
    record._saving = false
  }
}

const handleViewDetail = (record: Receivable) => {
  // TODO: 实现详情查看功能
  message.info('详情功能开发中')
}

onMounted(() => {
  fetchReceivables()
})
</script>

<style scoped>
.receivables-container {
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
</style>
