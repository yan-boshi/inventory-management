<template>
  <a-modal
    title=""
    :width="1200"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
  >
    <div class="print-container">
      <div class="print-header">
        <h1 class="report-title">入库费用明细表</h1>
      </div>

      <div class="print-filters">
        <span class="filter-label">筛选条件：</span>
        <span v-if="searchParams.startDate" class="filter-item">
          入库时间：{{ searchParams.startDate }} 至 {{ searchParams.endDate }}
        </span>
        <span v-if="searchParams.orderNumber" class="filter-item">
          入库单号：{{ searchParams.orderNumber }}
        </span>
        <span v-if="searchParams.purchaseOrderNumber" class="filter-item">
          采购合同编号：{{ searchParams.purchaseOrderNumber }}
        </span>
        <span v-if="searchParams.productKeyword" class="filter-item">
          商品关键字：{{ searchParams.productKeyword }}
        </span>
        <span v-if="!hasFilters" class="filter-item">全部数据</span>
      </div>

      <div class="table-wrapper">
        <table class="print-table">
          <thead>
            <tr>
              <th v-if="isVisible('order_number')" rowspan="2">入库单号</th>
              <th v-if="isVisible('warehousing_time')" rowspan="2">入库时间</th>
              <th v-if="isVisible('contract_number')" rowspan="2">采购合同编号</th>
              <th v-if="isVisible('product_code')" rowspan="2">商品编码</th>
              <th v-if="isVisible('product_name')" rowspan="2">商品名称</th>
              <th v-if="isVisible('model')" rowspan="2">规格型号</th>
              <th v-if="isVisible('unit')" rowspan="2">单位</th>
              <th v-if="isVisible('quantity')" rowspan="2">入库数量</th>
              <th v-if="isVisible('tax_included_price')" rowspan="2">含税单价</th>
              <th v-if="isVisible('total_price')" rowspan="2">含税金额</th>
              <th v-if="hasVisibleExpenseCols" :colspan="visibleExpenseColCount">入库费用</th>
              <th v-if="hasVisiblePurchaseCols" :colspan="visiblePurchaseColCount">采购费用</th>
              <th v-if="isVisible('total_expenses')" rowspan="2">费用合计</th>
              <th v-if="isVisible('warehousing_person')" rowspan="2">入库人</th>
              <th v-if="isVisible('remarks')" rowspan="2">备注</th>
            </tr>
            <tr>
              <th v-if="isVisible('express_delivery_fee')">快递费</th>
              <th v-if="isVisible('transportation_fee')">运杂费</th>
              <th v-if="isVisible('customs_fee')">报关费</th>
              <th v-if="isVisible('warehousing_other_fee')">其他</th>
              <th v-if="isVisible('warehousing_expense_subtotal')">小计</th>
              <th v-if="isVisible('purchase_transportation_fee')">交通费</th>
              <th v-if="isVisible('purchase_entertainment_fee')">招待费</th>
              <th v-if="isVisible('purchase_gift_fee')">礼品费</th>
              <th v-if="isVisible('purchase_other_fee')">其他</th>
              <th v-if="isVisible('purchase_expense_subtotal')">小计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in data" :key="index">
              <td v-if="isVisible('order_number')">{{ item.order_number }}</td>
              <td v-if="isVisible('warehousing_time')">{{ formatDate(item.warehousing_time) }}</td>
              <td v-if="isVisible('contract_number')">{{ item.contract_number || '-' }}</td>
              <td v-if="isVisible('product_code')">{{ item.product_code }}</td>
              <td v-if="isVisible('product_name')">{{ item.product_name }}</td>
              <td v-if="isVisible('model')">{{ item.model || '-' }}</td>
              <td v-if="isVisible('unit')" class="text-center">{{ item.unit || '-' }}</td>
              <td v-if="isVisible('quantity')" class="text-right">{{ formatNumber(item.quantity) }}</td>
              <td v-if="isVisible('tax_included_price')" class="text-right">{{ formatMoney(item.tax_included_price) }}</td>
              <td v-if="isVisible('total_price')" class="text-right">{{ formatMoney(item.total_price) }}</td>
              <td v-if="isVisible('express_delivery_fee')" class="text-right">{{ formatMoney(item.express_delivery_fee) }}</td>
              <td v-if="isVisible('transportation_fee')" class="text-right">{{ formatMoney(item.transportation_fee) }}</td>
              <td v-if="isVisible('customs_fee')" class="text-right">{{ formatMoney(item.customs_fee) }}</td>
              <td v-if="isVisible('warehousing_other_fee')" class="text-right">{{ formatMoney(item.warehousing_other_fee) }}</td>
              <td v-if="isVisible('warehousing_expense_subtotal')" class="text-right"><strong>{{ formatMoney(item.warehousing_expense_subtotal) }}</strong></td>
              <td v-if="isVisible('purchase_transportation_fee')" class="text-right">{{ formatMoney(item.purchase_transportation_fee) }}</td>
              <td v-if="isVisible('purchase_entertainment_fee')" class="text-right">{{ formatMoney(item.purchase_entertainment_fee) }}</td>
              <td v-if="isVisible('purchase_gift_fee')" class="text-right">{{ formatMoney(item.purchase_gift_fee) }}</td>
              <td v-if="isVisible('purchase_other_fee')" class="text-right">{{ formatMoney(item.purchase_other_fee) }}</td>
              <td v-if="isVisible('purchase_expense_subtotal')" class="text-right"><strong>{{ formatMoney(item.purchase_expense_subtotal) }}</strong></td>
              <td v-if="isVisible('total_expenses')" class="text-right" style="color: #f5222d; font-weight: bold">
                {{ formatMoney(item.total_expenses) }}
              </td>
              <td v-if="isVisible('warehousing_person')">{{ item.warehousing_person || '-' }}</td>
              <td v-if="isVisible('remarks')">{{ item.remarks || '-' }}</td>
            </tr>
          </tbody>
          <tfoot v-if="data.length > 0">
            <tr class="summary-row">
              <td :colspan="basicColCount" class="text-right"><strong>合计</strong></td>
              <td v-if="isVisible('total_price')" class="text-right"><strong>{{ formatMoney(totals.total_price) }}</strong></td>
              <td v-if="isVisible('express_delivery_fee')" class="text-right">{{ formatMoney(totals.express_delivery_fee) }}</td>
              <td v-if="isVisible('transportation_fee')" class="text-right">{{ formatMoney(totals.transportation_fee) }}</td>
              <td v-if="isVisible('customs_fee')" class="text-right">{{ formatMoney(totals.customs_fee) }}</td>
              <td v-if="isVisible('warehousing_other_fee')" class="text-right">{{ formatMoney(totals.warehousing_other_fee) }}</td>
              <td v-if="isVisible('warehousing_expense_subtotal')" class="text-right"><strong>{{ formatMoney(totals.warehousing_expense_subtotal) }}</strong></td>
              <td v-if="isVisible('purchase_transportation_fee')" class="text-right">{{ formatMoney(totals.purchase_transportation_fee) }}</td>
              <td v-if="isVisible('purchase_entertainment_fee')" class="text-right">{{ formatMoney(totals.purchase_entertainment_fee) }}</td>
              <td v-if="isVisible('purchase_gift_fee')" class="text-right">{{ formatMoney(totals.purchase_gift_fee) }}</td>
              <td v-if="isVisible('purchase_other_fee')" class="text-right">{{ formatMoney(totals.purchase_other_fee) }}</td>
              <td v-if="isVisible('purchase_expense_subtotal')" class="text-right"><strong>{{ formatMoney(totals.purchase_expense_subtotal) }}</strong></td>
              <td v-if="isVisible('total_expenses')" class="text-right" style="color: #f5222d; font-weight: bold">
                {{ formatMoney(totals.total_expenses) }}
              </td>
              <td v-if="isVisible('warehousing_person')"></td>
              <td v-if="isVisible('remarks')"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="print-actions">
        <a-button type="primary" @click="handlePrint">打印</a-button>
        <a-button @click="handleCancel" style="margin-left: 8px">取消</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts">
