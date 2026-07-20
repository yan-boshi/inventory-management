<template>
  <a-modal
    :title="isEdit ? t.quotation.editTitle : t.quotation.newTitle"
    :width="1300"
    :visible="visible"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :okText="t.common.save"
    :confirmLoading="submitting"
    :footer="null"
  >
    <div v-if="visible" class="quotation-form">
      <!-- 报价单头部 -->
      <div class="quotation-header">
        <div class="header-top">
          <div></div>
          <h1 class="company-name">{{ t.quotation.companyName }}</h1>
          <a-radio-group v-model:value="lang" size="small" class="lang-switch">
            <a-radio-button value="zh">中文</a-radio-button>
            <a-radio-button value="en">English</a-radio-button>
          </a-radio-group>
        </div>
        <h2 class="quotation-title">{{ t.quotation.title }}</h2>
      </div>

      <!-- 报价内容 -->
      <div class="quotation-content">
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">{{ t.quotation.quotationNo }}</label>
            <a-input v-model:value="quotationNumber" class="invisible-input" />
          </div>
          <div class="form-item">
            <label class="form-label">{{ t.quotation.customer }}</label>
            <a-select
              v-model:value="form.customer_name"
              :placeholder="t.quotation.selectCustomer"
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
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label"><span class="required">*</span>{{ t.quotation.entryDate }}</label>
            <a-date-picker
              v-model:value="form.entry_date"
              style="width: 100%"
              format="YYYY-MM-DD"
            />
          </div>
          <div class="form-item"></div>
        </div>

        <!-- 报价内容表格 -->
        <div class="table-container">
          <a-table
            :columns="itemColumns"
            :data-source="form.quotation_items"
            :pagination="false"
            bordered
            size="small"
            :scroll="{ y: 400 }"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'no'">
                {{ index + 1 }}
              </template>

              <template v-else-if="column.key === 'product_code'">
                <a-select
                  v-model:value="record.product_code"
                  :placeholder="t.common.pleaseSelect"
                  :loading="loading.products"
                  show-search
                  :filter-option="false"
                  @search="value => handleProductSearch(value, index)"
                  @change="value => handleProductChange(value, index)"
                  style="width: 100%"
                  class="invisible-select"
                  optionLabelProp="product_code"
                >
                  <a-select-option
                    v-for="product in productOptions"
                    :key="product.product_id"
                    :value="product.product_code"
                  >
                    {{ product.product_name }} ({{ product.product_code }})
                  </a-select-option>
                </a-select>
              </template>
              <template v-else-if="column.key === 'product_name'">
                <a-input v-model:value="record.product_name" style="width: 100%" class="invisible-input" />
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
                <a-input
                  v-model:value="record.quantity"
                  :placeholder="t.quotation.quantityPlaceholder"
                  style="width: 100%"
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

              <template v-else-if="column.key === 'status'">
                <a-select
                  v-model:value="record.status"
                  style="width: 100%"
                  class="invisible-select"
                >
                  <a-select-option :value="1">{{ t.quotation.quoting }}</a-select-option>
                  <a-select-option :value="2">{{ t.quotation.sold }}</a-select-option>
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
                <a-space>
                  <a-button type="link" size="small" @click="handleConvertRow(index)">
                    {{ t.quotation.sale }}
                  </a-button>
                  <a-button type="link" size="small" danger @click="deleteItem(index)">
                    {{ t.common.delete }}
                  </a-button>
                </a-space>
              </template>
            </template>

            <template #footer>
              <div class="table-footer">
                <div class="add-row">
                  <a-button type="dashed" size="small" @click="addNewItem">
                    <template #icon>
                      <PlusOutlined />
                    </template>
                    {{ t.quotation.addRow }}
                  </a-button>
                </div>
              </div>
            </template>
          </a-table>
        </div>

        <!-- 报价说明 -->
        <div class="quotation-note">
          <div class="note-row">
            <label class="note-label">{{ t.quotation.currency }}</label>
            <a-select v-model:value="form.currency" class="invisible-select note-input">
              <a-select-option value="CNY">CNY</a-select-option>
              <a-select-option value="USD">USD</a-select-option>
              <a-select-option value="EUR">EUR</a-select-option>
              <a-select-option value="HKD">HKD</a-select-option>
            </a-select>
          </div>
          <div class="note-row">
            <label class="note-label">{{ t.quotation.validity }}</label>
            <a-input
              v-model:value="form.validity_period"
              :placeholder="t.quotation.validityPlaceholder"
              class="invisible-input note-input"
            />
          </div>
          <div class="note-row">
            <label class="note-label">{{ t.quotation.delivery }}</label>
            <a-select v-model:value="form.delivery_method" class="invisible-select note-input">
              <a-select-option value="送货上门">{{ t.quotation.deliveryOptions.doorToDoor }}</a-select-option>
              <a-select-option value="自提">{{ t.quotation.deliveryOptions.selfPickup }}</a-select-option>
              <a-select-option value="物流快递">{{ t.quotation.deliveryOptions.express }}</a-select-option>
              <a-select-option value="其他">{{ t.quotation.deliveryOptions.other }}</a-select-option>
            </a-select>
          </div>
          <div class="note-row">
            <label class="note-label">{{ t.quotation.taxRate }}</label>
            <a-input-number
              v-model:value="form.tax_rate"
              :min="0"
              :max="100"
              :precision="2"
              style="width: 100px"
              class="invisible-input"
            >
              <template #addonAfter>
                <span>%</span>
              </template>
            </a-input-number>
          </div>
        </div>

        <!-- 备注 -->
        <div class="quotation-remarks">
          <label class="remarks-label">{{ t.common.remarks }}：</label>
          <a-textarea
            v-model:value="form.remarks"
            :rows="3"
            :placeholder="t.common.pleaseInput"
            class="invisible-input"
          />
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="form-footer">
        <a-space>
          <a-button @click="handleCancel">{{ t.common.cancel }}</a-button>
          <a-button @click="handlePrint">{{ t.quotation.print }}</a-button>
          <a-button type="primary" @click="handleSaveAndPrint">{{ t.quotation.saveAndPrint }}</a-button>
          <a-button type="primary" @click="handleSubmit">{{ t.common.save }}</a-button>
          <a-button type="primary" @click="handleConvertAll">{{ t.quotation.sale }}</a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { quotationsApi } from '@/api/quotations'
