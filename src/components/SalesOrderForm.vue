<template>
  <a-modal
    :title="isEdit ? t.salesOrder.editTitle : t.salesOrder.newTitle"
    width="85%"
    :visible="visible"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :okText="t.common.save"
    :confirmLoading="submitting"
    :footer="null"
  >
    <div v-if="visible" class="sales-order-form">
      <!-- 销售订单头部 -->
      <div class="sales-order-header">
        <div class="header-top">
          <div></div>
          <h1 class="company-name">{{ t.salesOrder.companyName }}</h1>
          <a-radio-group v-model:value="lang" size="small" class="lang-switch">
            <a-radio-button value="zh">中文</a-radio-button>
            <a-radio-button value="en">English</a-radio-button>
          </a-radio-group>
        </div>
        <h2 class="sales-order-title">{{ t.salesOrder.title }}</h2>
      </div>

      <!-- 销售订单内容 -->
      <div class="sales-order-content">
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">{{ t.salesOrder.defaultOrderNo }}</label>
            <a-input v-model:value="orderNumber" class="invisible-input" />
          </div>
          <div class="form-item">
            <label class="form-label"><span class="required">*</span>{{ t.salesOrder.contractNumber }}</label>
            <a-input v-model:value="form.contract_number" class="invisible-input note-input" />
          </div>
        </div>
        <div class="sales-order-content">
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">{{ t.salesOrder.customer }}</label>
              <a-select
                v-model:value="form.customer_name"
                :placeholder="t.salesOrder.selectCustomer"
                :loading="loading.customers"
                show-search
                :filter-option="false"
                @search="handleCustomerSearch"
                @change="handleCustomerChange"
                class="invisible-select customer-name-input"
              >
                <a-select-option
                  v-for="customer in customerOptions"
                  :key="customer.customer_id"
                  :value="customer.customer_name"
                >
                  {{ customer.customer_name }} ({{ customer.customer_code }})
                </a-select-option>
              </a-select>
            </div>
            <div class="form-item">
              <label class="form-label">{{ t.salesOrder.paymentMethod }}</label>
              <a-select
                v-model:value="form.payment_method"
                :placeholder="t.salesOrder.selectPaymentMethod"
                :loading="loading.paymentMethods"
                show-search
                :filter-option="false"
                @search="handlePaymentMethodSearch"
                class="invisible-select customer-name-input"
              >
                <a-select-option
                  v-for="method in paymentMethodOptions"
                  :key="method.payment_method_id"
                  :value="method.payment_method_name"
                >
                  {{ method.payment_method_name }}
                </a-select-option>
              </a-select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">{{ t.salesOrder.currency }}</label>
              <a-select v-model:value="form.currency" class="invisible-select customer-name-input">
                <a-select-option value="CNY">{{ t.salesOrder.cny }}</a-select-option>
                <a-select-option value="USD">{{ t.salesOrder.usd }}</a-select-option>
                <a-select-option value="EUR">{{ t.salesOrder.eur }}</a-select-option>
              </a-select>
            </div>
            <div class="form-item">
              <label class="form-label"><span class="required">*</span>{{ t.salesOrder.entryDate }}</label>
              <a-date-picker
                v-model:value="form.entry_date"
                class="invisible-select customer-name-input"
                format="YYYY-MM-DD"
              />
            </div>
          </div>

          <!-- 报价内容表格 -->
          <div class="table-container">
            <a-table
              v-scroll-topbar
              :columns="itemColumns"
              :data-source="form.sales_items"
              :pagination="false"
              bordered
              size="small"
              :scroll="{ x: 2250, y: 400 }"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'no'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'business_category'">
                  <a-select
                    v-model:value="record.business_category"
                    :placeholder="t.salesOrder.selectCategory"
                    :loading="loading.businessCategories"
                    style="width: 100%"
                    class="invisible-select"
                  >
                    <a-select-option
                      v-for="category in businessCategoryOptions"
                      :key="category.business_category_id"
                      :value="category.business_category_name"
                    >
                      {{ category.business_category_name }}
                    </a-select-option>
                  </a-select>
                </template>
                <template v-else-if="column.key === 'product_code'">
                  <a-select
                    v-model:value="record.product_code"
                    :placeholder="t.salesOrder.selectProduct"
                    :loading="loading.products"
                    show-search
                    :filter-option="false"
                    @search="value => handleProductSearch(value, index)"
                    @change="value => handleProductChange(value, index)"
                    style="width: 200%"
                    class="invisible-select"
                    optionLabelProp="product_code"
                  >
                    <a-select-option
                      v-for="product in productOptions"
                      :key="product.product_id"
                      :value="product.product_code"
                    >
                      {{ product.product_name }}（{{ product.product_code }}）
                    </a-select-option>
                  </a-select>
                </template>
                <template v-else-if="column.key === 'product_name'">
                  <a-input
                    v-model:value="record.product_name"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'model'">
                  <a-input
                    v-model:value="record.model"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'description'">
                  <a-input
                    v-model:value="record.description"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'unit'">
                  <a-input
                    v-model:value="record.unit"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'quantity'">
                  <a-input-number
                    v-model:value="record.quantity"
                    :min="1"
                    :precision="0"
                    style="width: 100%"
                    @change="() => taxIncludedPriceRowTotal(index)"
                    class="invisible-input"
                  />
                </template>
                <template v-else-if="column.key === 'outbound_quantity'">
                  <a-input
                    v-model:value="record.outbound_quantity"
                    style="width: 100%"
                    disabled="true"
                    class="invisible-input"
                  />
                </template>
                <template v-else-if="column.key === 'tax_rate'">
                  <a-input-number
                    v-model:value="record.tax_rate"
                    :min="0"
                    :max="100"
                    :precision="2"
                    style="width: 100px"
                    class="invisible-input"
                    @change="() => taxIncludedPriceRowTotal(index)"
                  >
                    <!-- <template #addonAfter>
                      <span>%</span>
                    </template> -->
                  </a-input-number>
                </template>

                <template v-else-if="column.key === 'tax_included_price'">
                  <a-input-number
                    v-model:value="record.tax_included_price"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    @change="() => taxIncludedPriceRowTotal(index)"
                    class="invisible-input"
                  />
                </template>
                <template v-else-if="column.key === 'tax_excluded_price'">
                  <a-input
                    v-model:value="record.tax_excluded_price"
                    :disabled="true"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'tax_included_amount'">
                  <a-input
                    v-model:value="record.tax_included_amount"
                    :disabled="true"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>
                <template v-else-if="column.key === 'tax_excluded_amount'">
                  <a-input
                    v-model:value="record.tax_excluded_amount"
                    :disabled="true"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>
                <template v-else-if="column.key === 'tax_amount'">
                  <a-input-number
                    v-model:value="record.tax_amount"
                    disabled="true"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'status'">
                  <a-tag :color="getStatusColor(record.status)">
                    {{ getStatusText(record.status) }}
                  </a-tag>
                </template>

                <template v-else-if="column.key === 'purchase_status'">
                  <a-select
                    v-model:value="record.purchase_status"
                    :placeholder="t.common.pleaseSelect"
                    style="width: 100%"
                    class="invisible-select"
                  >
                    <a-select-option :value="1">{{ t.salesOrder.notPurchased }}</a-select-option>
                    <a-select-option :value="2">{{ t.salesOrder.partiallyPurchased }}</a-select-option>
                    <a-select-option :value="3">{{ t.salesOrder.purchased }}</a-select-option>
                    <a-select-option :value="4">{{ t.salesOrder.noNeedToPurchase }}</a-select-option>
                  </a-select>
                </template>

                <template v-else-if="column.key === 'delivery_date'">
                  <a-date-picker
                    v-model:value="record.delivery_date"
                    format="YYYY-MM-DD"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'invoice_date'">
                  <a-date-picker
                    v-model:value="record.invoice_date"
                    format="YYYY-MM-DD"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'invoice_number'">
                  <a-input
                    v-model:value="record.invoice_number"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'invoice_received'">
                  <a-select
                    v-model:value="record.invoice_received"
                    :placeholder="t.common.pleaseSelect"
                    style="width: 100%"
                    class="invisible-select"
                  >
                    <a-select-option value="是">{{ t.salesOrder.yes }}</a-select-option>
                    <a-select-option value="否">{{ t.salesOrder.noOption }}</a-select-option>
                  </a-select>
                </template>

                <template v-else-if="column.key === 'settlement_date'">
                  <a-date-picker
                    v-model:value="record.settlement_date"
                    format="YYYY-MM-DD"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'settlement_amount'">
                  <a-input-number
                    v-model:value="record.settlement_amount"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    class="invisible-input"
                    @change="
                      () => {
                        record.unsettled_amount = parseFloat(
                          (
                            (record.tax_included_amount || 0) - (record.settlement_amount || 0)
                          ).toFixed(2)
                        )
                        record.settlement_status =
                          record.unsettled_amount === 0
                            ? '全部结算'
                            : record.settlement_amount > 0
                            ? '部分结算'
                            : '未结算'
                      }
                    "
                  />
                </template>

                <template v-else-if="column.key === 'unsettled_amount'">
                  <a-input
                    :value="
                      (
                        record.unsettled_amount ??
                        (record.tax_included_amount || 0) - (record.settlement_amount || 0)
                      ).toFixed(2)
                    "
                    disabled
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'settlement_status'">
                  <a-tag
                    :color="
                      record.settlement_status === '全部结算'
                        ? 'green'
                        : record.settlement_status === '部分结算'
                        ? 'orange'
                        : 'red'
                    "
                  >
                    {{ record.settlement_status || '未结算' }}
                  </a-tag>
                </template>

                <template v-else-if="column.key === 'remarks'">
                  <a-input
                    v-model:value="record.remarks"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'actions'">
                  <a-button type="link" size="small" danger @click="deleteItem(index)">
                    {{ t.common.delete }}
                  </a-button>
                </template>
              </template>

              <template #footer>
                <div class="table-footer">
                  <div class="total-row">
                    <span class="total-label">{{ t.salesOrder.totalWithTax }}</span>
                    <a-input-number
                      v-model:value="totalAmount"
                      :min="0"
                      :precision="2"
                      style="width: 150px"
                      class="invisible-input"
                    />
                    <!-- <span class="total-in-words">大写：{{ amountInWords }}</span> -->
                  </div>
                  <div class="add-row">
                    <a-button type="dashed" size="small" @click="addNewItem">
                      <template #icon>
                        <PlusOutlined />
                      </template>
                      {{ t.salesOrder.addRow }}
                    </a-button>
                  </div>
                </div>
              </template>
            </a-table>
          </div>

          <!-- 销售订单说明 -->
          <div class="sales-order-note">
            <!-- 销售费用登记 -->
            <div class="expenses-section">
              <div class="expenses-label">{{ t.salesOrder.salesExpense }}</div>
              <div class="expenses-row">
                <div class="expense-item">
                  <label>{{ t.salesOrder.transportFee }}</label>
                  <a-input-number
                    v-model:value="form.expenses.transportationFee"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    class="expense-input"
                  />
                </div>
                <div class="expense-item">
                  <label>{{ t.salesOrder.handlingFee }}</label>
                  <a-input-number
                    v-model:value="form.expenses.handlingFee"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    class="expense-input"
                  />
                </div>
                <div class="expense-item">
                  <label>{{ t.salesOrder.otherFee }}</label>
                  <a-input-number
                    v-model:value="form.expenses.otherFee"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    class="expense-input"
                  />
                </div>
              </div>
            </div>

            <div class="note-row">
              <label class="note-label">{{ t.common.remarks }}：</label>
              <a-textarea v-model:value="form.remarks" :rows="3" />
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="form-footer">
          <a-space>
            <a-button @click="handleCancel">{{ t.common.cancel }}</a-button>
            <a-button v-if="!isEdit" @click="handleSaveDraft">{{ t.salesOrder.draft }}</a-button>
            <!-- <a-button @click="handlePrint">{{ t.common.print }}</a-button> -->
            <!-- <a-button type="primary" @click="handleSaveAndPrint">{{ t.salesOrder.saveAndPrint }}</a-button> -->
            <a-button type="primary" @click="handleSubmit">{{ t.common.save }}</a-button>
          </a-space>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { salesOrdersApi } from '@/api/salesOrders'
