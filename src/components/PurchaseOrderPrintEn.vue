<template>
  <a-modal v-model:open="visible" title="" width="900px" :footer="null" @cancel="handleCancel">
    <div ref="printContent" class="print-content">
      <!-- 页面头 -->
      <div class="page-header">
        <h1 class="title">Purchase Order</h1>
      </div>

      <!-- 页面上面部分 -->
      <div class="top-section">
        <div class="order-number-row">
          <span class="order-number">{{ orderData?.order_number || '-' }}</span>
        </div>
        <div class="info-row">
          <div class="info-left">
            <div class="info-item">
              <span class="label">Supplier：</span>
              <span class="value">{{
                supplierData?.supplier_name || orderData?.supplier_name || '-'
              }}</span>
            </div>
            <div class="info-item">
              <span class="label">Order Date：</span>
              <span class="value editable" @click="handleEdit('orderDate')">{{
                formatDate(formData.orderDate)
              }}</span>
            </div>
          </div>
          <div class="info-right">
            <div class="info-item">
              <span class="label">Currency：</span>
              <span class="value">{{ orderData?.currency || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Tax Rate：</span>
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
            <th>No.</th>
            <th>Product Code</th>
            <th>Specification</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Unit Price</th>
            <th>Amount</th>
            <th>Delivery Date</th>
            <th style="width: 150px">Remarks</th>
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
            <td>{{ fitem.tax_included_price }}</td>
            <td>{{ item.tax_included_amount }}</td>
            <td>{{ formatDate(orderData.arrival_date) }}</td>
            <td>
              <span class="value editable" @click="handleEdit('remarks')"> - </span>
            </td>
          </tr>
          <!-- 金额总计行 -->
          <tr class="total-row">
            <td colspan="8" class="total-label">Total Amount：</td>
            <td>{{ formatPrice(formData.total) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 合同条款 -->
      <div class="terms-section">
        <h3>Terms and Conditions</h3>
        <ol class="terms-list">
          <li>
            The materials must be consistent with the above brand and model, and must be brand new
            original products. Counterfeits will be compensated at ten times the price.
          </li>
          <li>
            The materials must be in original packaging with oxidized pins. If the materials are not
            in original packaging, Party A has the right to return the goods at any time.
          </li>
          <li>
            Within six months, if any product quality problem is found, regardless of whether it has
            been put into production or not, Party B shall refund the full payment to Party A within
            one week upon presentation of the test report or quality report issued by our customer.
            Party A reserves the right to claim additional processing costs caused by component
            quality issues from Party B.
          </li>
          <li>
            Upon receipt of the order, please confirm and return it with bank information. If the
            supplier provides incorrect bank information, all consequences shall be borne by the
            supplier.
          </li>
          <li>
            If Party B has confirmed the order but ultimately cancels the order and fails to deliver
            on time, Party B shall pay 5% of the total order amount as compensation.
          </li>
          <li>
            If Party A has paid a deposit to Party B but ultimately cancels the order and fails to
            deliver on time, Party B shall, in addition to returning the deposit, pay an amount
            equal to the deposit as compensation.
          </li>
          <li>
            If the goods and delivery date of Party B do not meet the requirements of Party A's
            order, Party A has the right to cancel the order.
          </li>
          <li>
            If the goods cannot be delivered on time beyond the supplier's commitment, the supplier
            shall pay in full the additional costs for the customer to purchase spot goods.
          </li>
        </ol>
      </div>

      <!-- 页面底部部分 -->
      <div class="footer-section">
        <div class="footer-left">
          <div class="footer-title">Supplier (Party B) Information</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">Company Name：</span>
              <span class="footer-value">{{ supplierData?.supplier_name || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Address：</span>
              <span class="footer-value">{{ supplierData?.register_address || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Contact：</span>
              <span class="footer-value">{{ supplierData?.contact || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Phone：</span>
              <span class="footer-value">{{ supplierData?.contact_phone || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Email：</span>
              <span class="footer-value">{{ supplierData?.supplier_email || '-' }}</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">Signature & Seal：</span>
          </div>
        </div>
        <div class="footer-right">
          <div class="footer-title">Buyer (Party A) Information</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">Company Name：</span>
              <span class="footer-value">Shenzhen Xusida Optoelectronic Technology Co., Ltd.</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Address：</span>
              <span class="footer-value"
                >Room 602, Jingfeng Building, No. 42 Wuhe Avenue (South), Nankeng Community, Bantian
                Street, Longgang District, Shenzhen</span
              >
            </div>
            <div class="footer-item">
              <span class="footer-label">Contact：</span>
              <span class="footer-value editable" @click="handleEdit('buyerContact')">{{
                formData.buyerContact || '-'
              }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Phone：</span>
              <span class="footer-value editable" @click="handleEdit('buyerPhone')">{{
                formData.buyerPhone || '-'
              }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">Email：</span>
              <span class="footer-value editable" @click="handleEdit('buyerEmail')">{{
                formData.buyerEmail || '-'
              }}</span>
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
    orderDate: 'Order Date',
    taxRate: 'Tax Rate',
    remarks: 'Remarks',
    buyerContact: 'Contact',
    buyerPhone: 'Phone',
    buyerEmail: 'Email',
  }
  return titles[editField.value] || 'Edit'
})

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
      min-width: 120px;
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
