<template>
  <a-modal
    :title="isEdit ? '编辑销售订单' : '新增销售订单'"
    width="85%"
    :visible="visible"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :okText="'保存'"
    :confirmLoading="submitting"
    :footer="null"
  >
    <div v-if="visible" class="sales-order-form">
      <!-- 销售订单头部 -->
      <div class="sales-order-header">
        <h1 class="company-name">深圳市旭思达光电科技有限公司</h1>
        <h2 class="sales-order-title">销售订单</h2>
      </div>

      <!-- 销售订单内容 -->
      <div class="sales-order-content">
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">默认单据编号：</label>
            <span class="invisible-input">{{ orderNumber }}</span>
          </div>
          <div class="form-item">
            <label class="form-label">销售合同编号：</label>
            <a-input v-model:value="form.contract_number" class="invisible-input note-input" />
          </div>
          <!-- <div class="form-item">
            <label class="form-label">销售人：</label>
            <a-input v-model:value="form.sales_person" class="invisible-input note-input" disabled />
          </div> -->
        </div>
        <div class="sales-order-content">
          <div class="form-row">
            <div class="form-item">
              <label class="form-label">客户名称:</label>
              <a-select
                v-model:value="form.customer_name"
                placeholder="请选择客户"
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
              <label class="form-label">结算方式：</label>
              <a-select
                v-model:value="form.payment_method"
                placeholder="请选择结算方式"
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
              <label class="form-label">币种：</label>
              <a-select v-model:value="form.currency" class="invisible-select customer-name-input">
                <a-select-option value="CNY">人民币</a-select-option>
                <a-select-option value="USD">美元</a-select-option>
                <a-select-option value="EUR">欧元</a-select-option>
              </a-select>
            </div>
            <div class="form-item">
              <label class="form-label">发货日期：</label>
              <a-date-picker
                v-model:value="form.delivery_date"
                class="invisible-select customer-name-input"
                format="YYYY-MM-DD"
              />
            </div>
          </div>

          <!-- 报价内容表格 -->
          <div class="table-container">
            <a-table
              :columns="itemColumns"
              :data-source="form.sales_items"
              :pagination="false"
              bordered
              size="small"
              :scroll="{ x: 1630 }"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'no'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'business_category'">
                  <a-select
                    v-model:value="record.business_category"
                    placeholder="请选择业务分类"
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
                    placeholder="请选择产品"
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
                      {{ product.product_name }}（{{product.product_code}}）
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
                <template v-else-if="column.key === 'tax_encluded_price'">
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

                <template v-else-if="column.key === 'remarks'">
                  <a-input
                    v-model:value="record.remarks"
                    style="width: 100%"
                    class="invisible-input"
                  />
                </template>

                <template v-else-if="column.key === 'actions'">
                  <a-button type="link" size="small" danger @click="deleteItem(index)">
                    删除
                  </a-button>
                </template>
              </template>

              <template #footer>
                <div class="table-footer">
                  <div class="total-row">
                    <span class="total-label">含税总价：</span>
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
                      追加行
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
              <div class="expenses-label">销售费用登记</div>
              <div class="expenses-row">
                <div class="expense-item">
                  <label>交通费</label>
                  <a-input-number
                    v-model:value="form.expenses.transportationFee"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    class="expense-input"
                  />
                </div>
                <div class="expense-item">
                  <label>招待费</label>
                  <a-input-number
                    v-model:value="form.expenses.entertainmentFee"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    class="expense-input"
                  />
                </div>
                <div class="expense-item">
                  <label>礼品费</label>
                  <a-input-number
                    v-model:value="form.expenses.giftFee"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    class="expense-input"
                  />
                </div>
                <div class="expense-item">
                  <label>其他</label>
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
              <label class="note-label">备注：</label>
              <a-textarea v-model:value="form.remarks" :rows="3" />
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="form-footer">
          <a-space>
            <a-button @click="handleCancel">取消</a-button>
            <a-button v-if="!isEdit" @click="handleSaveDraft">暂存</a-button>
            <!-- <a-button @click="handlePrint">打印</a-button> -->
            <!-- <a-button type="primary" @click="handleSaveAndPrint">保存并打印</a-button> -->
            <a-button type="primary" @click="handleSubmit">保存</a-button>
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
import type {
  CreateSalesOrderRequest,
  SalesOrderItem,
  CustomerOption,
  ProductOption,
  PaymentMethodOption,
  BusinessCategoryOption,
} from '@/types'