import { customersApi } from '@/api/customers'
import { productsApi } from '@/api/products'
import { paymentMethodsApi } from '@/api/paymentMethods'
import { businessCategoriesApi } from '@/api/businessCategories'
import { useUserStore } from '@/stores/user'
import { saveDraft, loadDraft, clearDraft, hasDraft, formatDraftTime } from '@/utils/draft'
import { Modal } from 'ant-design-vue'
import { getLocale, type Lang } from '@/locales'
import type {
  CreateSalesOrderRequest,
  SalesOrderItem,
  CustomerOption,
  ProductOption,
  PaymentMethodOption,
  BusinessCategoryOption,
} from '@/types'

const userStore = useUserStore()

const lang = ref<Lang>('zh')
const t = computed(() => getLocale(lang.value))

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  salesOrderData?: any
}>()
dayjs.locale('zh-cn')

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
  print: [data: any]
}>()

const orderNumber = ref('')
const submitting = ref(false)
const loading = reactive({
  customers: false,
  products: false,
})

const getStatusColor = (status: number) => {
  const colorMap: Record<number, string> = {
    1: 'blue', // 未出库
    2: 'green', // 已全部出库
    3: 'orange', // 已部分出库
    4: 'red', // 退货
  }
  return colorMap[status] || 'default'
}

