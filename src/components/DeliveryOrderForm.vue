<template>
  <a-modal
    :title="isEdit ? '编辑出库单' : '新增出库单'"
    width="90%"
    :visible="open"
    @cancel="handleClose"
    :footer="null"
    :destroyOnClose="true"
  >
    <div v-if="open" class="delivery-order-form">
      <!-- 出库单头部 -->
      <div class="delivery-order-header">
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">默认单据编号：</label>
            <span class="order-number">{{ orderNumber }}</span>
          </div>
          <div class="form-item">
            <label class="form-label">销售合同编号：</label>
            <a-select
              v-model:value="formData.contract_number"
              placeholder="选择销售合同"
              :loading="loading.salesOrders"
              show-search
              :filter-option="false"
              @search="handleSalesOrderSearch"
              @change="handleSalesOrderChange"
              allowClear
              style="width: 100%"
            >
              <a-select-option
                v-for="order in salesOrderOptions"
                :key="order.contract_number"
                :value="order.contract_number"
              >
                {{ order.contract_number || order.order_number }}
              </a-select-option>
            </a-select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">客户名称：</label>
            <a-select
              v-model:value="formData.customer_name"
              placeholder="请选择客户"
              :loading="loading.customers"
              show-search
              :filter-option="false"
              @search="handleCustomerSearch"
              @change="handleCustomerChange"
              allowClear
              style="width: 100%"
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
            <label class="form-label">客户地址：</label>
            <a-input v-model:value="formData.customer_address" placeholder="请选择客户后自动填写" />
          </div>
        </div>
      </div>

      <!-- 出库单内容表 -->
      <div class="table-container">
        <a-table
          :columns="itemColumns"
          :data-source="formData.delivery_items"
          :pagination="false"
          bordered
          size="small"
          row-key="no"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'no'">
              {{ index + 1 }}
            </template>

            <template v-else-if="column.key === 'product_code'">
              <a-select
                v-model:value="record.product_code"
                placeholder="请选择产品"
                :loading="loading.products"
                show-search
                :filter-option="false"
                @search="(value: string) => handleProductSearch(value)"
                @change="(value: string) => handleProductChange(value, index)"
                style="width: 100%"
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
                placeholder="产品名称"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'specification'">
              <a-input
                v-model:value="record.specification"
                placeholder="规格描述"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'unit'">
              <a-input v-model:value="record.unit" placeholder="单位" style="width: 100%" />
            </template>
            <template v-else-if="column.key === 'stock'">
              <span :style="{ color: (record.stock || 0) <= 0 ? '#ff4d4f' : '#52c41a' }">
                {{ Math.floor(record.stock || 0) }}
              </span>
            </template>
            <template v-else-if="column.key === 'max_quantity'">
              <span :style="{ color: record.max_quantity <= 0 ? '#ff4d4f' : '#52c41a' }">
                {{ record.max_quantity || 0 }}
              </span>
            </template>
            <template v-else-if="column.key === 'quantity'">
              <a-input-number
                v-model:value="record.quantity"
                :min="1"
                :max="record.max_quantity || undefined"
                :precision="0"
                :class="{ 'quantity-exceeded': record.stock !== undefined && record.quantity > record.stock }"
                :style="{ width: '100%', borderColor: record.stock !== undefined && record.quantity > record.stock ? '#ff4d4f' : undefined }"
                @change="() => calculateTotal()"
              />
            </template>
            <template v-else-if="column.key === 'tax_included_price'">
              <a-input-number
                v-model:value="record.tax_included_price"
                :min="0"
                :precision="2"
                style="width: 100%"
                @change="() => calculateTotal()"
              />
            </template>
            <template v-else-if="column.key === 'tax_rate'">
              <a-input-number
                v-model:value="record.tax_rate"
                :min="0"
                :max="100"
                :precision="0"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'amount'">
              {{ (record.quantity * (record.tax_included_price || 0)).toFixed(2) }}
            </template>
            <template v-else-if="column.key === 'remarks'">
              <a-input v-model:value="record.remarks" placeholder="备注" style="width: 100%" />
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" size="small" danger @click="removeItem(index)"> 删除 </a-button>
            </template>
          </template>

          <template #footer>
            <div class="table-footer">
              <div class="add-row">
                <a-button type="dashed" size="small" @click="addItem">
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

      <!-- 出库单底部 -->
      <div class="delivery-order-footer">
        <div class="footer-row">
          <div class="footer-item">
            <label class="footer-label">总计：</label>
            <a-input-number
              v-model:value="formData.total_amount"
              :min="0"
              :precision="2"
              style="width: 200px"
              :readonly="true"
            />
          </div>
          <div class="footer-item">
            <label class="footer-label">币种：</label>
            <a-select v-model:value="formData.currency" style="width: 150px">
              <a-select-option value="CNY">人民币</a-select-option>
              <a-select-option value="USD">美元</a-select-option>
              <a-select-option value="EUR">欧元</a-select-option>
            </a-select>
          </div>
        </div>

        <div class="footer-row">
          <div class="footer-item">
            <label class="footer-label">出库时间：</label>
            <a-date-picker
              v-model:value="formData.delivery_time"
              show-time
              format="YYYY-MM-DD HH:mm"
              style="width: 100%"
            />
          </div>
          <div class="footer-item">
            <label class="footer-label">送货日期：</label>
            <a-date-picker
              v-model:value="formData.delivery_date"
              format="YYYY-MM-DD"
              style="width: 100%"
            />
          </div>
        </div>
        <div class="footer-row">
          <div class="footer-item">
            <label class="footer-label"><span class="required">*</span>录入日期：</label>
            <a-date-picker
              v-model:value="formData.entry_date"
              format="YYYY-MM-DD"
              style="width: 100%"
            />
          </div>
                    <div class="footer-item">
          </div>
        </div>

        <div class="footer-row">
          <div class="footer-item full-width">
            <label class="footer-label">出库费用登记：</label>
            <div class="expenses-container">
              <div class="expense-item">
                <label class="expense-label">快递费：</label>
                <a-input-number
                  v-model:value="formData.expenses.expressDeliveryFee"
                  :min="0"
                  :precision="2"
                  style="width: 120px"
                  placeholder="0.00"
                />
              </div>
              <div class="expense-item">
                <label class="expense-label">运杂费：</label>
                <a-input-number
                  v-model:value="formData.expenses.transportationFee"
                  :min="0"
                  :precision="2"
                  style="width: 120px"
                  placeholder="0.00"
                />
              </div>
              <div class="expense-item">
                <label class="expense-label">报关费：</label>
                <a-input-number
                  v-model:value="formData.expenses.customsFee"
                  :min="0"
                  :precision="2"
                  style="width: 120px"
                  placeholder="0.00"
                />
              </div>
              <div class="expense-item">
                <label class="expense-label">其他：</label>
                <a-input-number
                  v-model:value="formData.expenses.otherFee"
                  :min="0"
                  :precision="2"
                  style="width: 120px"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="footer-row">
          <div class="footer-item full-width">
            <label class="footer-label">备注：</label>
            <a-textarea v-model:value="formData.remarks" :rows="3" placeholder="请输入备注信息" />
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="form-footer">
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button v-if="!isEdit" @click="handleSaveDraft">暂存</a-button>
          <a-button type="primary" @click="handlePrint">打印</a-button>
          <a-button type="primary" @click="handleSaveAndPrint">保存并打印</a-button>
          <a-button type="primary" @click="handleSave" :loading="saving">保存</a-button>
        </a-space>
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
import { deliveryOrdersApi } from '@/api/deliveryOrders'
import type { CreateDeliveryOrderRequest, DeliveryItem, DeliveryExpenses } from '@/types'
import { productsApi } from '@/api/products'
import { customersApi } from '@/api/customers'
import type { ProductOption, CustomerOption } from '@/types/index'
import { useUserStore } from '@/stores/user'
import { saveDraft, loadDraft, clearDraft, hasDraft, formatDraftTime } from '@/utils/draft'
import { Modal } from 'ant-design-vue'