import { customersApi } from '@/api/customers'
import { productsApi } from '@/api/products'
import type { CreateQuotationRequest, QuotationItem, CustomerOption, ProductOption } from '@/types'
import type { Quotation } from '@/types'
import { getLocale, type Lang } from '@/locales'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  quotationData?: any
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
  print: [data: any]
  convert: [data: any]
}>()

const quotationNumber = ref('')
const submitting = ref(false)
const lang = ref<Lang>('zh')
const loading = reactive({
  customers: false,
  products: false,
})

const customerOptions = ref<CustomerOption[]>([])
const productOptions = ref<ProductOption[]>([])

// 获取当前语言的翻译
const t = computed(() => getLocale(lang.value))

const form = reactive<CreateQuotationRequest & { quotation_items: QuotationItem[] }>({
  customer_name: '',
  customer_code: '',
  quotation_items: [],
  validity_period: '',
  delivery_method: '',
  tax_rate: 13,
  currency: 'CNY',
  remarks: '',
  entry_date: dayjs(),
})

// 根据语言动态生成列定义
const itemColumns = computed(() => [
  { title: t.value.quotation.no, key: 'no', width: 60, align: 'center' as const },
  { title: t.value.quotation.productCode, key: 'product_code', width: 120 },
  { title: t.value.quotation.productName, key: 'product_name', width: 150 },
  { title: t.value.quotation.model, key: 'model', width: 120 },
  { title: t.value.quotation.description, key: 'description', width: 120 },
  { title: t.value.quotation.unit, key: 'unit', width: 80 },
  { title: t.value.quotation.quantity, key: 'quantity', width: 100 },
  { title: t.value.quotation.unitPrice, key: 'unit_price', width: 100, align: 'right' as const },
  { title: t.value.common.status, key: 'status', width: 100 },
  { title: t.value.common.remarks, key: 'remarks', width: 150 },
  { title: t.value.common.action, key: 'actions', width: 80, fixed: 'right' as const },
])

// 获取新的报价编号
const getNewQuotationNumber = async () => {
  try {
    const res = await quotationsApi.getNewQuotationNumber()
    quotationNumber.value = res.data.quotation_number
  } catch (error) {
    message.error('获取报价编号失败')
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
    form.quotation_items[index].product_name = product.product_name || ''
    form.quotation_items[index].model = product.model || ''
    form.quotation_items[index].description = product.description || ''
    form.quotation_items[index].unit = product.unit || ''
  }
}

// 计算行合计
const calculateRowTotal = (index: number) => {
  const item = form.quotation_items[index]
  // 如果数量是纯数字，则自动计算合计
  if (item.quantity && item.unit_price && !isNaN(Number(item.quantity))) {
    item.total_amount = parseFloat((Number(item.quantity) * item.unit_price).toFixed(2))
  } else {
    item.total_amount = 0
  }
}

// 删除行
const deleteItem = (index: number) => {
  form.quotation_items.splice(index, 1)
}

// 新增行
const addNewItem = () => {
  form.quotation_items.push({
    no: form.quotation_items.length + 1,
    product_name: '',
    model: '',
    description: '',
    product_code: '',
    unit: '',
    quantity: '',
    unit_price: 0,
    total_amount: 0,
    status: 1,
    remarks: '',
  })
}

