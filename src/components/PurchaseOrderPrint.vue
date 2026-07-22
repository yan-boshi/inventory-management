<template>
  <a-modal v-model:open="visible" title="" width="900px" :footer="null" :closable="false" @cancel="handleCancel">
    <div class="lang-switch-bar no-print">
      <a-radio-group v-model:value="lang" size="small">
        <a-radio-button value="zh">中文</a-radio-button>
        <a-radio-button value="en">English</a-radio-button>
      </a-radio-group>
    </div>
    <div ref="printContent" class="print-content">
      <!-- 页面头 -->
      <div class="page-header">
        <h1 class="title">{{ t.purchaseOrderPrint.title }}</h1>
      </div>

      <!-- 页面上面部分 -->
      <div class="top-section">
        <div class="order-number-row">
          <span class="label">{{ t.purchaseOrderPrint.contractNumber }}</span>
          <span class="order-number">{{ orderData?.contract_number || '-' }}</span>
        </div>
        <div class="info-row">
          <div class="info-left">
            <div class="info-item">
              <span class="label">{{ t.purchaseOrderPrint.supplier }}</span>
              <span class="value">{{
                supplierData?.supplier_name || orderData?.supplier_name || '-'
              }}</span>
            </div>
            <div class="info-item">
              <span class="label">{{ t.purchaseOrderPrint.orderDate }}</span>
              <span class="value editable" @click="handleEdit('orderDate')">{{
                formatDate(formData.orderDate)
              }}</span>
            </div>
          </div>
          <div class="info-right">
            <div class="info-item">
              <span class="label">{{ t.purchaseOrderPrint.currency }}</span>
              <span class="value">{{ orderData?.currency || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">{{ t.purchaseOrderPrint.taxRate }}</span>
              <span class="value editable" @click="handleEdit('taxRate')"
                >{{ formData.taxRate }}%</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- 页面中间部分：表格 -->
      <table class="product-table">
        <thead>
          <tr>
            <th>{{ t.purchaseOrderPrint.no }}</th>
            <th>{{ t.purchaseOrderPrint.productCode }}</th>
            <th>{{ t.purchaseOrderPrint.productName }}</th>
            <th>{{ t.purchaseOrderPrint.specification }}</th>
            <th>{{ t.purchaseOrderPrint.quantity }}</th>
            <th>{{ t.purchaseOrderPrint.unit }}</th>
            <th>{{ t.purchaseOrderPrint.taxIncludedPrice }}</th>
            <th>{{ t.purchaseOrderPrint.amount }}</th>
            <th>{{ t.purchaseOrderPrint.deliveryDate }}</th>
            <th style="width: 150px">{{ t.purchaseOrderPrint.remarks }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in JSON.parse(orderData?.purchase_items || '[]')" :key="item.no">
            <td>{{ item.no }}</td>
            <td>{{ item.product_code || '-' }}</td>
            <td>{{ item.product_name || '-' }}</td>
            <td>
              <div>{{ item.model || '-' }}</div>
              <div class="product-extra">{{ item.description || '' }}</div>
            </td>
            <td>{{ item.quantity || '-' }}</td>
            <td>{{ item.unit || '-' }}</td>
            <td>{{ item.tax_included_price }}</td>
            <td>{{ item.tax_included_amount }}</td>
            <td>{{ formatDate(orderData.arrival_date) }}</td>
            <td>
              <span class="value editable" @click="handleEdit('remarks')"> - </span>
            </td>
          </tr>
          <!-- 金额总计大写行 -->
          <tr v-if="lang === 'zh'" class="total-row">
            <td colspan="7" class="total-label">{{ t.purchaseOrderPrint.amountInWords }}</td>
            <td colspan="3">{{ amountInWords }}</td>
          </tr>
          <!-- 金额总计行 -->
          <tr class="total-row">
            <td colspan="7" class="total-label">{{ t.purchaseOrderPrint.totalAmount }}</td>
            <td colspan="3">{{ formData.total }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 合同条款 -->
      <div class="terms-section">
        <h3>{{ t.purchaseOrderPrint.contractTerms }}</h3>
        <ol class="terms-list">
          <li>{{ t.purchaseOrderPrint.term1 }}</li>
          <li>{{ t.purchaseOrderPrint.term2 }}</li>
          <li>{{ t.purchaseOrderPrint.term3 }}</li>
          <li>{{ t.purchaseOrderPrint.term4 }}</li>
          <li>{{ t.purchaseOrderPrint.term5 }}</li>
          <li>{{ t.purchaseOrderPrint.term6 }}</li>
          <li>{{ t.purchaseOrderPrint.term7 }}</li>
          <li>{{ t.purchaseOrderPrint.term8 }}</li>
        </ol>
      </div>

      <!-- 页面底部部分 -->
      <div class="footer-section">
        <div class="footer-left">
          <div class="footer-title">{{ t.purchaseOrderPrint.supplierInfo }}</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.companyName }}</span>
              <span class="footer-value">{{ supplierData?.supplier_name || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.address }}</span>
              <span class="footer-value">{{ supplierData?.register_address || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.contactPerson }}</span>
              <span class="footer-value">{{ supplierData?.contact || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.phone }}</span>
              <span class="footer-value">{{ supplierData?.contact_phone || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.email }}</span>
              <span class="footer-value">{{ supplierData?.supplier_email || '-' }}</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">{{ t.purchaseOrderPrint.signatureAndSeal }}</span>
          </div>
        </div>
        <div class="footer-right">
          <div class="footer-title">{{ t.purchaseOrderPrint.buyerInfo }}</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.companyName }}</span>
              <span class="footer-value">{{ lang === 'zh' ? '深圳市旭思达光电科技有限公司' : 'Shenzhen Xusida Optoelectronic Technology Co., Ltd.' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.address }}</span>
              <span class="footer-value">{{ lang === 'zh' ? '深圳市龙岗区坂田街道五和大道（南）景丰大厦602室' : 'Room 602, Jingfeng Building, No. 42 Wuhe Avenue (South), Nankeng Community, Bantian Street, Longgang District, Shenzhen' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.contactPerson }}</span>
              <span class="footer-value editable" @click="handleEdit('buyerContact')">{{
                formData.buyerContact || '-'
              }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.phone }}</span>
              <span class="footer-value editable" @click="handleEdit('buyerPhone')">{{
                formData.buyerPhone || '-'
              }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">{{ t.purchaseOrderPrint.email }}</span>
              <span class="footer-value editable" @click="handleEdit('buyerEmail')">{{
                formData.buyerEmail || '-'
              }}</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">{{ t.purchaseOrderPrint.signatureAndSeal }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <a-space>
        <a-button @click="handleCancel">{{ t.purchaseOrderPrint.cancel }}</a-button>
        <a-button type="primary" @click="handlePrint">{{ t.purchaseOrderPrint.print }}</a-button>
      </a-space>
    </div>

    <!-- 编辑弹窗 -->
    <a-modal
      v-model:open="editModalVisible"
      :title="editFieldTitle"
      @ok="handleEditConfirm"
      @cancel="editModalVisible = false"
    >
      <a-input ref="editInputRef" v-model:value="editValue" />
    </a-modal>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, nextTick, onMounted } from 'vue'
