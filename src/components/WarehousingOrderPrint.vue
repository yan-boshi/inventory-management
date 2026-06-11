<template>
  <a-modal
    title="打印预览"
    :width="800"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
  >
    <div v-if="order" class="print-container">
      <div class="print-header">
        <h1 class="company-name">深圳市旭思达光电科技有限公司</h1>
        <h2 class="order-title">入库单</h2>
      </div>

      <div class="print-info">
        <div class="info-row">
          <span class="info-label">入库单编号：</span>
          <span class="info-value">{{ order.order_number }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">采购订单编号：</span>
          <span class="info-value">{{ order.purchase_order_number || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">客户名称：</span>
          <span class="info-value">{{ order.customer_name || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">客户地址：</span>
          <span class="info-value">{{ order.customer_address || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">入库时间：</span>
          <span class="info-value">{{ formatDateTime(order.warehousing_time) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">币种：</span>
          <span class="info-value">{{ order.currency }}</span>
        </div>
      </div>

      <!-- 入库费用信息 -->
      <div class="print-expenses" v-if="hasExpenses()">
        <div class="expenses-title">入库费用：</div>
        <div class="expenses-list">
          <span v-for="(value, key) in getExpenses()" :key="key">
            {{ key }}: {{ formatCurrency(value) }}
          </span>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>产品代码</th>
            <th>产品名称</th>
            <th>规格描述</th>
            <th>单位</th>
            <th>数量</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in getParsedWarehousingItems()" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ item.product_code || '-' }}</td>
            <td>{{ item.product_name || '-' }}</td>
            <td>{{ item.description || '-' }}</td>
            <td>{{ item.unit || '-' }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.remarks || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="footer-row">
          <span class="footer-label">总计：</span>
          <span class="footer-value">{{ order.total_amount }}</span>
        </div>
        <div class="footer-row">
          <span class="footer-label">入库人：</span>
          <span class="footer-value">{{ order.warehousing_person || '-' }}</span>
        </div>
        <div class="footer-row">
          <span class="footer-label">联系电话：</span>
          <span class="footer-value">{{ order.contact_phone || '-' }}</span>
        </div>
        <div class="footer-row">
          <span class="footer-label">备注：</span>
          <span class="footer-value">{{ order.remarks || '-' }}</span>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import type { WarehousingOrder } from '@/types'

const props = defineProps<{
  visible: boolean
  order?: any
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const getParsedWarehousingItems = () => {
  if (!props.order || !props.order.warehousing_items) return []
  try {
    return JSON.parse(props.order.warehousing_items || '[]')
  } catch {
    return []
  }
}

const getExpenses = () => {
  if (!props.order || !props.order.expenses) return {}
  try {
    return JSON.parse(props.order.expenses || '{}')
  } catch {
    return {}
  }
}

const hasExpenses = () => {
  const expenses = getExpenses()
  return Object.values(expenses).some(value => value > 0)
}

const formatCurrency = (value: number) => {
  return value ? value.toFixed(2) : '0.00'
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return '-'
  return dayjs(dateString).format('YYYY-MM-DD HH:mm')
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.print-container {
  padding: 20px;
  font-size: 14px;
}

.print-header {
  text-align: center;
  margin-bottom: 30px;

  .company-name {
    font-size: 22px;
    font-weight: bold;
    margin: 0 0 12px 0;
    color: #000;
  }

  .order-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
    color: #000;
  }
}

.print-info {
  margin-bottom: 20px;

  .info-row {
    display: flex;
    margin-bottom: 10px;

    .info-label {
      font-weight: bold;
      min-width: 100px;
    }

    .info-value {
      flex: 1;
    }
  }
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;

  th,
  td {
    border: 1px solid #000;
    padding: 8px 12px;
    text-align: left;
  }

  th {
    background: #f5f5f5;
    font-weight: bold;
  }
}

.print-footer {
  .footer-row {
    display: flex;
    margin-bottom: 10px;

    .footer-label {
      font-weight: bold;
      min-width: 80px;
    }

    .footer-value {
      flex: 1;
    }
  }
}

.print-expenses {
  margin-bottom: 15px;

  .expenses-title {
    font-weight: bold;
    margin-bottom: 8px;
  }

  .expenses-list {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;

    span {
      font-size: 14px;
    }
  }
}

@media print {
  .print-container {
    font-size: 12pt;
  }

  th,
  td {
    border-color: #000 !important;
  }
}
</style>
