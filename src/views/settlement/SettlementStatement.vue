<template>
  <div class="settlement-container">
    <div class="header">
      <h1>对账单</h1>
      <a-space>
        <a-button type="primary" @click="handleCreateReceivable">
          <template #icon><PlusOutlined /></template>
          新增应收对账单
        </a-button>
        <a-button type="primary" @click="handleCreatePayable" style="background-color: #fa8c16; border-color: #fa8c16;">
          <template #icon><PlusOutlined /></template>
          新增应付对账单
        </a-button>
      </a-space>
    </div>

    <!-- 新增/编辑对账单弹窗 -->
    <SettlementFormModal
      v-model:visible="formModalVisible"
      :type="formModalType"
      :settlement-id="formModalSettlementId"
      @success="handleFormSuccess"
    />

    <!-- 汇总卡片 -->
    <a-row :gutter="16" class="summary-cards">
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="应收总额"
            :value="summary.total_receivable"
            :precision="2"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>¥</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="应付总额"
            :value="summary.total_payable"
            :precision="2"
            :value-style="{ color: '#fa8c16' }"
          >
            <template #prefix>¥</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="净额"
            :value="summary.net_amount"
            :precision="2"
            :value-style="{ color: summary.net_amount >= 0 ? '#52c41a' : '#f5222d' }"
          >
            <template #prefix>¥</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="已开票应收"
            :value="summary.invoiced_receivable"
            :precision="2"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix>¥</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="未开票应收"
            :value="summary.uninvoiced_receivable"
            :precision="2"
            :value-style="{ color: '#f5222d' }"
          >
            <template #prefix>¥</template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 筛选区 -->
    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="类型">
            <a-select
              v-model:value="searchParams.type"
              placeholder="请选择类型"
              allow-clear
              style="width: 150px"
            >
              <a-select-option :value="1">应收</a-select-option>
              <a-select-option :value="2">应付</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="结算日期">
            <a-range-picker
              v-model:value="settlementDateRange"
              :mode="['month', 'month']"
              format="YYYY-MM"
              :placeholder="['开始月份', '结束月份']"
              style="width: 220px"
            />
          </a-form-item>

          <a-form-item label="客户/供应商">
            <a-input
              v-model:value="searchParams.entity_name"
              placeholder="请输入名称"
              allow-clear
              style="width: 180px"
            />
          </a-form-item>

          <a-form-item label="开票状态">
            <a-select
              v-model:value="searchParams.billing_status"
              placeholder="请选择状态"
              allow-clear
              style="width: 150px"
            >
              <a-select-option :value="0">未开票</a-select-option>
              <a-select-option :value="1">已开票</a-select-option>
              <a-select-option :value="2">部分开票</a-select-option>
            </a-select>
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

      <!-- 列表 -->
      <a-table
        v-scroll-topbar
        :columns="columns"
        :data-source="settlementList"
        :loading="loading"
        :pagination="false"
        rowKey="statement_id"
        :scroll="{ y: 'calc(100vh - 400px)' }"
        bordered
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag :color="record.type === 1 ? 'blue' : 'orange'">
              {{ record.type === 1 ? '应收' : '应付' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'billing_status'">
            <a-tag :color="record.billing_status === 1 ? 'green' : record.billing_status === 2 ? 'orange' : 'default'">
              {{ record.billing_status === 1 ? '已开票' : record.billing_status === 2 ? '部分开票' : '未开票' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'total_amount'">
            {{ formatMoney(record.total_amount) }}
          </template>

          <template v-else-if="column.key === 'handling_fee'">
            {{ formatMoney(record.handling_fee) }}
          </template>

          <template v-else-if="column.key === 'invoiced_amount'">
            {{ formatMoney(record.invoiced_amount) }}
          </template>

          <template v-else-if="column.key === 'uninvoiced_amount'">
            <span :style="{ color: record.uninvoiced_amount > 0 ? '#f5222d' : '#52c41a' }">
              {{ formatMoney(record.uninvoiced_amount) }}
            </span>
          </template>

          <template v-else-if="column.key === 'invoice_date'">
            {{ formatDate(record.invoice_date) }}
          </template>

          <template v-else-if="column.key === 'document_date'">
            {{ formatDate(record.document_date) }}
          </template>

          <template v-else-if="column.key === 'create_time'">
            {{ formatDate(record.create_time) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleViewDetail(record)">
                详情
              </a-button>
              <a-button type="link" size="small" @click="handleEdit(record)">
                编辑
              </a-button>
              <a-popconfirm
                title="确定要删除这个对账单吗？"
                @confirm="handleDelete(record)"
              >
                <a-button type="link" size="small" danger>
                  删除
                </a-button>
              </a-popconfirm>
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
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { settlementApi } from '@/api/settlement'
import type { SettlementStatement, SettlementSummary, SettlementQueryParams } from '@/types'
import { formatDate } from '@/utils/date'
import SettlementFormModal from './SettlementFormModal.vue'
import dayjs from 'dayjs'

const router = useRouter()

// Modal 相关状态
const formModalVisible = ref(false)
const formModalType = ref<1 | 2>(1) // 1=应收, 2=应付
const formModalSettlementId = ref<string | undefined>(undefined)
const settlementList = ref<SettlementStatement[]>([])
const loading = ref(false)
const settlementDateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

const summary = reactive<SettlementSummary>({
  total_receivable: 0,
  total_payable: 0,
  net_amount: 0,
  invoiced_receivable: 0,
  invoiced_payable: 0,
  uninvoiced_receivable: 0,
  uninvoiced_payable: 0
})

const searchParams = reactive<SettlementQueryParams>({
  page: 1,
  pageSize: 10,
  type: undefined,
  billing_status: undefined,
  settlement_date_start: undefined,
  settlement_date_end: undefined,
  entity_name: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const columns = [
  {
    title: '账单编号',
    dataIndex: 'statement_number',
    key: 'statement_number',
    width: 150,
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 80,
    align: 'center' as const,
  },
  {
    title: '客户/供应商',
    dataIndex: 'entity_name',
    key: 'entity_name',
    width: 150,
  },
  {
    title: '结算日期',
    dataIndex: 'settlement_date',
    key: 'settlement_date',
    width: 100,
  },
  {
    title: '结算方式',
    dataIndex: 'payment_method',
    key: 'payment_method',
    width: 100,
  },
  {
    title: '总计',
    dataIndex: 'total_amount',
    key: 'total_amount',
    width: 110,
    align: 'right' as const,
  },
  {
    title: '手续费',
    dataIndex: 'handling_fee',
    key: 'handling_fee',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '已开票金额',
    dataIndex: 'invoiced_amount',
    key: 'invoiced_amount',
    width: 110,
    align: 'right' as const,
  },
  {
    title: '未开票金额',
    dataIndex: 'uninvoiced_amount',
    key: 'uninvoiced_amount',
    width: 110,
    align: 'right' as const,
  },
  {
    title: '开票状态',
    dataIndex: 'billing_status',
    key: 'billing_status',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '发票号',
    dataIndex: 'invoice_number',
    key: 'invoice_number',
    width: 120,
  },
  {
    title: '制单日期',
    dataIndex: 'document_date',
    key: 'document_date',
    width: 110,
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right' as const,
  },
]

const formatMoney = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const fetchSummary = async () => {
  try {
    const params: { settlement_date_start?: string; settlement_date_end?: string } = {}
    if (settlementDateRange.value) {
      params.settlement_date_start = settlementDateRange.value[0].startOf('month').format('YYYY-MM-DD')
      params.settlement_date_end = settlementDateRange.value[1].endOf('month').format('YYYY-MM-DD')
    }
    const res = await settlementApi.getSummary(params)
    Object.assign(summary, res.data)
  } catch (error: any) {
    message.error(error.message || '获取汇总数据失败')
  }
}

const fetchSettlementList = async () => {
  loading.value = true
  try {
    const params: SettlementQueryParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }

    if (searchParams.type) {
      params.type = searchParams.type
    }

    if (settlementDateRange.value) {
      params.settlement_date_start = settlementDateRange.value[0].startOf('month').format('YYYY-MM-DD')
      params.settlement_date_end = settlementDateRange.value[1].endOf('month').format('YYYY-MM-DD')
    }

    if (searchParams.entity_name) {
      params.entity_name = searchParams.entity_name
    }

    if (searchParams.billing_status !== undefined && searchParams.billing_status !== null) {
      params.billing_status = searchParams.billing_status
    }

    const res = await settlementApi.getList(params)
    settlementList.value = res.data || []
    pagination.total = res.pagination?.total || 0
  } catch (error: any) {
    message.error(error.message || '获取对账单列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchSummary()
  fetchSettlementList()
}

const handleReset = () => {
  searchParams.type = undefined
  searchParams.billing_status = undefined
  searchParams.settlement_date_start = undefined
  searchParams.settlement_date_end = undefined
  searchParams.entity_name = undefined
  settlementDateRange.value = null
  pagination.current = 1
  fetchSummary()
  fetchSettlementList()
}

const handlePageChange = (page: number, pageSize: number) => {
  pagination.current = page
  pagination.pageSize = pageSize
  fetchSettlementList()
}

const handleCreateReceivable = () => {
  formModalType.value = 1
  formModalSettlementId.value = undefined
  formModalVisible.value = true
}

const handleCreatePayable = () => {
  formModalType.value = 2
  formModalSettlementId.value = undefined
  formModalVisible.value = true
}

const handleViewDetail = (record: SettlementStatement) => {
  router.push(`/settlement-statement/${record.statement_id}`)
}

const handleEdit = (record: SettlementStatement) => {
  formModalType.value = record.type
  formModalSettlementId.value = record.statement_id
  formModalVisible.value = true
}

const handleFormSuccess = () => {
  formModalVisible.value = false
  fetchSummary()
  fetchSettlementList()
}

const handleDelete = async (record: SettlementStatement) => {
  try {
    await settlementApi.delete(record.statement_id)
    message.success('删除成功')
    fetchSummary()
    fetchSettlementList()
  } catch (error: any) {
    message.error(error.message || '删除失败')
  }
}

onMounted(() => {
  fetchSummary()
  fetchSettlementList()
})
</script>

<style scoped>
.settlement-container {
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

.summary-cards {
  margin-bottom: 16px;
}

.search-bar {
  margin-bottom: 16px;
}

:deep(.ant-statistic-title) {
  font-size: 14px;
}

:deep(.ant-statistic-content) {
  font-size: 20px;
}
</style>
