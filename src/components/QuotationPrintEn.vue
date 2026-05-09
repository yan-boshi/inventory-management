<template>
  <a-modal v-model:open="visible" title="" width="900px" :footer="null" @cancel="handleCancel">
    <div ref="printContent" class="print-content">
      <!-- 页面头 -->
      <div class="page-header">
        <h1 class="company-name">Shenzhen Xusida Optoelectronic Technology Co., Ltd.</h1>
        <h2 class="quotation-title">Quotation</h2>
      </div>

      <!-- 页面上面部分 -->
      <div class="top-section">
        <div class="info-row">
          <div class="info-item">
            <span class="label">Quotation No.：</span>
            <span class="value">{{ printData?.quotation_number || quotationData?.quotation_number || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Customer：</span>
            <span class="value">{{ customerData?.customer_name || printData?.customer_name || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 页面中间部分：表格 -->
      <table class="product-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Product Name</th>
            <th>Model</th>
            <th>Description</th>
            <th>Unit</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
            <th>Status</th>
            <th>Remarks</th>
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
            <td>{{ formatPrice(item.unit_price) }}</td>
            <td>{{ formatPrice(item.total_amount) }}</td>
            <td>{{ getStatusText(item.status) }}</td>
            <td>{{ item.remarks || '-' }}</td>
          </tr>
          <!-- 金额总计行 -->
          <tr class="total-row">
            <td colspan="10" class="total-label">Total Amount (Tax Included)：</td>
            <td colspan="2">
              <div>{{ formatPrice(totalAmount) }}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 报价说明 -->
      <div class="note-section">
        <div class="note-item">
          <span class="note-label">Validity Period：</span>
          <span class="note-value">{{ printData?.validity_period || quotationData?.validity_period || '10 working days from the date of quotation' }}</span>
        </div>
        <div class="note-item">
          <span class="note-label">Delivery Method：</span>
          <span class="note-value">{{ getDeliveryMethodText(printData?.delivery_method || quotationData?.delivery_method) }}</span>
        </div>
        <div class="note-item">
          <span class="note-label">Tax Rate：</span>
          <span class="note-value">{{ printData?.tax_rate || quotationData?.tax_rate || 13 }}%</span>
        </div>
      </div>

      <!-- 页面底部部分 -->
      <div class="footer-section">
        <div class="footer-left">
          <div class="footer-title">Supplier (Party B) Information</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">Company Name：</span>
              <span class="footer-value">Shenzhen Xusida Optoelectronic Technology Co., Ltd.</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Address：</span>
              <span class="footer-value">Room 602, Jingfeng Building, No. 42 Wuhe Avenue (South), Nankeng Community, Bantian Street, Longgang District, Shenzhen</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">Signature & Seal：</span>
          </div>
        </div>
        <div class="footer-right">
          <div class="footer-title">Customer (Party A) Information</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">Company Name：</span>
              <span class="footer-value">{{ customerData?.customer_name || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Address：</span>
              <span class="footer-value">{{ customerData?.receiver_address || customerData?.register_address || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Contact：</span>
              <span class="footer-value">{{ customerData?.contact || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Phone：</span>
              <span class="footer-value">{{ customerData?.contact_phone || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Email：</span>
              <span class="footer-value">{{ customerData?.customer_email || '-' }}</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">Signature & Seal：</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <a-space>
        <a-button @click="handleCancel">Cancel</a-button>
        <a-button type="primary" @click="handlePrint">Print</a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import type { Quotation, QuotationItem } from '@/types'
import { customersApi } from '@/api/customers'

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

const formatDate = (date: string | undefined) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const formatPrice = (price: number | undefined) => {
  const numPrice = price || 0
  return `￥${numPrice.toFixed(2)}`
}

const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: 'In Quotation',
    2: 'Sold'
  }
  return textMap[status] || '-'
}

const getDeliveryMethodText = (method: string) => {
  const methodMap: Record<string, string> = {
    '送货上门': 'Door-to-door Delivery',
    '自提': 'Self-pickup',
    '物流快递': 'Express Delivery'
  }
  return methodMap[method] || method || '-'
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
  min-height: 800px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;

  .company-name {
    font-size: 22px;
    font-weight: bold;
    margin: 0 0 12px 0;
    color: #000;
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
      min-width: 140px;
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
      min-width: 110px;
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
