<template>
  <a-modal
    title="采购订单详情"
    :width="700"
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
            <a-descriptions-item label="结算方式">{{ order.payment_method }}</a-descriptions-item>
            <a-descriptions-item label="业务分类">{{ order.business_category }}</a-descriptions-item>
            <a-descriptions-item label="产品名称">{{ order.product_name }}</a-descriptions-item>
            <a-descriptions-item label="规格型号">{{ order.model || '-' }}</a-descriptions-item>
            <a-descriptions-item label="规格描述">{{ order.description || '-' }}</a-descriptions-item>
            <a-descriptions-item label="产品代码">{{ order.product_code }}</a-descriptions-item>
            <a-descriptions-item label="单位">{{ order.unit || '-' }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div>
          <h4>订单信息</h4>
          <a-descriptions size="small" :column="1">
            <a-descriptions-item label="数量">{{ order.quantity }}</a-descriptions-item>
            <a-descriptions-item label="含税单价 (元)">{{ order.tax_included_price.toFixed(2) }}</a-descriptions-item>
            <a-descriptions-item label="税率">{{ (order.tax_rate * 100).toFixed(2) }}%</a-descriptions-item>
            <a-descriptions-item label="未税单价 (元)">{{ order.tax_excluded_price.toFixed(2) }}</a-descriptions-item>
            <a-descriptions-item label="含税金额 (元)" :labelStyle="{ color: '#f5222d' }">{{ order.tax_included_amount.toFixed(2) }}</a-descriptions-item>
            <a-descriptions-item label="未税金额 (元)">{{ order.tax_excluded_amount.toFixed(2) }}</a-descriptions-item>
            <a-descriptions-item label="税额 (px)" :labelStyle="{ color: '#f5222d' }">{{ order.tax_amount.toFixed(2) }}</a-descriptions-item>
            <a-descriptions-item label="币种">{{ order.currency }}</a-descriptions-item>
            <a-descriptions-item label="汇率">{{ order.exchange_rate }}</a-descriptions-item>
            <a-descriptions-item label="交货日期">{{ order.delivery_date || '-' }}</a-descriptions-item>
            <a-descriptions-item label="到货日期">{{ order.arrival_date || '-' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ formatDateTime(order.created_at) }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div style="grid-column: span 2;">
          <h4>状态</h4>
          <div style="display: flex; align-items: center; gap: 8px;">
            <a-tag :color="order.is_returned ? 'red' : 'green'">
              {{ order.is_returned ? '已退货' : '正常' }}
            </a-tag>
            <span style="color: #999;">最后更新: {{ formatDateTime(order.updated_at) }}</span>
          </div>
        </div>

        <div style="grid-column: span 2;">
          <h4>备注</h4>
          <a-textarea v-model:value="order.remarks" :rows="3" disabled />
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { PurchaseOrder } from '@/types'

defineProps<{
  visible: boolean
  order?: PurchaseOrder
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const formatDateTime = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>
