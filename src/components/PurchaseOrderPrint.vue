<template>
  <a-modal v-model:open="visible" title="" width="900px" :footer="null" @cancel="handleCancel">
    <div ref="printContent" class="print-content">
      <!-- 页面头 -->
      <div class="page-header">
        <h1 class="title">采购订单</h1>
      </div>

      <!-- 页面上面部分 -->
      <div class="top-section">
        <div class="order-number-row">
          <span class="order-number">{{ orderData?.order_number || '-' }}</span>
        </div>
        <div class="info-row">
          <div class="info-left">
            <div class="info-item">
              <span class="label">供方名称：</span>
              <span class="value">{{
                supplierData?.supplier_name || orderData?.supplier_name || '-'
              }}</span>
            </div>
            <div class="info-item">
              <span class="label">订单日期：</span>
              <span class="value editable" @click="handleEdit('orderDate')">{{
                formatDate(formData.orderDate)
              }}</span>
            </div>
          </div>
          <div class="info-right">
            <div class="info-item">
              <span class="label">币种：</span>
              <span class="value">{{ orderData?.currency || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">税率：</span>
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
            <th>序号</th>
            <th>产品代码</th>
            <th>产品规格/描述</th>
            <th>数量</th>
            <th>单位</th>
            <th>含税单价</th>
            <th>金额</th>
            <th>交期</th>
            <th style="width: 150px">备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in JSON.parse(orderData?.purchase_items || '[]')" :key="item.no">
            <td>{{ item.no }}</td>
            <td>{{ item.product_code || '-' }}</td>
            <td>
              <div>{{ item.product_name || '-' }}</div>
              <div class="product-extra">{{ item.model || '' }}</div>
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
          <!-- 金额总计行 -->
          <tr class="total-row">
            <td colspan="6" class="total-label">金额总计（大写）：</td>
            <td colspan="3">{{ formData.amountInWords }}</td>
          </tr>
          <tr class="total-row">
            <td colspan="6" class="total-label">金额总计：</td>
            <td colspan="3">{{ formData.total }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 合同条款 -->
      <div class="terms-section">
        <h3>合同条款</h3>
        <ol class="terms-list">
          <li>该材料应与以上品牌和型号一致，并为原厂原装全新产品。假一赔十。</li>
          <li>该材料为原厂包装且管脚无氧化。若材料为非原厂原包装，甲方有权随时退货。</li>
          <li>
            在半年之内如发现任何产品质量问题，无论上线与否，凭我司客户出具的检测报告或品质报告，乙方应在一星期内退还全部货款给甲方
            ，甲方保留为客户向乙方追索因元件品质导致的额外加工费用权利。
          </li>
          <li>
            收到订单后，请确认回传并提供银行资料。若因供应商提供有误的银行资料，一切后果由供应商自行负责。
          </li>
          <li>如乙方已确认订单，但最终又取消订单无法按时出货，乙方需付订单总额的5%作为赔偿。</li>
          <li>
            如甲方已付了订金给乙方，但最终又取消订单无法按时出货。乙方除退回订金外，需另付等额订金作为赔偿。
          </li>
          <li>如乙方的货品及交期不符合甲方订单要求，甲方有权取消订单。</li>
          <li>如果货物不能按时交付，超出供应商的承诺，供应商需全额支付客户购买现货的额外费用。</li>
        </ol>
      </div>

      <!-- 页面底部部分 -->
      <div class="footer-section">
        <div class="footer-left">
          <div class="footer-title">供方（乙方）信息</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">单位名称：</span>
              <span class="footer-value">{{ supplierData?.supplier_name || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">地址：</span>
              <span class="footer-value">{{ supplierData?.register_address || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">联系人：</span>
              <span class="footer-value">{{ supplierData?.contact || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">联系电话：</span>
              <span class="footer-value">{{ supplierData?.contact_phone || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">邮箱：</span>
              <span class="footer-value">{{ supplierData?.supplier_email || '-' }}</span>
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
              <span class="footer-value">深圳市旭思达光电科技有限公司</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">单位地址：</span>
              <span class="footer-value">深圳市龙岗区坂田街道五和大道（南）景丰大厦602室</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">联系人：</span>
              <span class="footer-value editable" @click="handleEdit('buyerContact')">{{
                formData.buyerContact || '-'
              }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">联系电话：</span>
              <span class="footer-value editable" @click="handleEdit('buyerPhone')">{{
                formData.buyerPhone || '-'
              }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">邮箱：</span>
              <span class="footer-value editable" @click="handleEdit('buyerEmail')">{{
                formData.buyerEmail || '-'
              }}</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">签字盖章：</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handlePrint">打印</a-button>
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
  console.log(111222333)
  console.log('orderData.value', orderData.value)
  const supplierCode = orderData.value?.supplier_code
  const supplier = await suppliersApi.getAll({ code: supplierCode })
  console.log('osupplier', supplier)
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
  amountInWords: '',
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
    orderDate: '订单日期',
    taxRate: '税率',
    remarks: '备注',
    buyerContact: '联系人',
    buyerPhone: '联系电话',
    buyerEmail: '邮箱',
  }
  return titles[editField.value] || '编辑'
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

const initializeFormData = () => {
  if (!orderData.value) return
  const user = userStore.user
  console.log('user', user)
  const order = orderData.value
  const supplier = supplierData.value
  formData.orderDate = order.created_at || new Date().toISOString()
  formData.taxRate = (order.tax_rate || 0) * 100
  formData.remarks = ''
  formData.total = order.tax_included_amount || 0
  formData.amountInWords = numberToChinese(order.tax_included_amount || 0)
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
