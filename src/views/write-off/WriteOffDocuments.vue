<template>
  <div class="write-off-container">
    <!-- 新增/编辑核销单弹窗 -->
    <WriteOffFormModal
      v-model:visible="formModalVisible"
      :type="formModalType"
      :write-off-id="formModalWriteOffId"
      :pre-selected-records="preSelectedRecords"
      @success="handleFormSuccess"
    />

    <!-- 汇总卡片 -->
    <a-row :gutter="16" class="summary-cards">
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="应收核销总额"
            :value="summary.total_receivable_write_off"
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
            title="应付核销总额"
            :value="summary.total_payable_write_off"
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
            title="净核销额"
            :value="summary.net_write_off"
            :precision="2"
            :value-style="{ color: summary.net_write_off >= 0 ? '#52c41a' : '#f5222d' }"
          >
            <template #prefix>¥</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="4">
        <a-card>
          <a-statistic
            title="有效核销总额"
            :value="summary.active_total"
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
            title="已作废总额"
            :value="summary.voided_total"
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
            >
              <a-select-option :value="1">应收核销</a-select-option>
              <a-select-option :value="2">应付核销</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="核销日期">
            <a-range-picker
              v-model:value="dateRange"
              format="YYYY-MM-DD"
              :placeholder="['开始日期', '结束日期']"
            />
          </a-form-item>

          <a-form-item label="客户/供应商">
            <a-input
              v-model:value="searchParams.entity_name"
              placeholder="请输入名称"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="状态">
            <a-select
              v-model:value="searchParams.status"
              placeholder="请选择状态"
              allow-clear
            >
              <a-select-option :value="1">已核销</a-select-option>
              <a-select-option :value="0">已作废</a-select-option>
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
              <a-button @click="handleExport">
                <template #icon><DownloadOutlined /></template>
                导出Excel
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <!-- 列表 -->
      <a-table
        v-scroll-topbar
        :columns="columns"
        :data-source="writeOffList"
        :loading="loading"
        :pagination="false"
        rowKey="write_off_id"
        :scroll="{ y: 'calc(100vh - 400px)' }"
        bordered
        size="small"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'no'">
            {{ index + 1 }}
          </template>

          <template v-else-if="column.key === 'type'">
            <a-tag :color="record.type === 1 ? 'blue' : 'orange'">
              {{ record.type === 1 ? '应收核销' : '应付核销' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 1 ? 'green' : 'default'">
              {{ record.status === 1 ? '已核销' : '已作废' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'total_amount'">
            {{ formatMoney(record.total_amount) }}
          </template>

          <template v-else-if="column.key === 'write_off_date'">
            {{ formatDate(record.write_off_date) }}
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
              <a-button type="link" size="small" :disabled="record.status === 0" @click="handleEdit(record)">
                编辑
              </a-button>
              <a-popconfirm
                v-if="record.status === 1"
                title="确定要作废这个核销单吗？作废后将回滚所有核销记录。"
                @confirm="handleVoid(record)"
              >
                <a-button type="link" size="small" danger>
                  作废
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
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { writeOffApi } from '@/api/writeOff'
import type { WriteOffDocument, WriteOffSummary, WriteOffQueryParams } from '@/types'
import { formatDate } from '@/utils/date'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'
import WriteOffFormModal from './WriteOffFormModal.vue'
import dayjs from 'dayjs'

const router = useRouter()

// Modal 相关状态
const formModalVisible = ref(false)
const formModalType = ref<1 | 2>(1)
const formModalWriteOffId = ref<string | undefined>(undefined)
const preSelectedRecords = ref<any[]>([])
const writeOffList = ref<WriteOffDocument[]>([])
const loading = ref(false)
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

const summary = reactive<WriteOffSummary>({
  total_receivable_write_off: 0,
  total_payable_write_off: 0,
  net_write_off: 0,
  total_count: 0,
  active_total: 0,
  voided_total: 0
})

const searchParams = reactive<WriteOffQueryParams>({
  page: 1,
  pageSize: 100,
  type: undefined,
  status: undefined,
  entity_name: undefined,
  write_off_date_start: undefined,
  write_off_date_end: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 100,
  total: 0,
})

const columns = [
  {
    title: '序号',
    key: 'no',
    width: 60,
    align: 'center' as const,
  },
  {
    title: '核销单编号',
    dataIndex: 'write_off_number',
    key: 'write_off_number',
    width: 150,
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '客户/供应商',
    dataIndex: 'entity_name',
    key: 'entity_name',
    width: 150,
  },
  {
    title: '核销日期',
    dataIndex: 'write_off_date',
    key: 'write_off_date',
    width: 110,
  },
  {
    title: '核销金额',
    dataIndex: 'total_amount',
    key: 'total_amount',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '收付款方式',
    dataIndex: 'payment_method',
    key: 'payment_method',
    width: 100,
  },
  {
    title: '银行流水号',
    dataIndex: 'bank_reference',
    key: 'bank_reference',
    width: 130,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
    align: 'center' as const,
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
    const params: any = {}
    if (dateRange.value) {
      params.write_off_date_start = dateRange.value[0].format('YYYY-MM-DD')
      params.write_off_date_end = dateRange.value[1].format('YYYY-MM-DD')
    }
    const res = await writeOffApi.getSummary(params)
    Object.assign(summary, res.data)
  } catch (error: any) {
    message.error(error.message || '获取汇总数据失败')
  }
}

const fetchWriteOffList = async () => {
  loading.value = true
  try {
    const params: WriteOffQueryParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }

    if (searchParams.type) {
      params.type = searchParams.type
    }

    if (searchParams.status !== undefined && searchParams.status !== null) {
      params.status = searchParams.status
    }

    if (dateRange.value) {
      params.write_off_date_start = dateRange.value[0].format('YYYY-MM-DD')
      params.write_off_date_end = dateRange.value[1].format('YYYY-MM-DD')
    }

    if (searchParams.entity_name) {
      params.entity_name = searchParams.entity_name
    }

    const res = await writeOffApi.getList(params)
    writeOffList.value = res.data || []
    pagination.total = res.pagination?.total || 0
  } catch (error: any) {
    message.error(error.message || '获取核销单列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchSummary()
  fetchWriteOffList()
}

const handleReset = () => {
  searchParams.type = undefined
  searchParams.status = undefined
  searchParams.entity_name = undefined
  searchParams.write_off_date_start = undefined
  searchParams.write_off_date_end = undefined
  dateRange.value = null
  pagination.current = 1
  fetchSummary()
  fetchWriteOffList()
}

const handlePageChange = (page: number, pageSize: number) => {
  pagination.current = page
  pagination.pageSize = pageSize
  fetchWriteOffList()
}

const handleViewDetail = (record: WriteOffDocument) => {
  router.push(`/write-off/${record.write_off_id}`)
}

const handleEdit = (record: WriteOffDocument) => {
  formModalType.value = record.type
  formModalWriteOffId.value = record.write_off_id
  preSelectedRecords.value = []
  formModalVisible.value = true
}

const handleFormSuccess = () => {
  formModalVisible.value = false
  preSelectedRecords.value = []
  fetchSummary()
  fetchWriteOffList()
}

const handleVoid = async (record: WriteOffDocument) => {
  try {
    await writeOffApi.void(record.write_off_id)
    message.success('核销单已作废')
    fetchSummary()
    fetchWriteOffList()
  } catch (error: any) {
    message.error(error.message || '作废失败')
  }
}

// 导出Excel
const exportColumns: ExportColumn[] = [
  { key: 'write_off_number', title: '核销单编号' },
  { key: 'type', title: '类型', formatter: (v) => v === 1 ? '应收核销' : '应付核销' },
  { key: 'entity_name', title: '客户/供应商' },
  { key: 'write_off_date', title: '核销日期' },
  { key: 'total_amount', title: '核销金额' },
  { key: 'payment_method', title: '收付款方式' },
  { key: 'bank_reference', title: '银行流水号' },
  { key: 'status', title: '状态', formatter: (v) => v === 1 ? '已核销' : '已作废' },
  { key: 'document_date', title: '制单日期' },
  { key: 'remarks', title: '备注' },
]

const handleExport = async () => {
  try {
    const params: any = { page: 1, pageSize: 99999 }
    if (searchParams.type) params.type = searchParams.type
    if (searchParams.status !== undefined && searchParams.status !== null) params.status = searchParams.status
    if (searchParams.entity_name) params.entity_name = searchParams.entity_name
    if (dateRange.value) {
      params.write_off_date_start = dateRange.value[0].format('YYYY-MM-DD')
      params.write_off_date_end = dateRange.value[1].format('YYYY-MM-DD')
    }
    const response = await writeOffApi.getList(params)
    const allData = response.data || []
    exportToExcel({ filename: '核销单', columns: exportColumns, data: allData })
  } catch {
    message.error('导出失败')
  }
}

onMounted(() => {
  fetchSummary()
  fetchWriteOffList()
})
</script>

<style scoped>
.write-off-container {
  padding: 0;
}

.summary-cards {
  margin-bottom: 16px;
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

:deep(.ant-statistic-title) {
  font-size: 14px;
}

:deep(.ant-statistic-content) {
  font-size: 20px;
}
</style>