const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: t.value.salesOrder.notShipped,
    2: t.value.salesOrder.fullyShipped,
    3: t.value.salesOrder.partiallyShipped,
    4: t.value.salesOrder.returned,
  }
  return textMap[status] || t.value.salesOrder.unknown
}

const getPurchaseStatusColor = (status: number) => {
  const colorMap: Record<number, string> = {
    1: 'default', // 未采购
    2: 'orange', // 部分采购
    3: 'green', // 已采购
    4: 'blue', // 无需采购
  }
  return colorMap[status] || 'default'
}

const getPurchaseStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: t.value.salesOrder.notPurchased,
    2: t.value.salesOrder.partiallyPurchased,
    3: t.value.salesOrder.purchased,
    4: t.value.salesOrder.noNeedToPurchase,
  }
  return textMap[status] || t.value.salesOrder.notPurchased
}

const customerOptions = ref<CustomerOption[]>([])
const productOptions = ref<ProductOption[]>([])
const paymentMethodOptions = ref<PaymentMethodOption[]>([])
const businessCategoryOptions = ref<BusinessCategoryOption[]>([])

const form = reactive<CreateSalesOrderRequest & { sales_items: SalesOrderItem[]; expenses: any }>({
  customer_name: '',
  customer_code: '',
  payment_method: '',
  sales_items: [],
  currency: 'CNY',
  entry_date: '',
  remarks: '',
  sales_person: '',
  expenses: {
    transportationFee: 0,
    handlingFee: 0,
    otherFee: 0,
  },
})

