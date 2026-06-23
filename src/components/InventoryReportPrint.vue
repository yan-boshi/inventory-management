<template>
  <a-modal
    title=""
    :width="1300"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
  >
    <div class="print-container">
      <div class="print-header">
        <h1 class="report-title">进销存明细表</h1>
      </div>

      <div class="print-filters">
        <span class="filter-item">年份：{{ searchParams.year }}年</span>
        <span v-if="searchParams.month" class="filter-item">月份：{{ searchParams.month }}月</span>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th v-if="isVisible('product_name')" rowspan="2">产品名称</th>
            <th v-if="isVisible('product_code')" rowspan="2">产品代码</th>
            <th v-if="isVisible('model')" rowspan="2">规格型号</th>
            <th v-if="isVisible('unit')" rowspan="2">单位</th>
            <th v-if="hasGroup('opening')" :colspan="groupVisibleCount('opening')" class="group-header">期初</th>
            <th v-if="hasGroup('inbound')" :colspan="groupVisibleCount('inbound')" class="group-header">本期入库</th>
            <th v-if="hasGroup('outbound')" :colspan="groupVisibleCount('outbound')" class="group-header">本期出库</th>
            <th v-if="hasGroup('closing')" :colspan="groupVisibleCount('closing')" class="group-header">结余</th>
          </tr>
          <tr>
            <!-- 期初 -->
            <th v-if="isVisible('opening_stock')">数量</th>
            <th v-if="isVisible('opening_stock_included_price')">含税单价</th>
            <th v-if="isVisible('opening_stock_excluded_price')">未税单价</th>
            <th v-if="isVisible('opening_stock_included_amount')">含税金额</th>
            <th v-if="isVisible('opening_stock_excluded_amount')">未税金额</th>
            <!-- 本期入库 -->
            <th v-if="isVisible('inbound_quantity')">数量</th>
            <th v-if="isVisible('inbound_included_price')">含税单价</th>
            <th v-if="isVisible('inbound_excluded_price')">未税单价</th>
            <th v-if="isVisible('inbound_included_amount')">含税金额</th>
            <th v-if="isVisible('inbound_excluded_amount')">未税金额</th>
            <!-- 本期出库 -->
            <th v-if="isVisible('outbound_quantity')">数量</th>
            <th v-if="isVisible('outbound_included_price')">含税单价</th>
            <th v-if="isVisible('outbound_excluded_price')">未税单价</th>
            <th v-if="isVisible('outbound_included_amount')">含税金额</th>
            <th v-if="isVisible('outbound_excluded_amount')">未税金额</th>
            <!-- 结余 -->
            <th v-if="isVisible('closing_stock')">数量</th>
            <th v-if="isVisible('closing_stock_included_price')">含税单价</th>
            <th v-if="isVisible('closing_stock_excluded_price')">未税单价</th>
            <th v-if="isVisible('closing_stock_included_amount')">含税金额</th>
            <th v-if="isVisible('closing_stock_excluded_amount')">未税金额</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in data" :key="index">
            <td v-if="isVisible('product_name')">{{ item.product_name }}</td>
            <td v-if="isVisible('product_code')">{{ item.product_code }}</td>
            <td v-if="isVisible('model')">{{ item.model || '-' }}</td>
            <td v-if="isVisible('unit')" class="text-center">{{ item.unit || '-' }}</td>
            <!-- 期初 -->
            <td v-if="isVisible('opening_stock')" class="text-right">{{ formatNumber(item.opening_stock) }}</td>
            <td v-if="isVisible('opening_stock_included_price')" class="text-right">{{ formatMoney(item.opening_stock_included_price) }}</td>
            <td v-if="isVisible('opening_stock_excluded_price')" class="text-right">{{ formatMoney(item.opening_stock_excluded_price) }}</td>
            <td v-if="isVisible('opening_stock_included_amount')" class="text-right">{{ formatMoney(item.opening_stock_included_amount) }}</td>
            <td v-if="isVisible('opening_stock_excluded_amount')" class="text-right">{{ formatMoney(item.opening_stock_excluded_amount) }}</td>
            <!-- 本期入库 -->
            <td v-if="isVisible('inbound_quantity')" class="text-right" style="color: #52c41a">{{ formatNumber(item.inbound_quantity) }}</td>
            <td v-if="isVisible('inbound_included_price')" class="text-right">{{ formatMoney(item.inbound_included_price) }}</td>
            <td v-if="isVisible('inbound_excluded_price')" class="text-right">{{ formatMoney(item.inbound_excluded_price) }}</td>
            <td v-if="isVisible('inbound_included_amount')" class="text-right">{{ formatMoney(item.inbound_included_amount) }}</td>
            <td v-if="isVisible('inbound_excluded_amount')" class="text-right">{{ formatMoney(item.inbound_excluded_amount) }}</td>
            <!-- 本期出库 -->
            <td v-if="isVisible('outbound_quantity')" class="text-right" style="color: #ff4d4f">{{ formatNumber(item.outbound_quantity) }}</td>
            <td v-if="isVisible('outbound_included_price')" class="text-right">{{ formatMoney(item.outbound_included_price) }}</td>
            <td v-if="isVisible('outbound_excluded_price')" class="text-right">{{ formatMoney(item.outbound_excluded_price) }}</td>
            <td v-if="isVisible('outbound_included_amount')" class="text-right">{{ formatMoney(item.outbound_included_amount) }}</td>
            <td v-if="isVisible('outbound_excluded_amount')" class="text-right">{{ formatMoney(item.outbound_excluded_amount) }}</td>
            <!-- 结余 -->
            <td v-if="isVisible('closing_stock')" class="text-right"><strong>{{ formatNumber(item.closing_stock) }}</strong></td>
            <td v-if="isVisible('closing_stock_included_price')" class="text-right">{{ formatMoney(item.closing_stock_included_price) }}</td>
            <td v-if="isVisible('closing_stock_excluded_price')" class="text-right">{{ formatMoney(item.closing_stock_excluded_price) }}</td>
            <td v-if="isVisible('closing_stock_included_amount')" class="text-right"><strong>{{ formatMoney(item.closing_stock_included_amount) }}</strong></td>
            <td v-if="isVisible('closing_stock_excluded_amount')" class="text-right"><strong>{{ formatMoney(item.closing_stock_excluded_amount) }}</strong></td>
          </tr>
        </tbody>
        <tfoot v-if="data.length > 0">
          <tr class="summary-row">
            <td :colspan="basicColCount" class="text-right"><strong>合计</strong></td>
            <!-- 期初合计 -->
            <td v-if="isVisible('opening_stock')" class="text-right"><strong>{{ formatNumber(totals.opening_stock) }}</strong></td>
            <td v-if="isVisible('opening_stock_included_price')"></td>
            <td v-if="isVisible('opening_stock_excluded_price')"></td>
            <td v-if="isVisible('opening_stock_included_amount')" class="text-right"><strong>{{ formatMoney(totals.opening_stock_included_amount) }}</strong></td>
            <td v-if="isVisible('opening_stock_excluded_amount')" class="text-right"><strong>{{ formatMoney(totals.opening_stock_excluded_amount) }}</strong></td>
            <!-- 入库合计 -->
            <td v-if="isVisible('inbound_quantity')" class="text-right"><strong>{{ formatNumber(totals.inbound_quantity) }}</strong></td>
            <td v-if="isVisible('inbound_included_price')"></td>
            <td v-if="isVisible('inbound_excluded_price')"></td>
            <td v-if="isVisible('inbound_included_amount')" class="text-right"><strong>{{ formatMoney(totals.inbound_included_amount) }}</strong></td>
            <td v-if="isVisible('inbound_excluded_amount')" class="text-right"><strong>{{ formatMoney(totals.inbound_excluded_amount) }}</strong></td>
            <!-- 出库合计 -->
            <td v-if="isVisible('outbound_quantity')" class="text-right"><strong>{{ formatNumber(totals.outbound_quantity) }}</strong></td>
            <td v-if="isVisible('outbound_included_price')"></td>
            <td v-if="isVisible('outbound_excluded_price')"></td>
            <td v-if="isVisible('outbound_included_amount')" class="text-right"><strong>{{ formatMoney(totals.outbound_included_amount) }}</strong></td>
            <td v-if="isVisible('outbound_excluded_amount')" class="text-right"><strong>{{ formatMoney(totals.outbound_excluded_amount) }}</strong></td>
            <!-- 结余合计 -->
            <td v-if="isVisible('closing_stock')" class="text-right"><strong>{{ formatNumber(totals.closing_stock) }}</strong></td>
            <td v-if="isVisible('closing_stock_included_price')"></td>
            <td v-if="isVisible('closing_stock_excluded_price')"></td>
            <td v-if="isVisible('closing_stock_included_amount')" class="text-right"><strong>{{ formatMoney(totals.closing_stock_included_amount) }}</strong></td>
            <td v-if="isVisible('closing_stock_excluded_amount')" class="text-right"><strong>{{ formatMoney(totals.closing_stock_excluded_amount) }}</strong></td>
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
const allColumnKeys = [
  'product_name', 'product_code', 'model', 'unit',
  'opening_stock', 'opening_stock_included_price', 'opening_stock_excluded_price', 'opening_stock_included_amount', 'opening_stock_excluded_amount',
  'inbound_quantity', 'inbound_included_price', 'inbound_excluded_price', 'inbound_included_amount', 'inbound_excluded_amount',
  'outbound_quantity', 'outbound_included_price', 'outbound_excluded_price', 'outbound_included_amount', 'outbound_excluded_amount',
  'closing_stock', 'closing_stock_included_price', 'closing_stock_excluded_price', 'closing_stock_included_amount', 'closing_stock_excluded_amount',
]