const defaultVisibleColumns = [
  'order_number', 'warehousing_time', 'contract_number', 'product_code', 'product_name', 'model', 'unit',
  'quantity', 'tax_included_price', 'total_price', 'express_delivery_fee', 'transportation_fee', 'customs_fee',
  'warehousing_other_fee', 'warehousing_expense_subtotal', 'purchase_transportation_fee', 'purchase_entertainment_fee',
  'purchase_gift_fee', 'purchase_other_fee', 'purchase_expense_subtotal', 'total_expenses', 'warehousing_person', 'remarks'
]
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { WarehousingExpenseReportItem, WarehousingExpenseReportParams } from '@/types'

const props = withDefaults(defineProps<{
  visible: boolean
  data: WarehousingExpenseReportItem[]
  searchParams: WarehousingExpenseReportParams
  visibleColumns?: string[]
}>(), {
  visibleColumns: () => defaultVisibleColumns
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const isVisible = (key: string) => props.visibleColumns.includes(key)

const hasFilters = computed(() => {
  return props.searchParams.startDate || props.searchParams.orderNumber ||
    props.searchParams.contractNumber || props.searchParams.productKeyword
})

// 入库费用列
const expenseKeys = ['express_delivery_fee', 'transportation_fee', 'customs_fee', 'warehousing_other_fee', 'warehousing_expense_subtotal']
const hasVisibleExpenseCols = computed(() => expenseKeys.some(key => isVisible(key)))
const visibleExpenseColCount = computed(() => expenseKeys.filter(key => isVisible(key)).length)

// 采购费用列
const purchaseKeys = ['purchase_transportation_fee', 'purchase_entertainment_fee', 'purchase_gift_fee', 'purchase_other_fee', 'purchase_expense_subtotal']
const hasVisiblePurchaseCols = computed(() => purchaseKeys.some(key => isVisible(key)))
const visiblePurchaseColCount = computed(() => purchaseKeys.filter(key => isVisible(key)).length)

// 基础列数量
const basicColCount = computed(() => {
  const basicKeys = ['order_number', 'warehousing_time', 'contract_number', 'product_code', 'product_name', 'model', 'unit', 'quantity', 'tax_included_price']
  return basicKeys.filter(key => isVisible(key)).length
})

const totals = computed(() => {
  return props.data.reduce((acc, item) => {
    acc.total_price += item.total_price || 0
    acc.express_delivery_fee += item.express_delivery_fee || 0
    acc.transportation_fee += item.transportation_fee || 0
    acc.customs_fee += item.customs_fee || 0
    acc.warehousing_other_fee += item.warehousing_other_fee || 0
    acc.warehousing_expense_subtotal += item.warehousing_expense_subtotal || 0
    acc.purchase_transportation_fee += item.purchase_transportation_fee || 0
    acc.purchase_entertainment_fee += item.purchase_entertainment_fee || 0
    acc.purchase_gift_fee += item.purchase_gift_fee || 0
    acc.purchase_other_fee += item.purchase_other_fee || 0
    acc.purchase_expense_subtotal += item.purchase_expense_subtotal || 0
    acc.total_expenses += item.total_expenses || 0
    return acc
  }, {
    total_price: 0,
    express_delivery_fee: 0,
    transportation_fee: 0,
    customs_fee: 0,
    warehousing_other_fee: 0,
    warehousing_expense_subtotal: 0,
    purchase_transportation_fee: 0,
    purchase_entertainment_fee: 0,
    purchase_gift_fee: 0,
    purchase_other_fee: 0,
    purchase_expense_subtotal: 0,
    total_expenses: 0,
  })
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return dateStr.substring(0, 10)
}

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
  font-size: 12px;
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

.table-wrapper {
  overflow-x: auto;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  min-width: 1100px;

  th,
  td {
    border: 1px solid #000;
    padding: 4px 6px;
    font-size: 11px;
    white-space: nowrap;
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

</style>

<style lang="scss">
@page {
  size: landscape;
}

@media print {

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

  .table-wrapper {
    overflow: visible;
  }

  .print-filters {
    background: none;
    padding: 0;
    margin-bottom: 5px;
    font-size: 10px;
  }

  .print-header .report-title {
    font-size: 16px;
  }

  .print-table {
    min-width: 0 !important;

    th, td {
      padding: 1px 3px;
      font-size: 8px;
      white-space: normal !important;
      word-break: break-all;
    }
  }
}
</style>
