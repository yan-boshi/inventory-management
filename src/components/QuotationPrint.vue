<template>
  <a-modal v-model:open="visible" title="" width="900px" :footer="null" @cancel="handleCancel">
    <div ref="printContent" class="print-content">
      <!-- 页面头 -->
      <div class="page-header">
        <h1 class="company-name">{{ t.quotation.companyName }}</h1>
        <div class="company-info">
          <span class="info-line">{{ t.quotation.address }}{{ t.quotation.addressValue }}</span>
          <span class="info-line">{{ t.quotation.tel }}{{ t.quotation.telValue }}</span>
        </div>
        <h2 class="quotation-title">{{ t.quotation.title }}</h2>
      </div>

      <!-- 页面上面部分 -->
      <div class="top-section">
        <div class="info-row">
          <div class="info-item">
            <span class="label">{{ t.quotation.quotationNo }}</span>
            <span class="value">{{
              printData?.quotation_number || quotationData?.quotation_number || '-'
            }}</span>
          </div>
          <div class="info-item">
            <span class="label">{{ t.quotation.customer }}</span>
            <span class="value">{{
              customerData?.customer_name || printData?.customer_name || '-'
            }}</span>
          </div>
        </div>
      </div>

      <!-- 页面中间部分：表格 -->
      <table class="product-table">
        <thead>
          <tr>
            <th>{{ t.quotation.no }}</th>
            <th>{{ t.quotation.productName }}</th>
            <th>{{ t.quotation.model }}</th>
            <th>{{ t.quotation.description }}</th>
            <th>{{ t.quotation.unit }}</th>
            <th>{{ t.quotation.quantity }}</th>
            <th>{{ t.quotation.unitPrice }}</th>
            <th>{{ t.common.remarks }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ item.product_name || '-' }}</td>
            <td>{{ item.model || '-' }}</td>
            <td>{{ item.description || '-' }}</td>
            <td>{{ item.unit || '-' }}</td>
            <td>{{ item.quantity || '-' }}</td>
            <td>{{ item.unit_price }}</td>
            <td>{{ item.remarks || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 报价说明 -->
      <div class="note-section">
        <div class="note-item">
          <span class="note-label">{{ t.quotation.currency }}</span>
          <span class="note-value">{{
            printData?.currency || quotationData?.currency || 'CNY'
          }}</span>
        </div>
        <div class="note-item">
          <span class="note-label">{{ t.quotation.validity }}</span>
          <span class="note-value">{{
            printData?.validity_period || quotationData?.validity_period || t.quotation.validityPlaceholder
          }}</span>
        </div>
        <div class="note-item">
          <span class="note-label">{{ t.quotation.delivery }}</span>
          <span class="note-value">{{
            getDeliveryText(printData?.delivery_method || quotationData?.delivery_method)
          }}</span>
        </div>
        <div class="note-item">
          <span class="note-label">{{ t.quotation.taxRate }}</span>
          <span class="note-value"
            >{{ printData?.tax_rate || quotationData?.tax_rate || 13 }}%</span
          >
        </div>
        <div class="note-item" v-if="printData?.remarks || quotationData?.remarks">
          <span class="note-label">{{ t.quotation.remarks }}</span>
          <span class="note-value">{{ printData?.remarks || quotationData?.remarks }}</span>
        </div>
      </div>

      <!-- 页面底部部分 -->
      <!-- <div class="footer-section">
        <div class="footer-left">
          <div class="footer-title">供方（乙方）信息</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">单位名称：</span>
              <span class="footer-value">深圳市旭思达光电科技有限公司</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">地址：</span>
              <span class="footer-value">深圳市龙岗区坂田街道五和大道（南）景丰大厦602室</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">签字盖章：</span>
          </div>
        </div>
        <div class="footer-right">
          <div class="footer-title">需方（甲方）信息</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">单位名称：</span>
              <span class="footer-value">{{ customerData?.customer_name || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">地址：</span>
              <span class="footer-value">{{ customerData?.receiver_address || customerData?.register_address || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">联系人：</span>
              <span class="footer-value">{{ customerData?.contact || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">联系电话：</span>
              <span class="footer-value">{{ customerData?.contact_phone || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">邮箱：</span>
              <span class="footer-value">{{ customerData?.customer_email || '-' }}</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">签字盖章：</span>
          </div>
        </div>
      </div> -->
    </div>

    <div class="modal-footer">
      <a-space>
        <a-button @click="handleCancel">{{ t.common.cancel }}</a-button>
        <a-button type="primary" @click="handlePrint">{{ t.quotation.print }}</a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import type { Quotation, QuotationItem } from '@/types'
import { customersApi } from '@/api/customers'
import { getLocale, type Lang } from '@/locales'

interface Props {
  visible: boolean
  quotation: Quotation | undefined
  printData?: any
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const quotationData = computed(() => props.quotation)
const customerData = ref()

// 获取语言设置，优先从 printData 获取，其次从 quotation 获取，默认中文
const lang = computed<Lang>(() => {
  return props.printData?.lang || props.quotation?.lang || 'zh'
})

// 获取当前语言的翻译
const t = computed(() => getLocale(lang.value))

onMounted(async () => {
  const customerCode = props.quotation?.customer_code || props.printData?.customer_code
  if (customerCode) {
    try {
      const customer = await customersApi.getAll({ code: customerCode })
      customerData.value = customer.data[0]
    } catch (error) {
      console.error('获取客户信息失败:', error)
    }
  }
})

const items = computed(() => {
  if (props.printData?.quotation_items) {
    return props.printData.quotation_items
  }
  if (props.quotation?.quotation_items && typeof props.quotation.quotation_items === 'string') {
    try {
      return JSON.parse(props.quotation.quotation_items)
    } catch {
      return []
    }
  }
  return []
})

const totalAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + (item.total_amount || 0), 0)
})

const amountInWords = computed(() => {
  return numberToChinese(totalAmount.value)
})

const numberToChinese = (num: number): string => {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟', '万', '亿']
  let str = ''
  let unitIndex = 0
  // @ts-expect-error - zeroFlag is used in logic
  let zeroFlag = false

  if (num === 0) {
    return '零元整'
  }

  const numStr = Math.floor(num).toString()

  for (let i = 0; i < numStr.length; i++) {
    const digit = parseInt(numStr[i])
    if (digit === 0) {
      zeroFlag = true
    } else {
      zeroFlag = false
      const currentDigit = digits[digit] || ''
      if (unitIndex > 0) {
        str += units[unitIndex]
      }
      str += currentDigit
      unitIndex++
    }
  }

  str += '元'
  if (numStr.includes('.')) {
    const decimal = numStr.split('.')[1]
    if (decimal) {
      str += digits[parseInt(decimal[0])] + '角'
      if (decimal.length > 1) {
        str += digits[parseInt(decimal[1])] + '分'
      }
    }
  }

  return str + '整'
}

const formatDate = (date: string | undefined) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const formatPrice = (price: number | undefined) => {
  const numPrice = price || 0
  return `￥${numPrice.toFixed(2)}`
}

const getStatusText = (status: number) => {
  if (status === 1) return t.value.quotation.quoting
  if (status === 2) return t.value.quotation.sold
  return '-'
}

const getDeliveryText = (delivery: string | undefined) => {
  if (!delivery) return t.value.quotation.deliveryOptions.doorToDoor
  if (delivery === '送货上门') return t.value.quotation.deliveryOptions.doorToDoor
  if (delivery === '自提') return t.value.quotation.deliveryOptions.selfPickup
  if (delivery === '物流快递') return t.value.quotation.deliveryOptions.express
  if (delivery === '其他') return t.value.quotation.deliveryOptions.other
  return delivery
}

const handleCancel = () => {
  visible.value = false
}

const handlePrint = () => {
  window.print()
}
</script>

<style scoped lang="scss">
.print-content {
  padding: 40px 20px;
  background: white;
  // min-height: 800px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;

  .company-name {
    font-size: 22px;
    font-weight: bold;
    margin: 0 0 8px 0;
    color: #000;
  }

  .company-info {
    margin-bottom: 12px;

    .info-line {
      display: block;
      font-size: 13px;
      color: #595959;
      margin-bottom: 4px;
    }
  }

  .quotation-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
    color: #000;
  }
}

.top-section {
  margin-bottom: 30px;

  .info-row {
    display: flex;
    gap: 40px;
  }

  .info-item {
    flex: 1;
    font-size: 14px;
    color: #000;

    .label {
      color: #595959;
      margin-right: 8px;
    }

    .value {
      color: #000;
    }
  }
}

.product-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;

  th {
    padding: 10px 8px;
    background: #f5f5f5;
    border: 1px solid #d9d9d9;
    font-weight: 500;
    font-size: 13px;
    color: #262626;
    text-align: center;
  }

  td {
    padding: 10px 8px;
    border: 1px solid #e8e8e8;
    text-align: center;
    font-size: 13px;
    color: #000;
    vertical-align: middle;
  }

  .total-row {
    td {
      font-weight: bold;
      background: #fafafa;

      .total-label {
        text-align: right;
        padding-right: 20px;
      }
    }
  }

  .total-in-words {
    font-size: 12px;
    color: #595959;
    margin-top: 4px;
  }
}

.note-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #fafafa;
  border: 1px solid #e8e8e8;

  .note-item {
    margin-bottom: 12px;
    font-size: 14px;
    color: #000;

    &:last-child {
      margin-bottom: 0;
    }

    .note-label {
      color: #595959;
      margin-right: 12px;
      min-width: 100px;
    }

    .note-value {
      color: #000;
    }
  }
}

.footer-section {
  display: flex;
  margin-top: 40px;
  gap: 40px;
  align-items: stretch;

  .footer-left,
  .footer-right {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .footer-title {
    font-size: 16px;
    font-weight: 500;
    color: #262626;
    margin-bottom: 16px;
  }

  .footer-content {
    border: 1px solid #e8e8e8;
    padding: 16px;
    background: #fafafa;
    margin-bottom: auto;
  }

  .footer-item {
    margin-bottom: 12px;
    font-size: 14px;
    color: #000;
    display: flex;
    align-items: center;

    .footer-label {
      color: #595959;
      min-width: 80px;
    }

    .footer-value {
      flex: 1;
      color: #000;
    }
  }

  .sign-box {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed #d9d9d9;

    .sign-label {
      color: #595959;
      font-size: 14px;
    }
  }
}

.modal-footer {
  text-align: right;
  padding: 16px 0 0 0;
  border-top: 1px solid #f0f0f0;
}

@media print {
  .modal-footer,
  :deep(.ant-modal-close),
  :deep(.ant-modal-header),
  :deep(.ant-modal-wrap) {
    display: none !important;
  }

  .print-content {
    padding: 0;
  }

  :deep(.ant-modal-body) {
    padding: 0 !important;
  }
}
</style>