const groupKeys: Record<string, string[]> = {
  opening: ['opening_stock', 'opening_stock_included_price', 'opening_stock_excluded_price', 'opening_stock_included_amount', 'opening_stock_excluded_amount'],
  inbound: ['inbound_quantity', 'inbound_included_price', 'inbound_excluded_price', 'inbound_included_amount', 'inbound_excluded_amount'],
  outbound: ['outbound_quantity', 'outbound_included_price', 'outbound_excluded_price', 'outbound_included_amount', 'outbound_excluded_amount'],
  closing: ['closing_stock', 'closing_stock_included_price', 'closing_stock_excluded_price', 'closing_stock_included_amount', 'closing_stock_excluded_amount'],
}
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
  visibleColumns: () => [...allColumnKeys]
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const isVisible = (key: string) => props.visibleColumns.includes(key)

const hasGroup = (group: string) => {
  return groupKeys[group]?.some(key => isVisible(key)) || false
}

const groupVisibleCount = (group: string) => {
  return groupKeys[group]?.filter(key => isVisible(key)).length || 0
}

const basicColCount = computed(() => {
  const basicKeys = ['product_name', 'product_code', 'model', 'unit']
  return basicKeys.filter(key => isVisible(key)).length
})

const totals = computed(() => {
  return props.data.reduce((acc, item) => {
    acc.opening_stock += item.opening_stock || 0
    acc.opening_stock_included_amount += item.opening_stock_included_amount || 0
    acc.opening_stock_excluded_amount += item.opening_stock_excluded_amount || 0
    acc.inbound_quantity += item.inbound_quantity || 0
    acc.inbound_included_amount += item.inbound_included_amount || 0
    acc.inbound_excluded_amount += item.inbound_excluded_amount || 0
    acc.outbound_quantity += item.outbound_quantity || 0
    acc.outbound_included_amount += item.outbound_included_amount || 0
    acc.outbound_excluded_amount += item.outbound_excluded_amount || 0
    acc.closing_stock += item.closing_stock || 0
    acc.closing_stock_included_amount += item.closing_stock_included_amount || 0
    acc.closing_stock_excluded_amount += item.closing_stock_excluded_amount || 0
    return acc
  }, {
    opening_stock: 0,
    opening_stock_included_amount: 0,
    opening_stock_excluded_amount: 0,
    inbound_quantity: 0,
    inbound_included_amount: 0,
    inbound_excluded_amount: 0,
    outbound_quantity: 0,
    outbound_included_amount: 0,
    outbound_excluded_amount: 0,
    closing_stock: 0,
    closing_stock_included_amount: 0,
    closing_stock_excluded_amount: 0,
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

  .group-header {
    background: #e6f7ff;
    font-weight: bold;
    border-bottom: 2px solid #1890ff;
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

</style>

<style lang="scss">
@page {
  size: landscape;
  margin: 5mm;
}

@media print {

  /* 隐藏背景页面，只显示模态框 */
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
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    box-shadow: none !important;
    border: none !important;
    top: 0 !important;
    left: 0 !important;
  }

  .ant-modal-close,
  .ant-modal-header {
    display: none !important;
  }

  .ant-modal-body {
    padding: 0 !important;
  }

  .print-actions {
    display: none !important;
  }

  .print-container {
    padding: 0;
    font-size: 10px;
  }

  .print-header .report-title {
    font-size: 16px;
  }

  .print-filters {
    background: none;
    padding: 0;
    margin-bottom: 5px;
    font-size: 10px;
  }

  .print-table {
    th, td {
      padding: 2px 4px;
      font-size: 9px;
    }
  }
}
</style>
