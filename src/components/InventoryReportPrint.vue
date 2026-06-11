<template>
  <a-modal
    title="打印预览"
    :width="1100"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
  >
    <div class="print-container">
      <div class="print-header">
        <h1 class="report-title">进销存明细表</h1>
      </div>

      <div class="print-filters">
        <span class="filter-label">筛选条件：</span>
        <span class="filter-item">年份：{{ searchParams.year }}年</span>
        <span v-if="searchParams.month" class="filter-item">月份：{{ searchParams.month }}月</span>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th v-if="isVisible('product_name')">产品名称</th>
            <th v-if="isVisible('product_code')">产品代码</th>
            <th v-if="isVisible('model')">规格型号</th>
            <th v-if="isVisible('unit')">单位</th>
            <th v-if="isVisible('opening_stock')">期初库存</th>
            <th v-if="isVisible('inbound_quantity')">本期入库</th>
            <th v-if="isVisible('outbound_quantity')">本期出库</th>
            <th v-if="isVisible('closing_stock')">期末库存</th>
            <th v-if="isVisible('tax_included_price')">含税单价</th>
            <th v-if="isVisible('tax_excluded_price')">未税单价</th>
            <th v-if="isVisible('tax_included_amount')">期末金额(含税)</th>
            <th v-if="isVisible('tax_excluded_amount')">期末金额(未税)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in data" :key="index">
            <td v-if="isVisible('product_name')">{{ item.product_name }}</td>
            <td v-if="isVisible('product_code')">{{ item.product_code }}</td>
            <td v-if="isVisible('model')">{{ item.model || '-' }}</td>
            <td v-if="isVisible('unit')" class="text-center">{{ item.unit || '-' }}</td>
            <td v-if="isVisible('opening_stock')" class="text-right">{{ formatNumber(item.opening_stock) }}</td>
            <td v-if="isVisible('inbound_quantity')" class="text-right" style="color: #52c41a">{{ formatNumber(item.inbound_quantity) }}</td>
            <td v-if="isVisible('outbound_quantity')" class="text-right" style="color: #ff4d4f">{{ formatNumber(item.outbound_quantity) }}</td>
            <td v-if="isVisible('closing_stock')" class="text-right"><strong>{{ formatNumber(item.closing_stock) }}</strong></td>
            <td v-if="isVisible('tax_included_price')" class="text-right">{{ formatMoney(item.tax_included_price) }}</td>
            <td v-if="isVisible('tax_excluded_price')" class="text-right">{{ formatMoney(item.tax_excluded_price) }}</td>
            <td v-if="isVisible('tax_included_amount')" class="text-right">{{ formatMoney(item.tax_included_amount) }}</td>
            <td v-if="isVisible('tax_excluded_amount')" class="text-right">{{ formatMoney(item.tax_excluded_amount) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="data.length > 0">
          <tr class="summary-row">
            <td :colspan="basicColCount" class="text-right"><strong>合计</strong></td>
            <td v-if="isVisible('opening_stock')" class="text-right"><strong>{{ formatNumber(totals.opening_stock) }}</strong></td>
            <td v-if="isVisible('inbound_quantity')" class="text-right"><strong>{{ formatNumber(totals.inbound_quantity) }}</strong></td>
            <td v-if="isVisible('outbound_quantity')" class="text-right"><strong>{{ formatNumber(totals.outbound_quantity) }}</strong></td>
            <td v-if="isVisible('closing_stock')" class="text-right"><strong>{{ formatNumber(totals.closing_stock) }}</strong></td>
            <td v-if="isVisible('tax_included_price')"></td>
            <td v-if="isVisible('tax_excluded_price')"></td>
            <td v-if="isVisible('tax_included_amount')" class="text-right"><strong>{{ formatMoney(totals.tax_included_amount) }}</strong></td>
            <td v-if="isVisible('tax_excluded_amount')" class="text-right"><strong>{{ formatMoney(totals.tax_excluded_amount) }}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div class="print-actions">
        <a-button type="primary" @click="handlePrint">打印</a-button>
        <a-button @click="handleCancel" style="margin-left: 8px">取消</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts">
const defaultVisibleColumns = [
  'product_name', 'product_code', 'model', 'unit', 'opening_stock', 'inbound_quantity', 'outbound_quantity', 'closing_stock', 'tax_included_price', 'tax_excluded_price', 'tax_included_amount', 'tax_excluded_amount'
]
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { InventoryReportItem } from '@/types'

const props = withDefaults(defineProps<{
  visible: boolean
  data: InventoryReportItem[]
  searchParams: { year: number; month?: number }
  visibleColumns?: string[]
}>(), {
  visibleColumns: () => defaultVisibleColumns
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const isVisible = (key: string) => props.visibleColumns.includes(key)

// 计算基础列数量（用于合计行的 colspan）
const basicColCount = computed(() => {
  const basicKeys = ['product_name', 'product_code', 'model', 'unit']
  return basicKeys.filter(key => isVisible(key)).length
})

const totals = computed(() => {
  return props.data.reduce((acc, item) => {
    acc.opening_stock += item.opening_stock || 0
    acc.inbound_quantity += item.inbound_quantity || 0
    acc.outbound_quantity += item.outbound_quantity || 0
    acc.closing_stock += item.closing_stock || 0
    acc.tax_included_amount += item.tax_included_amount || 0
    acc.tax_excluded_amount += item.tax_excluded_amount || 0
    return acc
  }, {
    opening_stock: 0,
    inbound_quantity: 0,
    outbound_quantity: 0,
    closing_stock: 0,
    tax_included_amount: 0,
    tax_excluded_amount: 0,
  })
})

const formatNumber = (value: number) => {
  return value != null ? value.toLocaleString('zh-CN', { maximumFractionDigits: 4 }) : '0'
}

const formatMoney = (value: number) => {
  return value != null ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
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
  margin-bottom: 20px;

  .report-title {
    font-size: 22px;
    font-weight: bold;
    margin: 0;
    color: #000;
  }
}

.print-filters {
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;

  .filter-label {
    font-weight: bold;
    margin-right: 10px;
  }

  .filter-item {
    margin-right: 20px;
  }
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;

  th,
  td {
    border: 1px solid #000;
    padding: 6px 8px;
    font-size: 12px;
  }

  th {
    background: #f5f5f5;
    font-weight: bold;
    text-align: center;
  }

  .text-center {
    text-align: center;
  }

  .text-right {
    text-align: right;
  }

  .summary-row {
    background: #fafafa;

    td {
      font-weight: bold;
    }
  }
}

.print-actions {
  text-align: center;
  margin-top: 20px;
}

@media print {
  .print-actions {
    display: none !important;
  }

  .print-container {
    padding: 0;
  }

  .print-filters {
    background: none;
    padding: 0;
    margin-bottom: 10px;
  }

  :deep(.ant-modal-close),
  :deep(.ant-modal-header) {
    display: none !important;
  }
}
</style>