const itemColumns = computed(() => [
  { title: t.value.salesOrder.no, key: 'no', width: 60, align: 'center' as const, fixed: 'left' as const },
  { title: t.value.salesOrder.businessCategory, key: 'business_category', width: 120, fixed: 'left' as const },
  { title: t.value.salesOrder.productCode, key: 'product_code', width: 120, fixed: 'left' as const },
  { title: t.value.salesOrder.productName, key: 'product_name', width: 150, fixed: 'left' as const },
  { title: t.value.salesOrder.model, key: 'model', width: 100, fixed: 'left' as const },
  { title: t.value.salesOrder.description, key: 'description', width: 120, fixed: 'left' as const },
  { title: t.value.salesOrder.unit, key: 'unit', width: 70 },
  { title: t.value.salesOrder.quantity, key: 'quantity', width: 80 },
  { title: t.value.salesOrder.taxRate, key: 'tax_rate', width: 90 },
  { title: t.value.salesOrder.taxIncludedPrice, key: 'tax_included_price', width: 100, align: 'right' as const },
  { title: t.value.salesOrder.taxExcludedPrice, key: 'tax_excluded_price', width: 100, align: 'right' as const },
  { title: t.value.salesOrder.taxIncludedAmount, key: 'tax_included_amount', width: 110, align: 'right' as const },
  { title: t.value.salesOrder.taxExcludedAmount, key: 'tax_excluded_amount', width: 110, align: 'right' as const },
  { title: t.value.salesOrder.taxAmount, key: 'tax_amount', width: 100, align: 'right' as const },
  { title: t.value.salesOrder.outboundStatus, key: 'status', width: 80 },
  { title: t.value.salesOrder.purchaseStatus, key: 'purchase_status', width: 100 },
  { title: t.value.salesOrder.deliveryDate, key: 'delivery_date', width: 130 },
  { title: t.value.salesOrder.invoiceDate, key: 'invoice_date', width: 130 },
  { title: t.value.salesOrder.invoiceNumber, key: 'invoice_number', width: 120 },
  { title: t.value.salesOrder.invoiceReceived, key: 'invoice_received', width: 90 },
  { title: t.value.salesOrder.settlementDate, key: 'settlement_date', width: 130 },
  { title: t.value.salesOrder.settlementAmount, key: 'settlement_amount', width: 100, align: 'right' as const },
  { title: t.value.salesOrder.unsettledAmount, key: 'unsettled_amount', width: 100, align: 'right' as const },
  { title: t.value.salesOrder.settlementStatus, key: 'settlement_status', width: 100 },
  { title: t.value.common.remarks, key: 'remarks', width: 150 },
  { title: t.value.common.action, key: 'actions', width: 70, fixed: 'right' as const },
])

const totalAmount = computed({
  get: () => form.sales_items.reduce((sum, item) => sum + (item.tax_included_amount || 0), 0),
  set: value => {
    if (form.sales_items.length > 0) {
      const currentTotal = form.sales_items.reduce(
        (sum, item) => sum + (item.tax_included_amount || 0),
        0
      )
      if (currentTotal > 0) {
        const ratio = value / currentTotal
        form.sales_items.forEach(item => {
          item.tax_included_amount = parseFloat((item.tax_included_amount || 0 * ratio).toFixed(2))
          if (item.quantity > 0) {
            item.tax_included_price = parseFloat(
              (item.tax_included_amount / item.quantity).toFixed(2)
            )
          }
        })
      }
    }
  },
})

