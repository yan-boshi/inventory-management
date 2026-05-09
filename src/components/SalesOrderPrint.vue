<template>
  <a-modal
    v-model:open="visible"
    title="装箱清单"
    width="900px"
    :footer="null"
    @cancel="handleCancel"
    :destroyOnClose="true"
  >
    <div ref="printContent" class="print-content">
      <!-- 页面头 -->
      <div class="page-header">
        <h1 class="company-name">深圳市旭思达光电科技有限公司</h1>
        <p class="company-address">深圳市龙岗区坂田街道南坑社区五和大道（南）42号景丰大厦602</p>
      </div>

      <!-- 客户信息 -->
      <div class="customer-section">
        <div class="order-number-row">
          <span class="value order-number">{{ orderData?.order_number || '-' }}</span>
        </div>
        <div class="customer-info-row">
          <div class="customer-left">
            <div class="row">
              <span class="label">客户名称：</span>
              <span class="value">{{ orderData?.customer_name || '-' }}</span>
            </div>
            <div class="row">
              <span class="label">客户地址：</span>
              <span class="value address-value">{{
                orderData?.receiver_address || orderData?.customer_code || '-'
              }}</span>
            </div>
          </div>
          <div class="customer-right">
            <div class="row">
              <span class="label">合同编号：</span>
              <span class="value">{{ orderData?.contract_number || '-' }}</span>
            </div>
            <div class="row">
              <span class="label">送货日期：</span>
              <span class="value editable" @click="handleEdit('deliveryDate')">{{
                formatDate(formData.deliveryDate)
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 产品明细表格 -->
      <table class="product-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>产品代码</th>
            <th>产品名称</th>
            <th>规格描述</th>
            <th>数量</th>
            <th>单位</th>
            <th style="width: 150px">备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in orderItems" :key="item.no">
            <td>{{ item.no }}</td>
            <td>{{ item.product_code || '-' }}</td>
            <td>{{ item.product_name || '-' }}</td>
            <td>{{ item.description || '-' }}</td>
            <td class="editable-cell" @click="handleEdit('quantity')">
              {{ item.quantity || '-' }}
            </td>
            <td>{{ item.unit || '-' }}</td>
            <td class="editable-cell" @click="handleEdit('remarks')">-</td>
          </tr>
        </tbody>
      </table>

      <!-- 底部信息 -->
      <div class="footer-section">
        <div class="footer-row">
          <span class="footer-label">总计：</span>
          <span class="footer-value editable total-value" @click="handleEdit('total')">{{
            formData.total
          }}</span>
        </div>
        <div class="footer-row">
          <span class="footer-label">币种：</span>
          <span class="footer-value editable" @click="handleEdit('currency')">{{
            formData.currency
          }}</span>
        </div>
        <div class="footer-row">
          <span class="footer-label">快递单号：</span>
          <span
            v-if="formData.expressNumber"
            class="footer-value editable"
            @click="handleEdit('expressNumber')"
            >{{ formData.expressNumber }}</span
          >
          <span v-else class="footer-value invisible-input" @click="handleEdit('expressNumber')"
            >____</span
          >
        </div>
        <div class="footer-row">
          <span class="footer-label">发货人：</span>
          <span class="footer-value">{{ formData.seller || '-' }}</span>
        </div>
        <div class="footer-row">
          <span class="footer-label">联系电话：</span>
          <span class="footer-value">{{ formData.contactPhone || '-' }}</span>
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
import { ref, reactive, watch, computed, nextTick } from 'vue'
import dayjs from 'dayjs'
import type { SalesOrder } from '@/types'
import { useUserStore } from '@/stores/user'

interface Props {
  visible: boolean
  order: SalesOrder | undefined
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
const orderItems = computed(() => JSON.parse(props.order?.sales_items || '[]'))
const userStore = useUserStore()

const formData = reactive({
  deliveryDate: '',
  quantity: 0,
  remarks: '',
  total: 0,
  currency: 'CNY',
  expressNumber: '',
  seller: '',
  contactPhone: '',
})

const editModalVisible = ref(false)
const editField = ref('')
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

const editFieldTitle = computed(() => {
  const titles: Record<string, string> = {
    deliveryDate: '送货日期',
    quantity: '数量',
    total: '总计',
    currency: '币种',
    expressNumber: '快递单号',
    remarks: '备注',
  }
  return titles[editField.value] || '编辑'
})

const initializeFormData = () => {
  if (!orderData.value) return

  const order = orderData.value
  const user = userStore.user

  formData.deliveryDate = order.delivery_date || new Date().toISOString()
  formData.quantity = order.quantity
  formData.remarks = ''
  formData.total = order.tax_included_amount
  formData.currency = order.currency || 'CNY'
  formData.expressNumber = ''
  formData.seller = user?.username || ''
  formData.contactPhone = user?.phone || ''
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

const formatDate = (date: string) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const formatPrice = (price: number | string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return `￥${(numPrice || 0).toFixed(2)}`
}

const handleEdit = (field: string) => {
  editField.value = field
  switch (field) {
    case 'deliveryDate':
      editValue.value = dayjs(formData.deliveryDate).format('YYYY-MM-DD')
      break
    case 'quantity':
      editValue.value = String(formData.quantity)
      break
    case 'total':
      editValue.value = String(formData.total)
      break
    case 'currency':
      editValue.value = formData.currency
      break
    case 'expressNumber':
      editValue.value = formData.expressNumber
      break
    case 'remarks':
      editValue.value = formData.remarks
      break
  }
  editModalVisible.value = true
}

const handleEditConfirm = () => {
  switch (editField.value) {
    case 'deliveryDate':
      formData.deliveryDate = dayjs(editValue.value).toISOString()
      break
    case 'quantity':
      formData.quantity = parseInt(editValue.value) || 0
      break
    case 'total':
      formData.total = parseFloat(editValue.value) || 0
      break
    case 'currency':
      formData.currency = editValue.value
      break
    case 'expressNumber':
      formData.expressNumber = editValue.value
      break
    case 'remarks':
      formData.remarks = editValue.value
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
  min-height: 600px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;

  .company-name {
    font-size: 24px;
    font-weight: bold;
    margin: 0 0 12px 0;
    color: #000;
  }

  .company-address {
    font-size: 16px;
    margin: 0;
    color: #000;
  }
}

.customer-section {
  margin-bottom: 30px;

  .order-number-row {
    margin-bottom: 20px;
    text-align: left;
    font-size: 20px;
    font-weight: bold;
    color: #000;
  }

  .customer-info-row {
    display: flex;
    gap: 20px;
  }

  .customer-left,
  .customer-right {
    width: 50%;
  }

  .row {
    display: flex;
    margin-bottom: 16px;
    font-size: 16px;
    color: #000;
  }

  .label {
    color: #595959;
    margin-right: 8px;
    min-width: 80px;
  }

  .value {
    color: #000;

    &.address-value {
      flex: 1;
      min-width: 150px;
    }

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

.product-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 40px;

  thead {
    tr {
      th {
        padding: 12px 8px;
        background: #f5f5f5;
        border: 1px solid #d9d9d9;
        font-weight: 500;
        font-size: 14px;
        color: #262626;
        text-align: center;
      }
    }
  }

  tbody {
    tr {
      td {
        padding: 12px 8px;
        border: 1px solid #e8e8e8;
        text-align: center;
        font-size: 14px;
        color: #000;
        vertical-align: middle;
        height: 50px;
      }

      .editable-cell {
        cursor: pointer;
        color: #1890ff;

        &:hover {
          background: #e6f7ff;
        }
      }
    }
  }
}

.footer-section {
  margin-top: 40px;

  .footer-label {
    display: inline-block;
    color: #595959;
    margin-right: 8px;
    min-width: 80px;
  }

  .footer-value {
    display: inline-block;
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

    &.total-value {
      font-size: 20px;
      font-weight: bold;
      color: #f5222d;
    }

    &.invisible-input {
      color: #d9d9d9;
      border-bottom: 1px dashed #d9d9d9;
      padding: 0 8px;
      min-width: 100px;
      cursor: pointer;

      &:hover {
        color: #1890ff;
        border-bottom-color: #1890ff;
      }
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
