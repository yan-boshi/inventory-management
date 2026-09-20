<template>
  <div class="write-off-detail-container">
    <a-card>
      <!-- 顶部操作栏 -->
      <div class="top-bar">
        <a-button @click="handleBack">
          <template #icon><ArrowLeftOutlined /></template>
          返回列表
        </a-button>
        <a-space v-if="detail.status === 1">
          <a-button type="primary" @click="handleEdit">
            编辑
          </a-button>
          <a-popconfirm
            title="确定要作废这个核销单吗？作废后将回滚所有核销记录。"
            @confirm="handleVoid"
          >
            <a-button danger>
              作废
            </a-button>
          </a-popconfirm>
        </a-space>
      </div>

      <!-- 基本信息 -->
      <a-descriptions
        :column="3"
        bordered
        size="small"
        :labelStyle="{ width: '120px' }"
        style="margin-bottom: 16px"
      >
        <a-descriptions-item label="核销单编号">
          <span style="font-weight: bold">{{ detail.write_off_number }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="核销类型">
          <a-tag :color="detail.type === 1 ? 'blue' : 'orange'">
            {{ detail.type === 1 ? '应收核销' : '应付核销' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="detail.status === 1 ? 'green' : 'default'">
            {{ detail.status === 1 ? '已核销' : '已作废' }}
          </a-tag>
        </a-descriptions-item>

        <a-descriptions-item :label="detail.type === 1 ? '客户代码' : '供应商代码'">
          {{ detail.entity_id }}
        </a-descriptions-item>
        <a-descriptions-item :label="detail.type === 1 ? '客户名称' : '供应商名称'">
          {{ detail.entity_name }}
        </a-descriptions-item>
        <a-descriptions-item label="核销日期">
          {{ formatDate(detail.write_off_date) }}
        </a-descriptions-item>

        <a-descriptions-item label="收付款方式">
          {{ detail.payment_method || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="银行流水号">
          {{ detail.bank_reference || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="核销总额">
          <span style="font-weight: bold; color: #1890ff;">
            {{ formatMoney(detail.total_amount) }}
          </span>
        </a-descriptions-item>

        <a-descriptions-item label="制单日期">
          {{ formatDate(detail.document_date) }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ formatDate(detail.create_time) }}
        </a-descriptions-item>
        <a-descriptions-item label="备注" :span="1">
          {{ detail.remarks || '-' }}
        </a-descriptions-item>
      </a-descriptions>

      <!-- 核销明细表格 -->
      <a-card title="核销明细" size="small">
        <a-table
          :columns="itemColumns"
          :data-source="detail.items || []"
          :pagination="false"
          bordered
          size="small"
          rowKey="item_id"
          :scroll="{ y: 300 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'no'">
              {{ index + 1 }}
            </template>

            <template v-else-if="column.key === 'source_bill_id'">
              <a @click="handleViewSourceBill(record)">{{ record.source_bill_id }}</a>
            </template>

            <template v-else-if="column.key === 'write_off_amount'">
              {{ formatMoney(record.write_off_amount) }}
            </template>

            <template v-else-if="column.key === 'before_received'">
              {{ formatMoney(record.before_received) }}
            </template>

            <template v-else-if="column.key === 'after_received'">
              {{ formatMoney(record.after_received) }}
            </template>

            <template v-else-if="column.key === 'create_time'">
              {{ formatDate(record.create_time) }}
            </template>
          </template>

          <template #summary>
            <a-table-summary>
              <a-table-summary-row>
                <a-table-summary-cell :index="0" :colSpan="4" />
                <a-table-summary-cell :index="4" align="right">
                  <strong>{{ formatMoney(totalWriteOffAmount) }}</strong>
                </a-table-summary-cell>
                <a-table-summary-cell :index="5" :colSpan="2" />
              </a-table-summary-row>
            </a-table-summary>
          </template>
        </a-table>
      </a-card>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { writeOffApi } from '@/api/writeOff'
import type { WriteOffDetail as WriteOffDetailType } from '@/types'
import { formatDate } from '@/utils/date'

const router = useRouter()
const route = useRoute()

const detail = ref<WriteOffDetailType>({
  write_off_id: '',
  write_off_number: '',
  type: 1,
  entity_id: '',
  entity_name: '',
  write_off_date: '',
  payment_method: '',
  bank_reference: '',
  document_date: '',
  total_amount: 0,
  status: 1,
  remarks: '',
  items: [],
  create_time: '',
  update_time: '',
})

const itemColumns = [
  { title: '序号', key: 'no', width: 60, align: 'center' as const },
  { title: '来源单据号', dataIndex: 'source_bill_id', key: 'source_bill_id', width: 130 },
  { title: '本次核销金额', key: 'write_off_amount', width: 120, align: 'right' as const },
  { title: '核销前已收', key: 'before_received', width: 120, align: 'right' as const },
  { title: '核销后已收', key: 'after_received', width: 120, align: 'right' as const },
  { title: '创建时间', key: 'create_time', width: 160 },
]

const totalWriteOffAmount = computed(() => {
  return (detail.value.items || []).reduce(
    (sum, item) => sum + (item.write_off_amount || 0),
    0
  )
})

const formatMoney = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const fetchDetail = async () => {
  const id = route.params.id as string
  if (!id) {
    message.error('核销单ID不存在')
    return
  }

  try {
    const res = await writeOffApi.getById(id)
    detail.value = res.data
  } catch (error: any) {
    message.error(error.message || '获取详情失败')
  }
}

const handleBack = () => {
  router.push('/write-off')
}

const handleEdit = () => {
  // 跳转到列表页并打开编辑弹窗
  router.push({
    path: '/write-off',
    query: { edit: detail.value.write_off_id, type: detail.value.type },
  })
}

const handleVoid = async () => {
  try {
    await writeOffApi.void(detail.value.write_off_id)
    message.success('核销单已作废')
    fetchDetail()
  } catch (error: any) {
    message.error(error.message || '作废失败')
  }
}

const handleViewSourceBill = (record: any) => {
  message.info(`查看来源单据: ${record.source_bill_id}`)
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped>
.write-off-detail-container {
  padding: 0;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