// const amountInWords = computed(() => {
//   return numberToChinese(totalAmount.value)
// })

// const numberToChinese = (num: number): string => {
//   const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
//   const units = ['', '拾', '佰', '仟', '万', '亿']
//   let str = ''
//   let unitIndex = 0
//   // @ts-expect-error - zeroFlag is used in logic
//   let zeroFlag = false

//   if (num === 0) {
//     return '零元整'
//   }

//   const numStr = Math.floor(num).toString()

//   for (let i = 0; i < numStr.length; i++) {
//     const digit = parseInt(numStr[i])
//     if (digit === 0) {
//       zeroFlag = true
//     } else {
//       zeroFlag = false
//       const currentDigit = digits[digit] || ''
//       if (unitIndex > 0) {
//         str += units[unitIndex]
//       }
//       str += currentDigit
//       unitIndex++
//     }
//   }

//   str += '元'
//   if (numStr.includes('.')) {
//     const decimal = numStr.split('.')[1]
//     if (decimal) {
//       str += digits[parseInt(decimal[0])] + '角'
//       if (decimal.length > 1) {
//         str += digits[parseInt(decimal[1])] + '分'
//       }
//     }
//   }

//   return str + '整'
// }

// 获取新的销售订单编号
const getNewSalesOrderNumber = async () => {
  try {
    const { order_number } = await salesOrdersApi.getNewOrderNumber()
    orderNumber.value = order_number
  } catch (error) {
    message.error(t.value.salesOrder.getContractNumberFail)
  }
}
// 搜索结算方式
const handlePaymentMethodSearch = async (value: string) => {
  if (!value) {
    const res = await paymentMethodsApi.getAllList()
    paymentMethodOptions.value = res.data || []
    return
  }
  loading.paymentMethods = true
  try {
    const response = await paymentMethodsApi.getAll({ name: value })
    paymentMethodOptions.value = response.data.map((m: any) => ({
      payment_method_id: m.payment_method_id || m.id,
      payment_method_name: m.payment_method_name || m.name,
    }))
  } catch (error) {
    message.error(t.value.salesOrder.getPaymentMethodsFail)
  }
  loading.paymentMethods = false
}

// 搜索业务分类
const handleBusinessCategorySearch = async (value: string) => {
  if (!value) {
    const res = await businessCategoriesApi.getAllList()
    businessCategoryOptions.value = res.data || []
    return
  }
  loading.businessCategories = true
  try {
    const response = await businessCategoriesApi.getAll({ name: value })
    businessCategoryOptions.value = response.data.map((b: any) => ({
      business_category_id: b.business_category_id || b.id,
      business_category_name: b.business_category_name || b.name,
    }))
  } catch (error) {
    message.error(t.value.salesOrder.getCategoriesFail)
  }
  loading.businessCategories = false
}

// 搜索客户
const handleCustomerSearch = async (value: string) => {
  if (!value) {
    const res = await customersApi.getAllList()
    customerOptions.value = res.data || []
    return
  }
  loading.customers = true
  try {
    const response = await customersApi.getAll({ name: value })
    customerOptions.value = response.data.map((c: any) => ({
      customer_id: c.customer_id || c.id,
      customer_name: c.customer_name || c.name,
      customer_code: c.customer_code || c.code,
    }))
  } catch (error) {
    message.error(t.value.salesOrder.getCustomersFail)
  }
  loading.customers = false
}

// 选择客户
const handleCustomerChange = (value: string) => {
  const customer = customerOptions.value.find(c => c.customer_name === value)
  if (customer) {
    form.customer_code = customer.customer_code
  }
}

// 搜索产品
const handleProductSearch = async (value: string, index: number) => {
  if (!value) {
    const res = await productsApi.getAllList()
    productOptions.value = res.data || []
    return
  }
  loading.products = true
  try {
    const response = await productsApi.search(value, value)
    productOptions.value = response.data.map((p: any) => ({
      product_id: p.product_id || p.id,
      product_name: p.product_name || p.name,
      product_code: p.product_code || p.code,
      model: p.model,
      description: p.description,
      unit: p.unit,
    }))
  } catch (error) {
    message.error(t.value.salesOrder.getProductsFail)
  }
  loading.products = false
}

// 选择产品
const handleProductChange = (value: string, index: number) => {
  const product = productOptions.value.find(p => p.product_code === value)
  if (product) {
    form.sales_items[index].product_name = product.product_name || ''
    form.sales_items[index].model = product.model || ''
    // form.sales_items[index].product_code = product.product_code || ''
    form.sales_items[index].description = product.description || ''
    form.sales_items[index].unit = product.unit || ''
  }
}