import dayjs from 'dayjs'
import type { PurchaseOrder } from '@/types'
import { useUserStore } from '@/stores/user'
import { suppliersApi } from '@/api/suppliers'
import { getLocale, type Lang } from '@/locales'

const lang = ref<Lang>('zh')
const t = computed(() => getLocale(lang.value))

interface Props {
  visible: boolean
  order: PurchaseOrder | undefined
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

const orderData = computed(() => props.order)
const supplierData = ref()
const userStore = useUserStore()
onMounted(async () => {
  const supplierCode = orderData.value?.supplier_code
  const supplier = await suppliersApi.getAll({ code: supplierCode })
  supplierData.value = supplier.data[0]
})

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
// Note: 'currentUser' was renamed to 'supplierData' to avoid supplier info conflicts
const currentUser = computed(() => userStore.user)

const formData = reactive({
  orderDate: '',
  taxRate: 0,
  remarks: '',
  total: 0,
  buyerContact: '',
  buyerPhone: '',
  buyerEmail: '',
})

const editModalVisible = ref(false)
const editField = ref('')
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

const user = computed(() => userStore.user)

const editFieldTitle = computed(() => {
  const titles: Record<string, string> = {
    orderDate: t.value.purchaseOrderPrint.editOrderDate,
    taxRate: t.value.purchaseOrderPrint.editTaxRate,
    remarks: t.value.purchaseOrderPrint.editRemarks,
    buyerContact: t.value.purchaseOrderPrint.editContact,
    buyerPhone: t.value.purchaseOrderPrint.editPhone,
    buyerEmail: t.value.purchaseOrderPrint.editEmail,
  }
  return titles[editField.value] || t.value.purchaseOrderPrint.editDefault
})

const amountInWords = computed(() => numberToWords(formData.total))

const numberToWords = (num: number): string => {
  if (lang.value === 'en') {
    return numberToEnglish(num)
  }
  return numberToChinese(num)
}

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

const numberToEnglish = (num: number): string => {
  if (num === 0) return 'Zero'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertHundreds = (n: number): string => {
    let result = ''
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 10 && n < 20) {
      result += teens[n - 10]
    } else {
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' '
        n %= 10
      }
      if (n > 0) {
        result += ones[n]
      }
    }
    return result.trim()
  }

  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)

  let result = ''
  if (intPart >= 1000000) {
    result += convertHundreds(Math.floor(intPart / 1000000)) + ' Million '
  }
  if (intPart >= 1000) {
    result += convertHundreds(Math.floor((intPart % 1000000) / 1000)) + ' Thousand '
  }
  if (intPart % 1000 > 0 || intPart === 0) {
    result += convertHundreds(intPart % 1000)
  }

  result = result.trim()
  if (decPart > 0) {
    result += ' Point ' + convertHundreds(decPart)
  }

  return result
}