// 提交表单
const handleSubmit = async () => {
  if (!form.customer_name) {
    message.error('请选择客户')
    return
  }
  if (form.quotation_items.length === 0) {
    message.error('请添加报价内容')
    return
  }
  if (!form.entry_date) {
    message.error('请选择录入日期')
    return
  }

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
      quotation_number: quotationNumber.value,
      customer_name: form.customer_name,
      customer_code: form.customer_code,
      quotation_items: JSON.stringify(form.quotation_items),
      validity_period: form.validity_period,
      delivery_method: form.delivery_method,
      tax_rate: form.tax_rate,
      currency: form.currency,
      tax_include_amount: 0,
      remarks: form.remarks,
      entry_date: formatDate(form.entry_date),
    }

    if (props.isEdit && props.quotationData?.quotation_id) {
      await quotationsApi.update(props.quotationData.quotation_id, submitData)
      message.success('报价单更新成功')
      emit('success')
    } else {
      await quotationsApi.create(submitData)
      message.success('报价单创建成功')
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
    quotation_number: quotationNumber.value,
    customer_name: form.customer_name,
    customer_code: form.customer_code,
    quotation_items: form.quotation_items,
    validity_period: form.validity_period,
    delivery_method: form.delivery_method,
    tax_rate: form.tax_rate,
    currency: form.currency,
    remarks: form.remarks,
    total_amount: 0,
    lang: lang.value,
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
        getNewQuotationNumber()
        resetForm()
      } else if (props.quotationData) {
        form.customer_name = props.quotationData.customer_name
        form.customer_code = props.quotationData.customer_code
        form.validity_period = props.quotationData.validity_period || t.value.quotation.validityPlaceholder
        form.delivery_method = props.quotationData.delivery_method || '送货上门'
        form.tax_rate = props.quotationData.tax_rate || 13
        form.currency = props.quotationData.currency || 'CNY'
        form.remarks = props.quotationData.remarks || ''
        quotationNumber.value = props.quotationData.quotation_number || ''
        if (props.quotationData.entry_date) {
          form.entry_date = dayjs(props.quotationData.entry_date)
        } else {
          form.entry_date = dayjs()
        }
        try {
          form.quotation_items = JSON.parse(props.quotationData.quotation_items || '[]')
        } catch {
          form.quotation_items = []
        }
      }

      loadBasicData()
    }
  }
)

// 加载基础数据
const loadBasicData = async () => {
  try {
    const [customers, products] = await Promise.all([
      customersApi.getAllList(),
      productsApi.getAllList(),
    ])
    customerOptions.value = customers.data || []
    productOptions.value = products.data || []
  } catch (error) {
    message.error('加载基础数据失败')
  }
}

// 重置表单
const resetForm = () => {
  form.customer_name = ''
  form.customer_code = ''
  form.quotation_items = []
  form.validity_period = t.value.quotation.validityPlaceholder
  form.delivery_method = '送货上门'
  form.tax_rate = 13
  form.currency = 'CNY'
  form.remarks = ''
  form.entry_date = dayjs()
  quotationNumber.value = ''
}

// 处理行级别销售 - 打开销售订单编辑界面，填写当前行数据
const handleConvertRow = () => {
  if (!props.isEdit) {
    message.warning('请先保存报价单')
    return
  }

  // 触发转换事件，由父组件打开销售订单表单
  emit('convert', {
    quotation_number: quotationNumber.value,
    customer_name: form.customer_name,
    customer_code: form.customer_code,
    quotation_items: form.quotation_items, // 传递所有商品数据
    tax_rate: form.tax_rate,
    currency: form.currency,
    isRowConvert: true, // 标记为行级别转换
  })
}

// 处理整单销售 - 打开销售订单编辑界面，填写所有数据
const handleConvertAll = () => {
  if (!props.isEdit) {
    message.warning('请先保存报价单')
    return
  }

  // 触发转换事件，由父组件打开销售订单表单
  emit('convert', {
    quotation_number: quotationNumber.value,
    customer_name: form.customer_name,
    customer_code: form.customer_code,
    quotation_items: form.quotation_items,
    tax_rate: form.tax_rate,
    currency: form.currency,
    isRowConvert: false, // 标记为整单转换
  })
}

// 监听语言变化，更新有效期默认内容
watch(lang, (newLang, oldLang) => {
  if (newLang !== oldLang) {
    const oldLocale = getLocale(oldLang)
    const newLocale = getLocale(newLang)
    // 如果当前有效期等于旧语言的默认值，则更新为新语言的默认值
    if (form.validity_period === oldLocale.quotation.validityPlaceholder) {
      form.validity_period = newLocale.quotation.validityPlaceholder
    }
  }
})

// 初始化时添加一行
watch(
  () => props.visible,
  visible => {
    if (visible && !props.isEdit) {
      if (form.quotation_items.length === 0) {
        addNewItem()
      }
    }
  }
)
</script>

<style scoped lang="scss">
.quotation-form {
  padding: 20px;
}

.quotation-header {
  text-align: center;
  margin-bottom: 30px;
  position: relative;

  .header-top {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 12px;
    position: relative;

    .lang-switch {
      position: absolute;
      right: 0;
    }
  }

  .company-name {
    font-size: 22px;
    font-weight: bold;
    margin: 0 0 12px 0;
    color: #000;
    text-align: center;
  }

  .quotation-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
    color: #000;
  }
}

.quotation-content {
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

.quotation-note {
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

.quotation-remarks {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;

  .remarks-label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
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