dayjs.locale('zh-cn')

const userStore = useUserStore()
const currentUser = computed(() => userStore.user)

const props = defineProps<{
  open: boolean
  isEdit: boolean
  deliveryOrderData?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
  (e: 'print', data: any): void
}>()

const orderNumber = ref('')
const saving = ref(false)
const loading = reactive({
  salesOrders: false,
  products: false,
  customers: false,
})

const salesOrderOptions = ref<any[]>([])
const productOptions = ref<ProductOption[]>([])
const customerOptions = ref<CustomerOption[]>([])

const defaultExpenses: DeliveryExpenses = {
  expressDeliveryFee: 0,
  transportationFee: 0,
  customsFee: 0,
  otherFee: 0,
}

const formData = reactive({
  sales_order_number: '',
  delivery_items: [] as DeliveryItem[],
  delivery_time: '' as string | any,
  delivery_date: '' as string | any,
  entry_date: '' as string | any,
  customer_name: '',
  customer_address: '',
  total_amount: 0,
  currency: 'CNY',
  delivery_person: '',
  contact_phone: '',
  remarks: '',
  expenses: { ...defaultExpenses } as DeliveryExpenses,
})

const itemColumns = [
  { title: '序号', key: 'no', width: '5%', align: 'center' },
  { title: '产品代码', key: 'product_code', width: '9%' },
  { title: '产品名称', key: 'product_name', width: '11%' },
  { title: '规格描述', key: 'specification', width: '9%' },
  { title: '单位', key: 'unit', width: '5%' },
  { title: '库存数', key: 'stock', width: '7%', align: 'right' },
  { title: '未出库数', key: 'max_quantity', width: '7%', align: 'right' },
  { title: '出库数', key: 'quantity', width: '7%', align: 'right' },
  { title: '含税单价', key: 'tax_included_price', width: '8%', align: 'right' },
  { title: '税率(%)', key: 'tax_rate', width: '7%', align: 'right' },
  { title: '合计金额', key: 'amount', width: '8%', align: 'right' },
  { title: '备注', key: 'remarks', width: '9%' },
  { title: '操作', key: 'actions', width: '5%', fixed: 'right' },
]

