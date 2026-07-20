<template>
  <div class="settlement-detail-container">
    <div class="header">
      <a-button type="link" @click="handleBack">
        <template #icon><ArrowLeftOutlined /></template>
        返回
      </a-button>
      <h1>对账单详情</h1>
    </div>

    <a-spin :spinning="loading">
      <template v-if="detail">
        <!-- 基本信息 -->
        <a-card title="基本信息" class="detail-card">
          <a-descriptions :column="{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }" bordered size="small">
            <a-descriptions-item label="账单编号">
              {{ detail.statement_number }}
            </a-descriptions-item>
            <a-descriptions-item label="类型">
              <a-tag :color="detail.type === 1 ? 'blue' : 'orange'">
                {{ detail.type === 1 ? '应收' : '应付' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item :label="detail.type === 1 ? '客户代码' : '供应商代码'">
              {{ detail.entity_id }}
            </a-descriptions-item>
            <a-descriptions-item :label="detail.type === 1 ? '客户名称' : '供应商名称'">
              {{ detail.entity_name }}
            </a-descriptions-item>
            <a-descriptions-item label="结算日期">
              {{ formatDate(detail.settlement_date) }}
            </a-descriptions-item>
            <a-descriptions-item label="结算方式">
              {{ detail.payment_method || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="销售额">
              {{ formatMoney(detail.sales_amount) }}
            </a-descriptions-item>
            <a-descriptions-item label="是否开票">
              <a-tag :color="detail.is_invoiced === 1 ? 'green' : 'default'">
                {{ detail.is_invoiced === 1 ? '已开票' : '未开票' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="开票日期">
              {{ formatDate(detail.invoice_date) }}
            </a-descriptions-item>
            <a-descriptions-item label="发票号">
              {{ detail.invoice_number || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="制单日期">
              {{ formatDate(detail.document_date) }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <!-- 商品信息表格 -->
        <a-card :title="detail.type === 1 ? '出库单信息' : '入库单信息'" class="detail-card">
          <a-table
            :columns="itemColumns"
            :data-source="detail.items"
            :pagination="false"
            bordered
            size="small"
            rowKey="item_id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'delivery_date'">
                {{ formatDate(record.delivery_date) }}
              </template>
              <template v-else-if="column.key === 'quantity'">
                {{ record.quantity }}
              </template>
              <template v-else-if="column.key === 'unit_price'">
                {{ formatMoney(record.unit_price) }}
              </template>
              <template v-else-if="column.key === 'amount_with_tax'">
                {{ formatMoney(record.amount_with_tax) }}
              </template>
            </template>
            <template #summary>
              <a-table-summary>
                <a-table-summary-row>
                  <a-table-summary-cell :index="0" :colSpan="11" />
                  <a-table-summary-cell :index="11" align="right">
                    <strong>{{ formatMoney(detail.total_amount) }}</strong>
                  </a-table-summary-cell>
                  <a-table-summary-cell :index="12" />
                </a-table-summary-row>
              </a-table-summary>
            </template>
          </a-table>
        </a-card>

        <!-- 金额信息 -->
        <a-card title="金额信息" class="detail-card">
          <a-descriptions :column="{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }" bordered size="small">
            <a-descriptions-item label="总计">
              <span class="money-value">{{ formatMoney(detail.total_amount) }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="已开票金额">
              <span class="money-value" style="color: #52c41a">{{ formatMoney(detail.invoiced_amount) }}</span>
            </a-descriptions-item>
            <a-descriptions-item label="未开票金额">
              <span class="money-value" style="color: #f5222d">{{ formatMoney(detail.uninvoiced_amount) }}</span>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <!-- 备注 -->
        <a-card v-if="detail.remarks" title="备注" class="detail-card">
          <p>{{ detail.remarks }}</p>
        </a-card>
      </template>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { settlementApi } from '@/api/settlement'
import type { SettlementDetail } from '@/types'
import { formatDate } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detail = ref<SettlementDetail | null>(null)

const itemColumns = computed(() => {
  if (!detail.value) return []
  const dateTitle = detail.value.type === 1 ? '出库日期' : '入库日期'
  const numberTitle = detail.value.type === 1 ? '出库编号' : '入库编号'

  return [
    { title: '序号', key: 'no', width: 60, align: 'center' as const, customRender: ({ index }: { index: number }) => index + 1 },
    { title: dateTitle, key: 'delivery_date', width: 100 },
    { title: numberTitle, dataIndex: 'delivery_number', key: 'delivery_number', width: 120 },
    { title: '产品代码', dataIndex: 'product_code', key: 'product_code', width: 100 },
    { title: '产品名称', dataIndex: 'product_name', key: 'product_name', width: 120 },
    { title: '产品型号', dataIndex: 'product_model', key: 'product_model', width: 100 },
    { title: '产品描述', dataIndex: 'product_description', key: 'product_description', width: 120 },
    { title: '数量', key: 'quantity', width: 80, align: 'right' as const },
    { title: '币种', dataIndex: 'currency', key: 'currency', width: 60 },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
    { title: '单价', key: 'unit_price', width: 100, align: 'right' as const },
    { title: '金额(含税)', key: 'amount_with_tax', width: 110, align: 'right' as const },
    { title: '备注', dataIndex: 'remarks', key: 'remarks', width: 120 },
  ]
})

const formatMoney = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const fetchDetail = async () => {
  const { id } = route.params
  if (!id) {
    message.error('参数错误')
    return
  }

  loading.value = true
  try {
    const res = await settlementApi.getById(id as string)
    detail.value = res.data
  } catch (error: any) {
    message.error(error.message || '获取详情失败')
  } finally {
    loading.value = false
  }
}

const handleBack = () => {
  router.push('/settlement-statement')
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped>
.settlement-detail-container {
  padding: 0;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 8px;
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.detail-card {
  margin-bottom: 16px;
}

.money-value {
  font-weight: bold;
  font-size: 14px;
}
</style>