const userStore = useUserStore()

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
    1: '未出库',
    2: '已全部出库',
    3: '已部分出库',
    4: '退货',
  }
  return textMap[status] || '未知'
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
  delivery_date: '',
  remarks: '',
  sales_person: '',
  expenses: {
    transportationFee: 0,
    entertainmentFee: 0,
    giftFee: 0,
    otherFee: 0,
  },
})

const itemColumns = [
  { title: '编号', key: 'no', width: 60, align: 'center', fixed: 'left' as const },
  { title: '业务分类', key: 'business_category', width: 120, fixed: 'left' as const },
  { title: '产品代码', key: 'product_code', width: 120, fixed: 'left' as const },
  { title: '产品名称', key: 'product_name', width: 150, fixed: 'left' as const },
  { title: '规格型号', key: 'model', width: 100, fixed: 'left' as const },
  { title: '规格描述', key: 'description', width: 120, fixed: 'left' as const },
  { title: '单位', key: 'unit', width: 70 },
  { title: '数量', key: 'quantity', width: 80 },
  { title: '税率（%）', key: 'tax_rate', width: 90 },
  { title: '含税单价', key: 'tax_included_price', width: 100, align: 'right' as const },
  { title: '未税单价', key: 'tax_encluded_price', width: 100, align: 'right' as const },
  { title: '含税金额', key: 'tax_included_amount', width: 110, align: 'right' as const },
  { title: '未税金额', key: 'tax_excluded_amount', width: 110, align: 'right' as const },
  { title: '税额', key: 'tax_amount', width: 100, align: 'right' as const },
  { title: '状态', key: 'status', width: 80 },
  { title: '备注', key: 'remarks', width: 150 },
  { title: '操作', key: 'actions', width: 70, fixed: 'right' as const },
]

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
    message.error('获取销售订单编号失败')
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
    message.error('获取结算方式失败')
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
    message.error('获取业务分类失败')
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
    message.error('获取客户列表失败')
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
    message.error('获取产品列表失败')
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
  if (item.tax_included_price) {
    item.tax_excluded_price = parseFloat(
      (Number(item.tax_included_price) * (1 - Number(item.tax_rate) / 100)).toFixed(2)
    )
  } else {
    item.tax_excluded_price = Number(item.tax_included_price)
  }
  if (item.quantity && item.tax_included_price) {
    item.tax_included_amount = parseFloat(
      (Number(item.quantity) * Number(item.tax_included_price)).toFixed(2)
    )
    item.tax_excluded_amount = parseFloat(
      (
        Number(item.quantity) *
        (1 - Number(item.tax_rate) / 100) *
        Number(item.tax_included_price)
      ).toFixed(2)
    )
    console.log('item.tax_excluded_amount', item.tax_excluded_amount)
    item.tax_amount = parseFloat(
      ((Number(item.tax_included_amount) * Number(item.tax_rate)) / 100).toFixed(2)
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
    tax_rate: 0,
    tax_included_price: 0,
    tax_encluded_price: 0,
    tatax_included_amountx_rate: 0,
    tax_excluded_amount: 0,
    tax_amount: 0,
    status: 1,
    remarks: '',
  })
}

// 格式化金额
// const formatMoney = (amount: number) => {
//   return `¥${(amount || 0).toFixed(2)}`
// }