const initializeFormData = () => {
  if (!orderData.value) return
  const user = userStore.user
  const order = orderData.value
  const supplier = supplierData.value
  formData.orderDate = order.created_at || new Date().toISOString()
  formData.taxRate = (order.tax_rate || 0) * 100
  formData.remarks = ''

  // 从purchase_items中计算总金额
  try {
    const items = JSON.parse(order.purchase_items || '[]')
    const total = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.total_price) || 0)
    }, 0)
    formData.total = Math.round(total * 100) / 100
  } catch {
    formData.total = 0
  }

  formData.buyerContact = user?.username || ''
  formData.buyerPhone = user?.phone || ''
  formData.buyerEmail = user?.email || ''
}

watch(
  () => props.visible,
  newVal => {
    if (newVal) {
      initializeFormData()
    }
  }
)

watch(editModalVisible, newVal => {
  if (newVal) {
    nextTick(() => {
      editInputRef.value?.focus()
    })
  }
})

const formatDate = (date: string | undefined) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const formatPrice = (price: number | string | undefined) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price || 0
  return `￥${numPrice.toFixed(2)}`
}

const calculateAmount = () => {
  if (!orderData.value) return 0
  return (orderData.value.quantity || 0) * (orderData.value.tax_included_price || 0)
}

const handleEdit = (field: string) => {
  editField.value = field
  switch (field) {
    case 'orderDate':
      editValue.value = dayjs(formData.orderDate).format('YYYY-MM-DD')
      break
    case 'taxRate':
      editValue.value = String(formData.taxRate)
      break
    case 'remarks':
      editValue.value = formData.remarks
      break
    case 'buyerContact':
      editValue.value = formData.buyerContact
      break
    case 'buyerPhone':
      editValue.value = formData.buyerPhone
      break
    case 'buyerEmail':
      editValue.value = formData.buyerEmail
      break
  }
  editModalVisible.value = true
}