// 计算行合计
const taxIncludedPriceRowTotal = (index: number) => {
  const item = form.sales_items[index]
  const taxRateDecimal = Number(item.tax_rate) / 100
  if (item.tax_included_price) {
    item.tax_excluded_price = parseFloat(
      (Number(item.tax_included_price) / (1 + taxRateDecimal)).toFixed(2)
    )
  } else {
    item.tax_excluded_price = Number(item.tax_included_price)
  }
  if (item.quantity && item.tax_included_price) {
    item.tax_included_amount = parseFloat(
      (Number(item.quantity) * Number(item.tax_included_price)).toFixed(2)
    )
    item.tax_excluded_amount = parseFloat(
      (Number(item.quantity) * item.tax_excluded_price).toFixed(2)
    )
    item.tax_amount = parseFloat(
      ((item.tax_included_amount / (1 + taxRateDecimal)) * taxRateDecimal).toFixed(2)
    )
  } else {
    item.tax_included_amount = 0
    item.tax_excluded_amount = 0
    item.tax_amount = 0
  }
}

// 删除行
const deleteItem = (index: number) => {
  form.sales_items.splice(index, 1)
}

// 新增行
const addNewItem = () => {
  console.log('props.salesOrderData', props.salesOrderData)
  form.sales_items.push({
    no: form.sales_items.length + 1,
    business_category: '',
    product_name: '',
    product_code: '',
    model: '',
    description: '',
    unit: '',
    quantity: 1,
    outbound_quantity: 0,
    tax_rate: 13,
    tax_included_price: 0,
    tax_excluded_price: 0,
    tax_included_amount: 0,
    tax_excluded_amount: 0,
    tax_amount: 0,
    status: 1,
    purchase_status: 1,
    delivery_date: undefined,
    invoice_date: undefined,
    invoice_number: '',
    invoice_received: '否',
    settlement_date: undefined,
    settlement_amount: 0,
    unsettled_amount: 0,
    settlement_status: '未结算',
    remarks: '',
  })
}

// 格式化金额
// const formatMoney = (amount: number) => {
//   return `¥${(amount || 0).toFixed(2)}`
// }

// 提交表单
const handleSubmit = async () => {
  if (!form.contract_number) {
    message.error(t.value.salesOrder.inputContractNumber)
    return
  }
  if (!form.customer_name) {
    message.error(t.value.salesOrder.selectCustomerMsg)
    return
  }
  if (!form.payment_method) {
    message.error(t.value.salesOrder.selectPaymentMethodMsg)
    return
  }
  if (!form.entry_date) {
    message.error(t.value.salesOrder.selectEntryDate)
    return
  }
  // 检查所有商品是否填写了业务分类
  const hasMissingCategory = form.sales_items.some((item: any) => !item.business_category)
  if (hasMissingCategory) {
    message.error(t.value.salesOrder.fillAllCategories)
    return
  }
  if (form.sales_items.length === 0) {
    message.error(t.value.salesOrder.addSaleContent)
    return
  }
  // 确保日期是字符串格式
  const formatDate = (date: any) => {
    if (!date) return undefined
    if (typeof date === 'string') return date
    try {
      return dayjs(date).format('YYYY-MM-DD')
    } catch {
      return undefined
    }
  }

  try {
    submitting.value = true

    // 格式化 sales_items 中的日期字段
    const formattedItems = form.sales_items.map((item: any) => ({
      ...item,
      delivery_date: formatDate(item.delivery_date),
      invoice_date: formatDate(item.invoice_date),
      settlement_date: formatDate(item.settlement_date),
    }))

    const submitData = {
      order_number: orderNumber.value,
      contract_number: form.contract_number,
      customer_name: form.customer_name,
      customer_code: form.customer_code,
      payment_method: form.payment_method,
      sales_items: JSON.stringify(formattedItems),
      currency: form.currency,
      entry_date: formatDate(form.entry_date),
      tax_included_amount: totalAmount.value,
      remarks: form.remarks,
      expenses: form.expenses,
      sales_person: userStore.user?.username || '',
    }

    if (props.isEdit && props.salesOrderData?.sales_order_id) {
      await salesOrdersApi.update(props.salesOrderData.sales_order_id, submitData)
      message.success(t.value.salesOrder.orderUpdateSuccess)
      emit('success')
    } else {
      await salesOrdersApi.create(submitData)
      message.success(t.value.salesOrder.orderCreateSuccess)
      clearDraft(DRAFT_KEY)
      emit('success')
    }

    emit('update:visible', false)
  } catch (error) {
    message.error(error?.message || t.value.common.error)
  } finally {
    submitting.value = false
  }
}

