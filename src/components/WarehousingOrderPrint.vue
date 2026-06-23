<template>
  <a-modal
    title=""
    :width="800"
    :visible="visible"
    :closable="false"
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
          <span class="info-value">{{ order.currency || 'CNY' }}</span>
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
          <tr v-for="(item, index) in parsedItems" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ item.product_code || '-' }}</td>
            <td>{{ item.product_name || '-' }}</td>
            <td>{{ item.description || item.specification || '-' }}</td>
            <td>{{ item.unit || '-' }}</td>
            <td>{{ item.quantity || '-' }}</td>
            <td>{{ item.remarks || '-' }}</td>
          </tr>
          <tr v-if="parsedItems.length === 0">
            <td colspan="7" style="text-align: center; color: #999;">暂无入库商品</td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        <div class="footer-row">
          <span class="footer-label">总计：</span>
          <span class="footer-value">{{ order.total_amount || 0 }}</span>
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

    <div class="modal-footer">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handlePrint">打印</a-button>
      </a-space>
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

const parsedItems = computed(() => {
  if (!props.order || !props.order.warehousing_items) return []
  try {
    const items = typeof props.order.warehousing_items === 'string'
      ? JSON.parse(props.order.warehousing_items)
      : props.order.warehousing_items
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
})

const getExpenses = () => {
  if (!props.order || !props.order.expenses) return {}
  try {
    return typeof props.order.expenses === 'string'
      ? JSON.parse(props.order.expenses)
      : props.order.expenses || {}
  } catch {
    return {}
  }
}

const hasExpenses = () => {
  const expenses = getExpenses()
  return Object.values(expenses).some((value: any) => value > 0)
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

const handlePrint = () => {
  window.print()
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
    text-align: center;
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

.modal-footer {
  text-align: right;
  padding: 16px 0 0 0;
  border-top: 1px solid #f0f0f0;
}

</style>

<style lang="scss">
@page {
  margin: 5mm;
  size: A4 portrait;
}

@media print {
  body {
    margin: 0;
    padding: 0;
    overflow: visible;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body > #app {
    display: none !important;
  }

  .ant-modal-mask {
    display: none !important;
  }

  .ant-modal-wrap {
    position: static !important;
    overflow: visible !important;
  }

  .ant-modal {
    position: static !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
  }

  .ant-modal-content {
    box-shadow: none !important;
    border: none !important;
  }

  .ant-modal-close,
  .ant-modal-header {
    display: none !important;
  }

  .ant-modal-body {
    padding: 0 !important;
    overflow: visible !important;
    max-height: none !important;
  }

  .modal-footer {
    display: none !important;
  }

  .print-container {
    padding: 0;
    font-size: 9px;
  }

  .print-header {
    margin-bottom: 5px;

    .company-name {
      font-size: 14px;
    }

    .order-title {
      font-size: 12px;
    }
  }

  .print-info {
    margin-bottom: 4px;

    .info-row {
      margin-bottom: 2px;
      font-size: 8px;
    }
  }

  .print-table {
    margin-bottom: 4px;

    th {
      padding: 2px 3px;
      font-size: 8px;
    }

    td {
      padding: 2px 3px;
      font-size: 8px;
    }
  }

  .print-footer {
    .footer-row {
      margin-bottom: 2px;
      font-size: 8px;
    }
  }
}
</style>