// 提交表单
const handleSubmit = async () => {
  if (!form.customer_name) {
    message.error('请选择客户')
    return
  }
  if (!form.payment_method) {
    message.error('请选择结算方式')
    return
  }
  if (!form.delivery_date) {
    message.error('请选择发货日期')
    return
  }
  // 检查所有商品是否填写了业务分类
  const hasMissingCategory = form.sales_items.some((item: any) => !item.business_category)
  if (hasMissingCategory) {
    message.error('请填写所有商品的业务分类')
    return
  }
  if (form.sales_items.length === 0) {
    message.error('请添加销售内容')
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

    const submitData = {
      order_number: orderNumber.value,
      contract_number: form.contract_number,
      customer_name: form.customer_name,
      customer_code: form.customer_code,
      payment_method: form.payment_method,
      sales_items: JSON.stringify(form.sales_items),
      currency: form.currency,
      delivery_date: formatDate(form.delivery_date),
      tax_included_amount: totalAmount.value,
      remarks: form.remarks,
      expenses: form.expenses,
      sales_person: userStore.user?.username || '',
    }

    if (props.isEdit && props.salesOrderData?.sales_order_id) {
      await salesOrdersApi.update(props.salesOrderData.sales_order_id, submitData)
      message.success('销售订单更新成功')
      emit('success')
    } else {
      await salesOrdersApi.create(submitData)
      message.success('销售订单创建成功')
      clearDraft(DRAFT_KEY)
      emit('success')
    }

    emit('update:visible', false)
  } catch (error) {
    message.error(error?.message || '操作失败')
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
    delivery_date: form.delivery_date,
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
        if (props.salesOrderData.delivery_date) {
          form.delivery_date = dayjs(props.salesOrderData.delivery_date)
        } else {
          form.delivery_date = undefined
        }
        form.remarks = props.salesOrderData.remarks || ''
        orderNumber.value = props.salesOrderData.order_number || ''
        try {
          form.sales_items = JSON.parse(props.salesOrderData.sales_items || '[]')
        } catch {
          form.sales_items = []
        }
        try {
          form.expenses = props.salesOrderData.expenses
            ? JSON.parse(props.salesOrderData.expenses)
            : { transportationFee: 0, entertainmentFee: 0, giftFee: 0, otherFee: 0 }
        } catch {
          form.expenses = { transportationFee: 0, entertainmentFee: 0, giftFee: 0, otherFee: 0 }
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
    message.error('加载基础数据失败')
  }
}

// 重置表单
const resetForm = () => {
  form.customer_name = ''
  form.customer_code = ''
  form.payment_method = ''
  form.sales_items = []
  form.currency = 'CNY'
  form.delivery_date = ''
  form.remarks = ''
  form.sales_person = ''
  form.expenses = { transportationFee: 0, entertainmentFee: 0, giftFee: 0, otherFee: 0 }
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
    delivery_date: form.delivery_date ? (typeof form.delivery_date === 'string' ? form.delivery_date : dayjs(form.delivery_date).format('YYYY-MM-DD')) : '',
    remarks: form.remarks,
    expenses: form.expenses,
  }
  const summary = form.customer_name ? `${form.customer_name} - ${form.sales_items.length}个商品` : `${form.sales_items.length}个商品`
  saveDraft(DRAFT_KEY, draftData, summary)
  message.success('暂存成功')
}

// 恢复暂存
const restoreDraft = () => {
  const draft = loadDraft(DRAFT_KEY)
  if (!draft) return

  form.contract_number = draft.data.contract_number || ''
  form.customer_name = draft.data.customer_name || ''
  form.customer_code = draft.data.customer_code || ''
  form.payment_method = draft.data.payment_method || ''
  form.sales_items = draft.data.sales_items || []
  form.currency = draft.data.currency || 'CNY'
  // 将日期字符串转换为 dayjs 对象
  form.delivery_date = draft.data.delivery_date ? dayjs(draft.data.delivery_date) : ''
  form.remarks = draft.data.remarks || ''
  form.expenses = draft.data.expenses || { transportationFee: 0, entertainmentFee: 0, giftFee: 0, otherFee: 0 }
}

// 检查暂存并提示
const checkDraft = () => {
  if (hasDraft(DRAFT_KEY)) {
    const draft = loadDraft(DRAFT_KEY)
    if (draft) {
      const timeText = formatDraftTime(draft.timestamp)
      Modal.confirm({
        title: '恢复暂存内容',
        content: `检测到上次暂存的内容（${draft.summary}，暂存于${timeText}），是否恢复？`,
        okText: '恢复',
        cancelText: '放弃',
        zIndex: 1050,
        onOk: () => {
          restoreDraft()
          message.success('已恢复暂存内容')
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

  .company-name {
    font-size: 22px;
    font-weight: bold;
    margin: 0 0 12px 0;
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
</style>