// 打印
const handlePrint = () => {
  emit('print', {
    order_number: orderNumber.value,
    contract_number: form.contract_number,
    customer_name: form.customer_name,
    customer_code: form.customer_code,
    payment_method: form.payment_method,
    sales_items: JSON.stringify(form.sales_items),
    currency: form.currency,
    entry_date: form.entry_date,
    total_amount: totalAmount.value,
  })
}

// 保存并打印
const handleSaveAndPrint = async () => {
  await handleSubmit()
  handlePrint()
}

// 取消
const handleCancel = () => {
  emit('update:visible', false)
}

// 监听显示状态变化
watch(
  () => props.visible,
  visible => {
    if (visible) {
      if (!props.isEdit) {
        // 从报价单转换的情况
        if (props.salesOrderData?.quotation_number) {
          // 从报价单转换不检查暂存
          orderNumber.value = props.salesOrderData.quotation_number
          form.customer_name = props.salesOrderData.customer_name
          form.customer_code = props.salesOrderData.customer_code
          form.currency = props.salesOrderData.currency || 'CNY'
          form.payment_method = ''
          // form.delivery_date = props.salesOrderData.delivery_date || dayjs().format('YYYY-MM-DD')
          form.remarks = ''
          form.status = props.salesOrderData.status || '1'
          form.tax_included_amount = props.salesOrderData.tax_included_amount || 0
          form.sales_items = props.salesOrderData.sales_items || []
        } else {
          getNewSalesOrderNumber()
          resetForm()
          form.sales_person = userStore.user?.username || ''
          checkDraft()
        }
      } else if (props.salesOrderData) {
        form.contract_number = props.salesOrderData.contract_number || ''
        form.customer_name = props.salesOrderData.customer_name
        form.customer_code = props.salesOrderData.customer_code
        form.payment_method = props.salesOrderData.payment_method
        form.currency = props.salesOrderData.currency || 'CNY'
        form.sales_person = props.salesOrderData.sales_person || ''
        if (props.salesOrderData.entry_date) {
          form.entry_date = dayjs(props.salesOrderData.entry_date)
        } else {
          form.entry_date = undefined
        }
        form.remarks = props.salesOrderData.remarks || ''
        orderNumber.value = props.salesOrderData.order_number || ''
        try {
          const items = JSON.parse(props.salesOrderData.sales_items || '[]')
          // 将日期字符串转换为 dayjs 对象
          form.sales_items = items.map((item: any) => ({
            ...item,
            delivery_date: item.delivery_date ? dayjs(item.delivery_date) : undefined,
            invoice_date: item.invoice_date ? dayjs(item.invoice_date) : undefined,
            settlement_date: item.settlement_date ? dayjs(item.settlement_date) : undefined,
          }))
        } catch {
          form.sales_items = []
        }
        try {
          form.expenses = props.salesOrderData.expenses
            ? JSON.parse(props.salesOrderData.expenses)
            : { transportationFee: 0, handlingFee: 0, otherFee: 0 }
        } catch {
          form.expenses = { transportationFee: 0, handlingFee: 0, otherFee: 0 }
        }
      }

      loadBasicData()
    }
  }
)

// 加载基础数据
const loadBasicData = async () => {
  try {
    const [customers, products, paymentMethods, businessCategories] = await Promise.all([
      customersApi.getAllList(),
      productsApi.getAllList(),
      paymentMethodsApi.getAllList(),
      businessCategoriesApi.getAllList(),
    ])
    customerOptions.value = customers.data || []
    productOptions.value = products.data || []
    paymentMethodOptions.value = paymentMethods.data || []
    businessCategoryOptions.value = businessCategories.data || []
  } catch (error) {
    message.error(t.value.salesOrder.loadBasicDataFail)
  }
}

// 重置表单
const resetForm = () => {
  form.contract_number = ''
  form.customer_name = ''
  form.customer_code = ''
  form.payment_method = ''
  form.sales_items = []
  form.currency = 'CNY'
  form.entry_date = dayjs()
  form.remarks = ''
  form.sales_person = ''
  form.expenses = { transportationFee: 0, handlingFee: 0, otherFee: 0 }
  orderNumber.value = ''
}

// ==================== 暂存功能 ====================
const DRAFT_KEY = 'sales_order'

// 保存暂存
const handleSaveDraft = () => {
  const draftData = {
    contract_number: form.contract_number,
    customer_name: form.customer_name,
    customer_code: form.customer_code,
    payment_method: form.payment_method,
    sales_items: form.sales_items,
    currency: form.currency,
    entry_date: form.entry_date
      ? typeof form.entry_date === 'string'
        ? form.entry_date
        : dayjs(form.entry_date).format('YYYY-MM-DD')
      : '',
    remarks: form.remarks,
    expenses: form.expenses,
  }
  const summary = form.customer_name
    ? `${form.customer_name} - ${form.sales_items.length}个商品`
    : `${form.sales_items.length}个商品`
  saveDraft(DRAFT_KEY, draftData, summary)
  message.success(t.value.salesOrder.draftSuccess)
}