// 获取新的出库单编号
const getNewOrderNumber = async () => {
  try {
    const response = await deliveryOrdersApi.getNewOrderNumber()
    orderNumber.value = response.order_number || ''
  } catch (error) {
    message.error('获取出库单编号失败')
  }
}

// 获取可出库的销售订单
const getSalesOrdersForDelivery = async () => {
  loading.salesOrders = true
  try {
    const response = await deliveryOrdersApi.getUndeliveredSalesOrders()
    salesOrderOptions.value = response.data || []
  } catch (error) {
    message.error('获取销售订单列表失败')
  }
  loading.salesOrders = false
}

// 搜索销售订单
const handleSalesOrderSearch = async (value: string) => {
  if (!value) {
    getSalesOrdersForDelivery()
    return
  }
  loading.salesOrders = true
  try {
    const response = await deliveryOrdersApi.getUndeliveredSalesOrders()
    salesOrderOptions.value = response.data.filter((o: any) =>
      (o.contract_number || o.order_number).toLowerCase().includes(value.toLowerCase())
    )
  } catch (error) {
    message.error('获取销售订单列表失败')
  }
  loading.salesOrders = false
}

// 选择销售订单
const handleSalesOrderChange = async (value: string) => {
  const order = salesOrderOptions.value.find((o: any) => o.contract_number === value)
  if (order) {
    try {
      const items = JSON.parse(order.sales_items || '[]')
      // 过滤掉已全部出库的商品，计算剩余可出库数量
      formData.delivery_items = items
        .map((item: any, index: number) => {
          const outboundQty = item.outbound_quantity || 0
          const remainingQty = (item.quantity || 0) - outboundQty
          // 从产品列表中获取库存数
          const product = productOptions.value.find(p => p.product_code === item.product_code)
          const stock = product ? Math.floor(product.stock || 0) : 0
          return {
            no: index + 1,
            product_code: item.product_code || '',
            product_name: item.product_name || '',
            specification: item.description || item.specification || '',
            unit: item.unit || '',
            quantity: remainingQty > 0 ? remainingQty : 0,
            max_quantity: remainingQty > 0 ? remainingQty : 0,
            stock: stock,
            tax_included_price: item.tax_included_price || 0,
            tax_rate: item.tax_rate || 0,
            amount: (remainingQty > 0 ? remainingQty : 0) * (item.tax_included_price || 0),
            remarks: item.remarks || '',
          }
        })
        .filter((item: any) => item.max_quantity > 0) // 过滤掉已全部出库的商品
      formData.customer_name = order.customer_name || ''
      formData.total_amount = order.total_amount || 0
      formData.currency = order.currency || 'CNY'

      // 根据客户名称查找客户地址
      const customer = customerOptions.value.find(c => c.customer_name === order.customer_name)
      if (customer) {
        try {
          const response = await customersApi.getById(customer.customer_id)
          const fullCustomer = response.data || response
          formData.customer_address = fullCustomer.receiver_address || ''
        } catch {
          formData.customer_address = ''
        }
      } else {
        formData.customer_address = ''
      }

      calculateTotal()
    } catch (error) {
      console.error('Parse sales items error:', error)
    }
  }
}

