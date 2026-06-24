<template>
  <a-modal
    :title="isEdit ? '编辑报价单' : '新增报价单'"
    :width="1300"
    :visible="visible"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :okText="'保存'"
    :confirmLoading="submitting"
    :footer="null"
  >
    <div v-if="visible" class="quotation-form">
      <!-- 报价单头部 -->
      <div class="quotation-header">
        <h1 class="company-name">深圳市旭思达光电科技有限公司</h1>
        <h2 class="quotation-title">报价单</h2>
      </div>

      <!-- 报价内容 -->
      <div class="quotation-content">
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">报价编号：</label>
            <span class="invisible-input">{{ quotationNumber }}</span>
          </div>
          <div class="form-item">
            <label class="form-label">客户名称：</label>
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
        </div>

        <!-- 报价内容表格 -->
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
                  :precision="0"
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
                <span>{{ record.total_amount }}</span>
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
                <a-space>
                  <a-button type="link" size="small" @click="handleConvertRow(index)">
                    销售
                  </a-button>
                  <a-button type="link" size="small" danger @click="deleteItem(index)">
                    删除
                  </a-button>
                </a-space>
              </template>
            </template>

            <template #footer>
              <div class="table-footer">
                <div class="total-row">
                  <span class="total-label">总价：</span>
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

        <!-- 报价说明 -->
        <div class="quotation-note">
          <div class="note-row">
            <label class="note-label">币种：</label>
            <a-select v-model:value="form.currency" class="invisible-select note-input">
              <a-select-option value="CNY">人民币 (CNY)</a-select-option>
              <a-select-option value="USD">美元 (USD)</a-select-option>
              <a-select-option value="EUR">欧元 (EUR)</a-select-option>
              <a-select-option value="HKD">港币 (HKD)</a-select-option>
            </a-select>
          </div>
          <div class="note-row">
            <label class="note-label">报价有效期：</label>
            <a-input
              v-model:value="form.validity_period"
              placeholder="自报价之日起10个工作日"
              class="invisible-input note-input"
            />
          </div>
          <div class="note-row">
            <label class="note-label">送货方式：</label>
            <a-select v-model:value="form.delivery_method" class="invisible-select note-input">
              <a-select-option value="送货上门">送货上门</a-select-option>
              <a-select-option value="自提">自提</a-select-option>
              <a-select-option value="物流快递">物流快递</a-select-option>
            </a-select>
          </div>
          <div class="note-row">
            <label class="note-label">报价单税率：</label>
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
      </div>

      <!-- 底部按钮 -->
      <div class="form-footer">
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button @click="handlePrint">打印</a-button>
          <a-button type="primary" @click="handleSaveAndPrint">保存并打印</a-button>
          <a-button type="primary" @click="handleSubmit">保存</a-button>
          <a-button type="primary" @click="handleConvertAll">销售</a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { quotationsApi } from '@/api/quotations'
import { customersApi } from '@/api/customers'
import { productsApi } from '@/api/products'
import type { CreateQuotationRequest, QuotationItem, CustomerOption, ProductOption } from '@/types'
import type { Quotation } from '@/types'

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
const loading = reactive({
  customers: false,
  products: false,
})

const customerOptions = ref<CustomerOption[]>([])
const productOptions = ref<ProductOption[]>([])

const form = reactive<CreateQuotationRequest & { quotation_items: QuotationItem[] }>({
  customer_name: '',
  customer_code: '',
  quotation_items: [],
  validity_period: '自报价之日起10个工作日',
  delivery_method: '送货上门',
  tax_rate: 13,
  currency: 'CNY',
  remarks: '',
})

const itemColumns = [
  { title: '编号', key: 'no', width: 60, align: 'center' },
  { title: '产品名称', key: 'product_name', width: 150 },
  { title: '规格型号', key: 'model', width: 120 },
  { title: '规格描述', key: 'description', width: 120 },
  { title: '单位', key: 'unit', width: 80 },
  { title: '数量', key: 'quantity', width: 100 },
  { title: '单价', key: 'unit_price', width: 100, align: 'right' },
  { title: '合计', key: 'total_amount', width: 100, align: 'right' },
  { title: '状态', key: 'status', width: 100 },
  { title: '备注', key: 'remarks', width: 150 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

const totalAmount = computed({
  get: () => form.quotation_items.reduce((sum, item) => sum + (item.total_amount || 0), 0),
  set: value => {
    if (form.quotation_items.length > 0) {
      const currentTotal = form.quotation_items.reduce(
        (sum, item) => sum + (item.total_amount || 0),
        0
      )
      if (currentTotal > 0) {
        const ratio = value / currentTotal
        form.quotation_items.forEach(item => {
          item.total_amount = parseFloat((item.total_amount || 0 * ratio).toFixed(2))
          if (item.quantity > 0) {
            item.unit_price = parseFloat((item.total_amount / item.quantity).toFixed(2))
          }
        })
      }
    }
  },
})

const amountInWords = computed(() => {
  return numberToChinese(totalAmount.value)
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
    const response = await productsApi.getAll({ name: value })
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
  const product = productOptions.value.find(p => p.product_name === value)
  if (product) {
    form.quotation_items[index].product_code = product.product_code || ''
    form.quotation_items[index].model = product.model || ''
    form.quotation_items[index].description = product.description || ''
    form.quotation_items[index].unit = product.unit || ''
  }
}

// 计算行合计
const calculateRowTotal = (index: number) => {
  const item = form.quotation_items[index]
  if (item.quantity && item.unit_price) {
    item.total_amount = parseFloat((item.quantity * item.unit_price).toFixed(2))
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
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    status: 1,
    remarks: '',
  })
}

// 格式化金额
const formatMoney = (amount: number) => {
  return `${(amount || 0).toFixed(2)}`
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

  try {
    submitting.value = true

    const submitData = {
      customer_name: form.customer_name,
      customer_code: form.customer_code,
      quotation_items: JSON.stringify(form.quotation_items),
      validity_period: form.validity_period,
      delivery_method: form.delivery_method,
      tax_rate: form.tax_rate,
      currency: form.currency,
      tax_include_amount: totalAmount.value,
      remarks: form.remarks,
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
        getNewQuotationNumber()
        resetForm()
      } else if (props.quotationData) {
        form.customer_name = props.quotationData.customer_name
        form.customer_code = props.quotationData.customer_code
        form.validity_period = props.quotationData.validity_period || '自报价之日起10个工作日'
        form.delivery_method = props.quotationData.delivery_method || '送货上门'
        form.tax_rate = props.quotationData.tax_rate || 13
        form.currency = props.quotationData.currency || 'CNY'
        form.remarks = props.quotationData.remarks || ''
        quotationNumber.value = props.quotationData.quotation_number || ''
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
  form.validity_period = '自报价之日起10个工作日'
  form.delivery_method = '送货上门'
  form.tax_rate = 13
  form.currency = 'CNY'
  form.remarks = ''
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