// 恢复暂存
const restoreDraft = () => {
  const draft = loadDraft(DRAFT_KEY)
  if (!draft) return

  form.contract_number = draft.data.contract_number || ''
  form.customer_name = draft.data.customer_name || ''
  form.customer_code = draft.data.customer_code || ''
  form.payment_method = draft.data.payment_method || ''
  // 将 sales_items 中的 delivery_date 字符串转换为 dayjs 对象
  const items = draft.data.sales_items || []
  form.sales_items = items.map((item: any) => ({
    ...item,
    delivery_date: item.delivery_date ? dayjs(item.delivery_date) : undefined,
  }))
  form.currency = draft.data.currency || 'CNY'
  // 将日期字符串转换为 dayjs 对象
  form.entry_date = draft.data.entry_date ? dayjs(draft.data.entry_date) : ''
  form.remarks = draft.data.remarks || ''
  form.expenses = draft.data.expenses || { transportationFee: 0, handlingFee: 0, otherFee: 0 }
}

// 检查暂存并提示
const checkDraft = () => {
  if (hasDraft(DRAFT_KEY)) {
    const draft = loadDraft(DRAFT_KEY)
    if (draft) {
      const timeText = formatDraftTime(draft.timestamp)
      Modal.confirm({
        title: t.value.salesOrder.restoreDraftTitle,
        content: t.value.salesOrder.restoreDraftContent.replace('{summary}', draft.summary).replace('{time}', timeText),
        okText: t.value.salesOrder.restore,
        cancelText: t.value.salesOrder.discard,
        zIndex: 1050,
        onOk: () => {
          restoreDraft()
          message.success(t.value.salesOrder.draftRestored)
        },
        onCancel: () => {
          clearDraft(DRAFT_KEY)
        },
      })
    }
  }
}

// 初始化时添加一行
watch(
  () => props.visible,
  visible => {
    if (visible && !props.isEdit) {
      if (form.sales_items.length === 0) {
        addNewItem()
      }
    }
  }
)
</script>

<style scoped lang="scss">
.sales-order-form {
  padding: 20px;
}

.sales-order-header {
  text-align: center;
  margin-bottom: 30px;

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .lang-switch {
      flex-shrink: 0;
    }
  }

  .company-name {
    font-size: 22px;
    font-weight: bold;
    margin: 0;
    color: #000;
  }

  .sales-order-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
    color: #000;
  }
}

.sales-order-content {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;

  .form-item {
    flex: 1;
    display: flex;
    align-items: center;

    .customer-name-input {
      min-width: 300px !important;
    }

    .form-label {
      white-space: nowrap;
      margin-right: 8px;
      min-width: 100px;
      font-size: 14px;
    }

    .form-input {
      flex: 1;
    }
  }
}

.table-container {
  margin-bottom: 20px;

  :deep(.ant-table) {
    .ant-table-tbody > tr > td {
      padding: 4px 8px;
    }
  }
}

.table-footer {
  padding: 12px;

  .total-row {
    display: flex;
    align-items: center;
    gap: 16px;

    .total-label {
      font-weight: bold;
      font-size: 16px;
      white-space: nowrap;
    }

    .total-in-words {
      font-size: 14px;
      color: #595959;
    }
  }

  .add-row {
    text-align: right;
    padding-top: 12px;
  }
}

.sales-order-note {
  padding: 16px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;

  .note-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .note-label {
      white-space: nowrap;
      margin-right: 12px;
      min-width: 100px;
      font-size: 14px;
    }

    .note-input {
      flex: 1;
    }
  }
}

.expenses-section {
  margin: 20px 0;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #e8e8e8;

  .expenses-label {
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 12px;
    color: #333;
  }

  .expenses-row {
    display: flex;
    gap: 20px;

    .expense-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;

      label {
        font-size: 13px;
        color: #666;
      }

      .expense-input {
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        padding: 4px 8px;

        &:hover {
          border-color: #40a9ff;
        }
      }
    }
  }
}

.form-footer {
  text-align: right;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

// 隐形输入框样式
.invisible-input {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 4px 8px !important;

  &:hover {
    background: #f5f5f5 !important;
    border: 1px dashed #d9d9d9 !important;
  }
}

.invisible-select {
  :deep(.ant-select-selector) {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  :deep(.ant-select-arrow) {
    display: none !important;
  }
}

.required {
  color: #ff4d4f;
  margin-right: 4px;
}
</style>