const handleEditConfirm = () => {
  switch (editField.value) {
    case 'orderDate':
      formData.orderDate = dayjs(editValue.value).toISOString()
      break
    case 'taxRate':
      formData.taxRate = parseFloat(editValue.value) || 0
      break
    case 'remarks':
      formData.remarks = editValue.value
      break
    case 'buyerContact':
      formData.buyerContact = editValue.value
      break
    case 'buyerPhone':
      formData.buyerPhone = editValue.value
      break
    case 'buyerEmail':
      formData.buyerEmail = editValue.value
      break
  }
  editModalVisible.value = false
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

  .title {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
    color: #000;
  }
}

.top-section {
  margin-bottom: 30px;

  .order-number-row {
    margin-bottom: 20px;

    .order-number {
      font-size: 18px;
      font-weight: bold;
      color: #000;
    }
  }

  .info-row {
    display: flex;
    gap: 20px;
  }

  .info-left,
  .info-right {
    flex: 1;
  }

  .info-item {
    margin-bottom: 12px;
    font-size: 14px;
    color: #000;

    .label {
      color: #595959;
      margin-right: 8px;
    }

    .value {
      color: #000;

      &.editable {
        cursor: pointer;
        color: #1890ff;
        border-bottom: 1px dashed #1890ff;
        padding-bottom: 1px;

        &:hover {
          background: #e6f7ff;
        }
      }
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

    .product-extra {
      font-size: 12px;
      color: #8c8c8c;
      margin-top: 4px;
    }
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

.terms-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #fafafa;
  border: 1px solid #e8e8e8;

  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 500;
    color: #262626;
  }

  .terms-list {
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    line-height: 1.8;
    color: #000;

    li {
      margin-bottom: 8px;
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

      &.editable {
        cursor: pointer;
        color: #1890ff;
        border-bottom: 1px dashed #1890ff;
        padding-bottom: 1px;

        &:hover {
          background: #e6f7ff;
        }
      }
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

.lang-switch-bar {
  text-align: right;
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
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

  .no-print {
    display: none !important;
  }

  .print-content {
    padding: 0;
    min-height: auto;
    overflow: visible;
    page-break-inside: auto;
    font-size: 9px;
    box-shadow: none !important;
  }

  // 页面标题
  .page-header {
    margin-bottom: 4px;

    .title {
      font-size: 14px;
    }
  }

  // 顶部信息区域
  .top-section {
    margin-bottom: 4px;

    .order-number-row {
      margin-bottom: 4px;

      .order-number {
        font-size: 10px;
      }
    }

    .info-row {
      gap: 6px;
    }

    .info-item {
      margin-bottom: 2px;
      font-size: 8px;
    }
  }

  // 表格
  .product-table {
    margin-bottom: 4px;

    th {
      padding: 2px 3px;
      font-size: 8px;
    }

    td {
      padding: 2px 3px;
      font-size: 8px;

      .product-extra {
        font-size: 7px;
        margin-top: 1px;
      }
    }
  }

  // 合同条款
  .terms-section {
    margin-bottom: 4px;
    padding: 4px 6px;

    h3 {
      margin: 0 0 3px 0;
      font-size: 9px;
    }

    .terms-list {
      font-size: 7.5px;
      line-height: 1.3;
      padding-left: 12px;

      li {
        margin-bottom: 1px;
      }
    }
  }

  // 底部信息
  .footer-section {
    margin-top: 4px;
    gap: 10px;

    .footer-title {
      font-size: 9px;
      margin-bottom: 4px;
    }

    .footer-content {
      padding: 4px 6px;
    }

    .footer-item {
      margin-bottom: 2px;
      font-size: 8px;

      .footer-label {
        min-width: 50px;
      }
    }

    .sign-box {
      margin-top: 4px;
      padding-top: 4px;

      .sign-label {
        font-size: 8px;
      }
    }
  }
}
</style>
