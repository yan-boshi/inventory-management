<template>
  <a-modal
    :title="isEdit ? '编辑采购订单' : '新增采购订单'"
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

        <a-form-item label="采购合同编号" name="contractNumber">
          <a-input v-model:value="form.contract_number" placeholder="请输入采购合同编号" allow-clear />
        </a-form-item>

        <a-form-item label="供应商名称" name="supplier">
          <a-select
            v-model:value="form.supplier_name"
            placeholder="请选择供应商"
            :loading="loading.suppliers"
            show-search
            :filter-option="false"
            @search="handleSupplierSearch"
            @change="handleSupplierChange"
          >
            <a-select-option
              v-for="supplier in supplierOptions"
              :key="supplier.supplier_id"
              :value="supplier.supplier_name"
            >
              {{ supplier.supplier_name }} ({{ supplier.supplier_code }})
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

        <a-form-item label="交货日期">
          <a-date-picker
            v-model:value="form.delivery_date"
            style="width: 100%"
            format="YYYY-MM-DD"
          />
        </a-form-item>

        <a-form-item label="到货日期">
          <a-date-picker
            v-model:value="form.arrival_date"
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
import { purchaseOrdersApi } from '@/api/purchaseOrders'
import { suppliersApi } from '@/api/suppliers'

// 设置 dayjs locale
dayjs.locale('zh-cn')
import { productsApi } from '@/api/products'
import { paymentMethodsApi } from '@/api/paymentMethods'
import { businessCategoriesApi } from '@/api/businessCategories'
import type { PurchaseOrder, CreatePurchaseOrderRequest, SupplierOption, ProductOption, PaymentMethodOption, BusinessCategoryOption } from '@/types'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  orderData?: Partial<PurchaseOrder>
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const formRef = ref()
const orderNumber = ref('')
const submitting = ref(false)
const loading = reactive({
  suppliers: false,
  products: false,
  paymentMethods: false,
  businessCategories: false
})

const supplierOptions = ref<SupplierOption[]>([])
const productOptions = ref<ProductOption[]>([])
const paymentMethodOptions = ref<PaymentMethodOption[]>([])
const businessCategoryOptions = ref<BusinessCategoryOption[]>([])

const form = reactive<CreatePurchaseOrderRequest>({
  contract_number: '',
  supplier_name: '',
  supplier_code: '',
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
  arrival_date: undefined,
  remarks: ''
})

const rules = {
  supplier_name: [
    { required: true, message: '请选择供应商', trigger: 'change' }
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

const getNewOrderNumber = async () => {
  try {
    const { order_number } = await purchaseOrdersApi.getNewOrderNumber()
    orderNumber.value = order_number
  } catch (error) {
    message.error('获取订单号失败')
  }
}

const handleSupplierSearch = async (value: string) => {
  if (!value) {
    const res = await suppliersApi.getAllList()
    supplierOptions.value = res.data || []
    return
  }
  loading.suppliers = true
  try {
    const response = await suppliersApi.getAll({ name: value })
    supplierOptions.value = response.data.map((s: any) => ({
      supplier_id: s.supplier_id || s.id,
      supplier_name: s.supplier_name || s.name,
      supplier_code: s.supplier_code || s.code
    }))
  } catch (error) {
    message.error('获取供应商列表失败')
  }
  loading.suppliers = false
}

const handleSupplierChange = (value: string) => {
  const supplier = supplierOptions.value.find(s => s.supplier_name === value)
  if (supplier) {
    form.supplier_code = supplier.supplier_code
  }
}

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

const handleProductChange = (value: string) => {
  const product = productOptions.value.find(p => p.product_name === value)
  if (product) {
    form.product_code = product.product_code
    form.model = product.model || ''
    form.description = product.description || ''
    form.unit = product.unit || ''
  }
}

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

const calculateAmounts = () => {
  const quantity = Number(form.quantity)
  const taxIncludedPrice = Number(form.tax_included_price)
  const taxRate = Number(form.tax_rate)

  if (quantity && taxIncludedPrice && taxRate) {
    form.tax_excluded_price = parseFloat((taxIncludedPrice / (1 + taxRate)).toFixed(2))
    form.tax_included_amount = parseFloat((quantity * taxIncludedPrice).toFixed(2))
    form.tax_excluded_amount = parseFloat((quantity * form.tax_excluded_price).toFixed(2))
    form.tax_amount = parseFloat((form.tax_included_amount * taxRate).toFixed(2))
  } else {
    form.tax_excluded_price = 0
    form.tax_included_amount = 0
    form.tax_excluded_amount = 0
    form.tax_amount = 0
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

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

    const submitData = {
      ...form,
      delivery_date: formatDate(form.delivery_date),
      arrival_date: formatDate(form.arrival_date)
    }

    if (props.isEdit && props.orderData?.purchase_order_id) {
      await purchaseOrdersApi.update(props.orderData.purchase_order_id, submitData)
      message.success('采购订单更新成功')
      emit('success')
    } else {
      await purchaseOrdersApi.create(submitData)
      message.success('采购订单创建成功')
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

const handleCancel = () => {
  emit('update:visible', false)
}

watch(() => props.visible, (visible) => {
  if (visible) {
    if (!props.isEdit) {
      getNewOrderNumber()
      resetForm()
    } else if (props.orderData) {
      Object.assign(form, props.orderData)
      // 将日期字符串转换为 dayjs 对象
      if (props.orderData.delivery_date) {
        form.delivery_date = dayjs(props.orderData.delivery_date)
      } else {
        form.delivery_date = undefined
      }
      if (props.orderData.arrival_date) {
        form.arrival_date = dayjs(props.orderData.arrival_date)
      } else {
        form.arrival_date = undefined
      }
      orderNumber.value = props.orderData.order_number || ''
    }

    loadBasicData()
  }
})

const loadBasicData = async () => {
  try {
    const [suppliers, products, paymentMethods, businessCategories] = await Promise.all([
      suppliersApi.getAllList(),
      productsApi.getAllList(),
      paymentMethodsApi.getAllList(),
      businessCategoriesApi.getAllList()
    ])

    supplierOptions.value = suppliers.data || []
    productOptions.value = products.data || []
    paymentMethodOptions.value = paymentMethods.data || []
    businessCategoryOptions.value = businessCategories.data || []
  } catch (error) {
    message.error('加载基础数据失败')
  }
}

const resetForm = () => {
  Object.assign(form, {
    contract_number: '',
    supplier_name: '',
    supplier_code: '',
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
    arrival_date: undefined,
    remarks: ''
  })
  orderNumber.value = ''
}
</script>