// 搜索产品
const handleProductSearch = async (value: string) => {
  if (!value) {
    const response = await productsApi.getAllList()
    productOptions.value = (response.data || []).map((p: any) => ({
      product_id: p.product_id || p.id,
      product_name: p.product_name || p.name,
      product_code: p.product_code || p.code,
      model: p.model,
      description: p.description,
      unit: p.unit,
      stock: p.stock,
    }))
    return
  }
  loading.products = true
  try {
    const response = await productsApi.search(value, value)
    const products = (response as any).data || response || []
    productOptions.value = products.map((p: any) => ({
      product_id: p.product_id || p.id,
      product_name: p.product_name || p.name,
      product_code: p.product_code || p.code,
      model: p.model,
      description: p.description,
      unit: p.unit,
      stock: p.stock,
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
    formData.delivery_items[index].product_name = product.product_name || ''
    formData.delivery_items[index].specification = product.description || product.model || ''
    formData.delivery_items[index].unit = product.unit || ''
    formData.delivery_items[index].stock = Math.floor(product.stock || 0)
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
    const response: any = await customersApi.getAll({ name: value })
    const customers = response.data?.data || response.data || []
    customerOptions.value = customers.map((c: any) => ({
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
const handleCustomerChange = async (value: string) => {
  const customer = customerOptions.value.find(c => c.customer_name === value)
  if (customer) {
    try {
      const response = await customersApi.getById(customer.customer_id)
      const fullCustomer = response.data || response
      formData.customer_address = fullCustomer.receiver_address || ''
    } catch {
      formData.customer_address = ''
    }
  } else {
    formData.customer_address = ''
  }
}

// 删除行
const removeItem = (index: number) => {
  formData.delivery_items.splice(index, 1)
  calculateTotal()
}

// 新增行
const addItem = () => {
  formData.delivery_items.push({
    no: formData.delivery_items.length + 1,
    product_code: '',
    product_name: '',
    specification: '',
    unit: '',
    quantity: 1,
    max_quantity: 0,
    stock: 0,
    tax_included_price: 0,
    tax_rate: 13,
    amount: 0,
    remarks: '',
  })
}

// 计算总计
const calculateTotal = () => {
  formData.total_amount = formData.delivery_items.reduce(
    (sum, item) => sum + (item.quantity * (item.tax_included_price || 0)),
    0
  )
  // 更新每行的合计金额
  formData.delivery_items.forEach(item => {
    item.amount = item.quantity * (item.tax_included_price || 0)
  })
}

// 提交表单
const handleSave = async () => {
  if (formData.delivery_items.length === 0) {
    message.error('请添加出库商品')
    return
  }

  if (!formData.customer_name) {
    message.error('请输入客户名称')
    return
  }

  if (!formData.entry_date) {
    message.error('请选择录入日期')
    return
  }

  // 前端超量校验：检查出库数量是否超过库存数量
  for (const item of formData.delivery_items) {
    if (item.stock !== undefined && item.quantity > item.stock) {
      message.error(`商品 ${item.product_name} 出库数量(${item.quantity})超过库存数量(${Math.floor(item.stock)})`)
      return
    }
  }

  // 前端超量校验：检查出库数量是否超过剩余可出库量
  if (formData.contract_number) {
    for (const item of formData.delivery_items) {
      if (item.max_quantity && item.quantity > item.max_quantity) {
        message.error(`商品 ${item.product_name} 出库数量(${item.quantity})超过剩余可出库数量(${item.max_quantity})`)
        return
      }
    }
  }

  const formatDate = (date: any, format: string = 'YYYY-MM-DD HH:mm') => {
    if (!date) return undefined
    if (typeof date === 'string') return date
    try {
      return dayjs(date).format(format)
    } catch {
      return undefined
    }
  }

  try {
    saving.value = true

    const submitData: CreateDeliveryOrderRequest = {
      contract_number: formData.contract_number || undefined,
      delivery_items: JSON.stringify(formData.delivery_items),
      delivery_time: formatDate(formData.delivery_time),
      delivery_date: formatDate(formData.delivery_date, 'YYYY-MM-DD'),
      entry_date: formatDate(formData.entry_date, 'YYYY-MM-DD'),
      customer_name: formData.customer_name,
      customer_address: formData.customer_address,
      total_amount: formData.total_amount,
      currency: formData.currency,
      delivery_person: formData.delivery_person,
      contact_phone: formData.contact_phone,
      remarks: formData.remarks,
      expenses: formData.expenses,
    }

    if (props.isEdit && props.deliveryOrderData?.delivery_order_id) {
      await deliveryOrdersApi.update(props.deliveryOrderData.delivery_order_id, submitData)
      message.success('出库单更新成功')
    } else {
      await deliveryOrdersApi.create(submitData)
      message.success('出库单创建成功')
      clearDraft(DRAFT_KEY)
    }

    emit('success')
    emit('update:open', false)
  } catch (error: any) {
    message.error(error?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

// 打印
const handlePrint = () => {
  emit('print', {
    order_number: orderNumber.value,
    contract_number: formData.contract_number,
    delivery_items: formData.delivery_items,
    delivery_time: formData.delivery_time,
    delivery_date: formData.delivery_date,
    customer_name: formData.customer_name,
    customer_address: formData.customer_address,
    total_amount: formData.total_amount,
    currency: formData.currency,
    delivery_person: formData.delivery_person,
    contact_phone: formData.contact_phone,
    remarks: formData.remarks,
  })
}

// 保存并打印
const handleSaveAndPrint = async () => {
  await handleSave()
  handlePrint()
}

// 取消
const handleCancel = () => {
  emit('update:open', false)
}

// 关闭对话框
const handleClose = () => {
  emit('update:open', false)
}

// 重置表单
const resetForm = () => {
  formData.contract_number = ''
  formData.delivery_items = []
  formData.delivery_time = dayjs()
  formData.delivery_date = dayjs()
  formData.entry_date = dayjs()
  formData.customer_name = ''
  formData.customer_address = ''
  formData.total_amount = 0
  formData.currency = 'CNY'
  formData.delivery_person = currentUser.value?.username || ''
  formData.contact_phone = currentUser.value?.phone || ''
  formData.remarks = ''
  formData.expenses = { ...defaultExpenses }
}

// ==================== 暂存功能 ====================
const DRAFT_KEY = 'delivery_order'

const handleSaveDraft = () => {
  const draftData = {
    sales_order_number: formData.contract_number,
    customer_name: formData.customer_name,
    customer_address: formData.customer_address,
    delivery_items: formData.delivery_items,
    total_amount: formData.total_amount,
    currency: formData.currency,
    delivery_time: formData.delivery_time ? (typeof formData.delivery_time === 'string' ? formData.delivery_time : dayjs(formData.delivery_time).format('YYYY-MM-DD HH:mm')) : '',
    delivery_date: formData.delivery_date ? (typeof formData.delivery_date === 'string' ? formData.delivery_date : dayjs(formData.delivery_date).format('YYYY-MM-DD')) : '',
    entry_date: formData.entry_date ? (typeof formData.entry_date === 'string' ? formData.entry_date : dayjs(formData.entry_date).format('YYYY-MM-DD')) : '',
    delivery_person: formData.delivery_person,
    contact_phone: formData.contact_phone,
    remarks: formData.remarks,
    expenses: formData.expenses,
  }
  const summary = formData.customer_name ? `${formData.customer_name} - ${formData.delivery_items.length}个商品` : `${formData.delivery_items.length}个商品`
  saveDraft(DRAFT_KEY, draftData, summary)
  message.success('暂存成功')
}

const restoreDraft = () => {
  const draft = loadDraft(DRAFT_KEY)
  if (!draft) return
  formData.contract_number = draft.data.sales_order_number || ''
  formData.customer_name = draft.data.customer_name || ''
  formData.customer_address = draft.data.customer_address || ''
  formData.delivery_items = draft.data.delivery_items || []
  formData.total_amount = draft.data.total_amount || 0
  formData.currency = draft.data.currency || 'CNY'
  formData.delivery_time = draft.data.delivery_time ? dayjs(draft.data.delivery_time) : dayjs()
  formData.delivery_date = draft.data.delivery_date ? dayjs(draft.data.delivery_date) : dayjs()
  formData.entry_date = draft.data.entry_date ? dayjs(draft.data.entry_date) : dayjs()
  formData.delivery_person = draft.data.delivery_person || currentUser.value?.username || ''
  formData.contact_phone = draft.data.contact_phone || currentUser.value?.phone || ''
  formData.remarks = draft.data.remarks || ''
  formData.expenses = draft.data.expenses || { ...defaultExpenses }
}

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

// 加载基础数据
const loadBasicData = async () => {
  try {
    const [productsResponse, customers] = await Promise.all([
      productsApi.getAllList(),
      customersApi.getAllList(),
    ])
    productOptions.value = (productsResponse.data || []).map((p: any) => ({
      product_id: p.product_id || p.id,
      product_name: p.product_name || p.name,
      product_code: p.product_code || p.code,
      description: p.description,
      unit: p.unit,
      stock: p.stock,
    }))
    customerOptions.value = customers.data || []
  } catch (error) {
    message.error('加载基础数据失败')
  }
}

// 监听显示状态变化
watch(
  () => props.open,
  visible => {
    if (visible) {
      loadBasicData()
      if (!props.isEdit) {
        getNewOrderNumber()
        getSalesOrdersForDelivery()
        resetForm()
        checkDraft()
        if (formData.delivery_items.length === 0) {
          addItem()
        }
      } else if (props.deliveryOrderData) {
        orderNumber.value = props.deliveryOrderData.order_number || ''
        formData.contract_number = props.deliveryOrderData.sales_order_number || ''
        formData.customer_name = props.deliveryOrderData.customer_name || ''
        formData.customer_address = props.deliveryOrderData.customer_address || ''
        formData.total_amount = props.deliveryOrderData.total_amount || 0
        formData.currency = props.deliveryOrderData.currency || 'CNY'
        formData.delivery_person = props.deliveryOrderData.delivery_person || ''
        formData.contact_phone = props.deliveryOrderData.contact_phone || ''
        formData.remarks = props.deliveryOrderData.remarks || ''

        if (props.deliveryOrderData.delivery_time) {
          formData.delivery_time = dayjs(props.deliveryOrderData.delivery_time)
        } else {
          formData.delivery_time = dayjs()
        }

        if (props.deliveryOrderData.delivery_date) {
          formData.delivery_date = dayjs(props.deliveryOrderData.delivery_date)
        } else {
          formData.delivery_date = dayjs()
        }

        if (props.deliveryOrderData.entry_date) {
          formData.entry_date = dayjs(props.deliveryOrderData.entry_date)
        } else {
          formData.entry_date = dayjs()
        }

        try {
          formData.delivery_items = JSON.parse(props.deliveryOrderData.delivery_items || '[]')
          formData.expenses = { ...defaultExpenses }
          if (props.deliveryOrderData.expenses) {
            const savedExpenses = JSON.parse(props.deliveryOrderData.expenses || '{}')
            Object.keys(defaultExpenses).forEach(key => {
              if (savedExpenses[key] !== undefined) {
                ;(formData.expenses as any)[key] = savedExpenses[key]
              }
            })
          }
        } catch {
          formData.delivery_items = []
          formData.expenses = { ...defaultExpenses }
        }

        getSalesOrdersForDelivery()
      }
    }
  }
)
</script>

<style scoped lang="scss">
.delivery-order-form {
  padding: 20px;
}

.delivery-order-header {
  margin-bottom: 20px;

  .form-row {
    display: flex;
    gap: 20px;
    margin-bottom: 16px;

    .form-item {
      flex: 1;
      display: flex;
      align-items: center;

      .form-label {
        white-space: nowrap;
        margin-right: 8px;
        min-width: 100px;
        font-size: 14px;
        font-weight: 500;
      }

      .order-number {
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }
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

  .add-row {
    text-align: right;
    padding-top: 12px;
  }
}

.delivery-order-footer {
  padding: 16px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;

  .footer-row {
    display: flex;
    gap: 20px;
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .footer-item {
      flex: 1;
      display: flex;
      align-items: center;

      &.full-width {
        flex: 1;
      }

      .footer-label {
        white-space: nowrap;
        margin-right: 12px;
        min-width: 80px;
        font-size: 14px;
        font-weight: 500;
      }

      .expenses-container {
        display: flex;
        gap: 20px;
        align-items: center;
        width: 100%;

        .expense-item {
          display: flex;
          align-items: center;

          .expense-label {
            white-space: nowrap;
            margin-right: 8px;
            min-width: 60px;
            font-size: 14px;
          }
        }
      }
    }
  }
}

.form-footer {
  text-align: right;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}

.quantity-exceeded {
  :deep(.ant-input-number-input) {
    color: #ff4d4f !important;
  }
}

.required {
  color: #ff4d4f;
  margin-right: 4px;
}
</style>
