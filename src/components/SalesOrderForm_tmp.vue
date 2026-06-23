<template>
  <a-modal
    :title="isEdit ? '编辑销售订单' : '新增销售订单'"
    :width="900"
    :visible="visible"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :okText="isEdit ? '保存' : '创建'"
    :confirmLoading="submitting"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="horizontal"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
      v-if="visible"
    >
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <a-form-item label="默认单据编号">
          <a-input :value="orderNumber" disabled />
        </a-form-item>

        <a-form-item label="销售合同编号" name="contractNumber">
          <a-input v-model:value="form.contract_number" placeholder="请输入销售合同编号" allow-clear />
        </a-form-item>

        <a-form-item label="客户名称" name="customer">
          <a-select
            v-model:value="form.customer_name"
            placeholder="请选择客户"
            :loading="loading.customers"
            show-search
            :filter-option="false"
            @search="handleCustomerSearch"
            @change="handleCustomerChange"
          >
            <a-select-option
              v-for="customer in customerOptions"
              :key="customer.customer_id"
              :value="customer.customer_name"
            >
              {{ customer.customer_name }} ({{ customer.customer_code }})
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="结算方式" name="paymentMethod">
          <a-select
            v-model:value="form.payment_method"
            placeholder="请选择结算方式"
            :loading="loading.paymentMethods"
            show-search
            :filter-option="false"
            @search="handlePaymentMethodSearch"
          >
            <a-select-option
              v-for="method in paymentMethodOptions"
              :key="method.payment_method_id"
              :value="method.payment_method_name"
            >
              {{ method.payment_method_name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <!-- 销售订单内容表格 -->
        <div class="table-container">
          <a-table
            :columns="itemColumns"
            :data-source="form.quotation_items"
            :pagination="false"
            bordered
            size="small"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'no'">
                {{ index + 1 }}
              </template>

              <template v-else-if="column.key === 'product_name'">
                <a-select
                  v-model:value="record.product_name"
                  placeholder="请选择产品"
                  :loading="loading.products"
                  show-search
                  :filter-option="false"
                  @search="value => handleProductSearch(value, index)"
                  @change="value => handleProductChange(value, index)"
                  style="width: 100%"
                  class="invisible-select"
                >
                  <a-select-option
                    v-for="product in productOptions"
                    :key="product.product_id"
                    :value="product.product_name"
                  >
                    {{ product.product_name }} ({{ product.product_code }})
                  </a-select-option>
                </a-select>
              </template>

              <template v-else-if="column.key === 'model'">
                <a-input v-model:value="record.model" style="width: 100%" class="invisible-input" />
              </template>

              <template v-else-if="column.key === 'description'">
                <a-input
                  v-model:value="record.description"
                  style="width: 100%"
                  class="invisible-input"
                />
              </template>

              <template v-else-if="column.key === 'unit'">
                <a-input v-model:value="record.unit" style="width: 100%" class="invisible-input" />
              </template>

              <template v-else-if="column.key === 'quantity'">
                <a-input-number
                  v-model:value="record.quantity"
                  :min="1"
                  :precision="2"
                  style="width: 100%"
                  @change="() => calculateRowTotal(index)"
                  class="invisible-input"
                />
              </template>

              <template v-else-if="column.key === 'unit_price'">
                <a-input-number
                  v-model:value="record.unit_price"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  @change="() => calculateRowTotal(index)"
                  class="invisible-input"
                />
              </template>

              <template v-else-if="column.key === 'total_amount'">
                <span>{{ formatMoney(record.total_amount) }}</span>
              </template>

              <template v-else-if="column.key === 'status'">
                <a-select
                  v-model:value="record.status"
                  style="width: 100%"
                  class="invisible-select"
                >
                  <a-select-option :value="1">报价中</a-select-option>
                  <a-select-option :value="2">已销售</a-select-option>
                </a-select>
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
                  <span class="total-in-words">大写：{{ amountInWords }}</span>
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

        <a-form-item label="业务分类" name="businessCategory">
          <a-select
            v-model:value="form.business_category"
            placeholder="请选择业务分类"
            :loading="loading.businessCategories"
            show-search
            :filter-option="false"
            @search="handleBusinessCategorySearch"
          >
            <a-select-option
              v-for="category in businessCategoryOptions"
              :key="category.business_category_id"
              :value="category.business_category_name"
            >
              {{ category.business_category_name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="产品名称" name="product">
          <a-select
            v-model:value="form.product_name"
            placeholder="请选择产品"
            :loading="loading.products"
            show-search
            :filter-option="false"
            @search="handleProductSearch"
            @change="handleProductChange"
          >
            <a-select-option
              v-for="product in productOptions"
              :key="product.product_id"
              :value="product.product_name"
            >
              {{ product.product_name }} ({{ product.product_code }})
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="规格型号">
          <a-input v-model:value="form.model" disabled />
        </a-form-item>

        <a-form-item label="规格描述">
          <a-input v-model:value="form.description" disabled />
        </a-form-item>

        <a-form-item label="产品代码" name="productCode">
          <a-input v-model:value="form.product_code" disabled />
        </a-form-item>

        <a-form-item label="单位">
          <a-input v-model:value="form.unit" disabled />
        </a-form-item>

        <a-form-item label="数量" name="quantity">
          <a-input-number
            v-model:value="form.quantity"
            :min="1"
            :precision="2"
            style="width: 100%"
            @change="calculateAmounts"
          />
        </a-form-item>

        <a-form-item label="含税单价 (元)" name="taxIncludedPrice">
          <a-input-number
            v-model:value="form.tax_included_price"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="calculateAmounts"
          />
        </a-form-item>

        <a-form-item label="税率" name="taxRate">
          <a-input-number
            v-model:value="form.tax_rate"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="4"
            style="width: 100%"
            @change="calculateAmounts"
          >
            <template #addonAfter>
              <span>%</span>
            </template>
          </a-input-number>
        </a-form-item>

        <a-form-item label="未税单价 (元)" name="taxExcludedPrice">
          <a-input v-model:value="form.tax_excluded_price" disabled />
        </a-form-item>

        <a-form-item label="含税金额 (元)" name="taxIncludedAmount">
          <a-input v-model:value="form.tax_included_amount" disabled />
        </a-form-item>

        <a-form-item label="未税金额 (元)" name="taxExcludedAmount">
          <a-input v-model:value="form.tax_excluded_amount" disabled />
        </a-form-item>

        <a-form-item label="税额 (元)" name="taxAmount">
          <a-input v-model:value="form.tax_amount" disabled />
        </a-form-item>

        <a-form-item label="币种">
          <a-select
            v-model:value="form.currency"
            style="width: 100%"
          >
            <a-select-option value="CNY">人民币</a-select-option>
            <a-select-option value="USD">美元</a-select-option>
            <a-select-option value="EUR">欧元</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="汇率">
          <a-input-number
            v-model:value="form.exchange_rate"
            :min="0"
            :precision="4"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="发货日期">
          <a-date-picker
            v-model:value="form.delivery_date"
            style="width: 100%"
            format="YYYY-MM-DD"
          />
        </a-form-item>

        <a-form-item label="备注" name="remarks">
          <a-textarea v-model:value="form.remarks" :rows="3" placeholder="请输入备注信息" />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { message } from 'ant-design-vue'
import { salesOrdersApi } from '@/api/salesOrders'
import { customersApi } from '@/api/customers'

// 设置 dayjs locale
dayjs.locale('zh-cn')
import { productsApi } from '@/api/products'
import { paymentMethodsApi } from '@/api/paymentMethods'
import { businessCategoriesApi } from '@/api/businessCategories'
import type {
  SalesOrder,
  CreateSalesOrderRequest,
  CustomerOption,
  ProductOption,
  PaymentMethodOption,
  BusinessCategoryOption
} from '@/types'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  orderData?: Partial<SalesOrder>
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const formRef = ref()
const orderNumber = ref('')
const submitting = ref(false)
const loading = reactive({
  customers: false,
  products: false,
  paymentMethods: false,
  businessCategories: false
})

const customerOptions = ref<CustomerOption[]>([])
const productOptions = ref<ProductOption[]>([])
const paymentMethodOptions = ref<PaymentMethodOption[]>([])
const businessCategoryOptions = ref<BusinessCategoryOption[]>([])

const form = reactive<CreateSalesOrderRequest>({
  contract_number: '',
  customer_name: '',
  customer_code: '',
  payment_method: '',
  business_category: '',
  product_name: '',
  model: '',
  description: '',
  product_code: '',
  unit: '',
  quantity: 1,
  tax_included_price: 0,
  tax_rate: 0.13,
  tax_excluded_price: 0,
  tax_included_amount: 0,
  tax_excluded_amount: 0,
  tax_amount: 0,
  currency: 'CNY',
  exchange_rate: 1,
  delivery_date: undefined,
  remarks: ''
})

const rules = {
  customer_name: [
    { required: true, message: '请选择客户', trigger: 'change' }
  ],
  payment_method: [
    { required: true, message: '请选择结算方式', trigger: 'change' }
  ],
  business_category: [
    { required: true, message: '请选择业务分类', trigger: 'change' }
  ],
  product_name: [
    { required: true, message: '请选择产品', trigger: 'change' }
  ],
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' }
  ],
  tax_included_price: [
    { required: true, message: '请输入含税单价', trigger: 'blur' }
  ],
  tax_rate: [
    { required: true, message: '请输入税率', trigger: 'blur' }
  ]
}

// 获取新的订单号
const getNewOrderNumber = async () => {
  try {
    const { order_number } = await salesOrdersApi.getNewOrderNumber()
    orderNumber.value = order_number
  } catch (error) {
    message.error('获取订单号失败')
  }
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
      customer_code: c.customer_code || c.code
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
const handleProductSearch = async (value: string) => {
  if (!value) {
    const res = await productsApi.getAllList()
    productOptions.value = res.data || []
    return
  }
  loading.products = true
  try {
    const response = await productsApi.getAll({ name: value })
    productOptions.value = response.data.map((p: any) => ({
      product_id: p.product_id || p.id,
      product_name: p.product_name || p.name,
      product_code: p.product_code || p.code,
      model: p.model,
      description: p.description,
      unit: p.unit
    }))
  } catch (error) {
    message.error('获取产品列表失败')
  }
  loading.products = false
}

// 选择产品
const handleProductChange = (value: string) => {
  const product = productOptions.value.find(p => p.product_name === value)
  if (product) {
    form.product_code = product.product_code
    form.model = product.model || ''
    form.description = product.description || ''
    form.unit = product.unit || ''
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
      payment_method_name: m.payment_method_name || m.name
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
      business_category_name: b.business_category_name || b.name
    }))
  } catch (error) {
    message.error('获取业务分类失败')
  }
  loading.businessCategories = false
}

// 计算金额
const calculateAmounts = () => {
  const quantity = Number(form.quantity)
  const taxIncludedPrice = Number(form.tax_included_price)
  const taxRate = Number(form.tax_rate)

  if (quantity && taxIncludedPrice && taxRate) {
    // 未税单价 = 含税单价 / (1 + 税率)
    form.tax_excluded_price = parseFloat((taxIncludedPrice / (1 + taxRate)).toFixed(2))

    // 含税金额 = 数量 * 含税单价
    form.tax_included_amount = parseFloat((quantity * taxIncludedPrice).toFixed(2))

    // 未税金额 = 数量 * 未税单价
    form.tax_excluded_amount = parseFloat((quantity * form.tax_excluded_price).toFixed(2))

    // 税额 = 含税金额 * 税率
    form.tax_amount = parseFloat((form.tax_included_amount * taxRate).toFixed(2))
  } else {
    form.tax_excluded_price = 0
    form.tax_included_amount = 0
    form.tax_excluded_amount = 0
    form.tax_amount = 0
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    // 确保日期是字符串格式
    const submitData = {
      ...form,
      delivery_date: (() => {
        if (!form.delivery_date) return undefined
        if (typeof form.delivery_date === 'string') return form.delivery_date
        try {
          return dayjs(form.delivery_date).format('YYYY-MM-DD')
        } catch {
          return undefined
        }
      })()
    }

    if (props.isEdit && props.orderData?.sales_order_id) {
      await salesOrdersApi.update(props.orderData.sales_order_id, submitData)
      message.success('销售订单更新成功')
      emit('success')
    } else {
      await salesOrdersApi.create(submitData)
      message.success('销售订单创建成功')
      emit('success')
    }

    emit('update:visible', false)
  } catch (error: any) {
    if (error?.errorFields) {
      message.error('请检查表单填写是否正确')
    } else {
      message.error(error?.message || '操作失败')
    }
  } finally {
    submitting.value = false
  }
}

// 取消
const handleCancel = () => {
  emit('update:visible', false)
}

// 监听显示状态变化
watch(() => props.visible, (visible) => {
  if (visible) {
    // 如果是新增模式，获取新的订单号
    if (!props.isEdit) {
      getNewOrderNumber()
      resetForm()
    } else if (props.orderData) {
      // 编辑模式，填充表单
      Object.assign(form, props.orderData)
      // 将日期字符串转换为 dayjs 对象
      if (props.orderData.delivery_date) {
        form.delivery_date = dayjs(props.orderData.delivery_date)
      } else {
        form.delivery_date = undefined
      }
      orderNumber.value = props.orderData.order_number || ''
    }

    // 加载基础数据
    loadBasicData()
  }
})

// 加载基础数据
const loadBasicData = async () => {
  try {
    const [customers, products, paymentMethods, businessCategories] = await Promise.all([
      customersApi.getAllList(),
      productsApi.getAllList(),
      paymentMethodsApi.getAllList(),
      businessCategoriesApi.getAllList()
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
  Object.assign(form, {
    contract_number: '',
    customer_name: '',
    customer_code: '',
    payment_method: '',
    business_category: '',
    product_name: '',
    model: '',
    description: '',
    product_code: '',
    unit: '',
    quantity: 1,
    tax_included_price: 0,
    tax_rate: 0.13,
    tax_excluded_price: 0,
    tax_included_amount: 0,
    tax_excluded_amount: 0,
    tax_amount: 0,
    currency: 'CNY',
    exchange_rate: 1,
    delivery_date: undefined,
    remarks: ''
  })
  orderNumber.value = ''
}
</script>