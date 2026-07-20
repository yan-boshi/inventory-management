<template>
  <a-modal
    title="采购订单详情"
    :width="900"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
  >
    <div v-if="order" style="padding: 20px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <h4>基本信息</h4>
          <a-descriptions size="small" :column="1">
            <a-descriptions-item label="默认单据编号">
              <a-tag color="blue">{{ order.order_number }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="采购合同编号">{{ order.contract_number || '-' }}</a-descriptions-item>
            <a-descriptions-item label="供应商名称">{{ order.supplier_name }}</a-descriptions-item>
            <a-descriptions-item label="供应商代码">{{ order.supplier_code }}</a-descriptions-item>
            <a-descriptions-item label="采购人">{{ order.purchase_person || '-' }}</a-descriptions-item>
            <a-descriptions-item label="币种">{{ order.currency }}</a-descriptions-item>
            <a-descriptions-item label="汇率">{{ order.exchange_rate }}</a-descriptions-item>
            <a-descriptions-item label="交货日期">{{ order.delivery_date || '-' }}</a-descriptions-item>
            <a-descriptions-item label="到货日期">{{ order.arrival_date || '-' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ formatDateTime(order.created_at) }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div>
          <h4>状态</h4>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <a-tag :color="getStatusColor(order.status)">
              {{ getStatusText(order.status) }}
            </a-tag>
            <span style="color: #999;">最后更新: {{ formatDateTime(order.updated_at) }}</span>
          </div>

          <h4>采购费用登记</h4>
          <div v-if="getValidExpenses(order.expenses).length > 0" style="display: flex; gap: 20px; padding: 12px; background: #f5f7fa; border-radius: 4px;">
            <a-tag v-for="item in getValidExpenses(order.expenses)" :key="item.key" color="blue">
              {{ item.label }}: {{ item.value.toFixed(2) }}
            </a-tag>
          </div>
          <span v-else style="color: #999;">无费用登记</span>
        </div>

        <div style="grid-column: span 2;">
          <h4>采购商品明细</h4>
          <a-table
            :columns="itemColumns"
            :data-source="parsedItems"
            :pagination="false"
            bordered
            size="small"
            rowKey="no"
            :scroll="{ y: 400 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'tax_included_price'">
                {{ formatMoney(record.tax_included_price) }}
              </template>
              <template v-else-if="column.key === 'tax_excluded_price'">
                {{ formatMoney(record.tax_excluded_price) }}
              </template>
              <template v-else-if="column.key === 'tax_included_amount'">
                {{ formatMoney(record.tax_included_amount) }}
              </template>
              <template v-else-if="column.key === 'tax_excluded_amount'">
                {{ formatMoney(record.tax_excluded_amount) }}
              </template>
              <template v-else-if="column.key === 'tax_amount'">
                {{ formatMoney(record.tax_amount) }}
              </template>
              <template v-else-if="column.key === 'total_price'">
                {{ formatMoney(record.total_price) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getItemStatusColor(record.status)">
                  {{ getItemStatusText(record.status) }}
                </a-tag>
              </template>
            </template>
          </a-table>
        </div>

        <div style="grid-column: span 2;">
          <h4>备注</h4>
          <a-textarea :value="order.remarks || ''" :rows="3" disabled />
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { getValidExpenses } from '@/utils/expense'
import type { PurchaseOrder, PurchaseItem } from '@/types'

const props = defineProps<{
  visible: boolean
  order?: PurchaseOrder
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const parsedItems = computed(() => {
  if (!props.order?.purchase_items) return []
  try {
    return typeof props.order.purchase_items === 'string'
      ? JSON.parse(props.order.purchase_items)
      : props.order.purchase_items
  } catch {
    return []
  }
})

const itemColumns = [
  { title: '序号', dataIndex: 'no', key: 'no', width: 60, align: 'center' as const },
  { title: '业务分类', dataIndex: 'business_category', key: 'business_category', width: 100 },
  { title: '产品名称', dataIndex: 'product_name', key: 'product_name', width: 120 },
  { title: '产品代码', dataIndex: 'product_code', key: 'product_code', width: 100 },
  { title: '规格型号', dataIndex: 'model', key: 'model', width: 100 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 60, align: 'center' as const },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 70, align: 'right' as const },
  { title: '已入库', dataIndex: 'inbound_quantity', key: 'inbound_quantity', width: 70, align: 'right' as const },
  { title: '含税单价', dataIndex: 'tax_included_price', key: 'tax_included_price', width: 90, align: 'right' as const },
  { title: '未税单价', dataIndex: 'tax_excluded_price', key: 'tax_excluded_price', width: 90, align: 'right' as const },
  { title: '含税金额', dataIndex: 'tax_included_amount', key: 'tax_included_amount', width: 100, align: 'right' as const },
  { title: '税率', dataIndex: 'tax_rate', key: 'tax_rate', width: 70, align: 'right' as const },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80, align: 'center' as const },
]

const formatDateTime = (dateString: string) => {
  if (!dateString) return '-'
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

const formatMoney = (value: number) => {
  return value != null ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
}

const getStatusColor = (status: number | string) => {
  const statusMap: Record<string, string> = {
    '1': 'blue',
    '2': 'green',
    '3': 'orange',
    '4': 'red',
  }
  return statusMap[String(status)] || 'default'
}

const getStatusText = (status: number | string) => {
  const statusMap: Record<string, string> = {
    '1': '未入库',
    '2': '已全部入库',
    '3': '已部分入库',
    '4': '已退货',
  }
  return statusMap[String(status)] || '未知'
}

const getItemStatusColor = (status: number | string) => {
  const statusMap: Record<string, string> = {
    '1': 'blue',
    '2': 'green',
    '3': 'orange',
  }
  return statusMap[String(status)] || 'default'
}

const getItemStatusText = (status: number | string) => {
  const statusMap: Record<string, string> = {
    '1': '未入库',
    '2': '已全部入库',
    '3': '已部分入库',
  }
  return statusMap[String(status)] || '未知'
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>
