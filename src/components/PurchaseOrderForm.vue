<template>
  <a-modal
    :title="isEdit ? '编辑采购订单' : '新增采购订单'"
    width="85%"
    :visible="visible"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :okText="'保存'"
    :confirmLoading="submitting"
    :footer="null"
  >
    <div v-if="visible" class="purchase-order-form">
      <div class="purchase-order-header">
        <h1 class="company-name">深圳市旭思达光电科技有限公司</h1>
        <h2 class="purchase-order-title">采购订单</h2>
      </div>

      <div class="purchase-order-content">
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">默认单据编号：</label>
            <a-input v-model:value="orderNumber" class="invisible-input" />
          </div>
          <div class="form-item">
            <label class="form-label"><span class="required">*</span>采购合同编号：</label>
            <a-input v-model:value="form.contract_number" class="invisible-input note-input" />
          </div>
          <!-- <div class="form-item">
            <label class="form-label">采购人：</label>
            <a-input v-model:value="form.purchase_person" class="invisible-input note-input" disabled />
          </div> -->
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">供应商名称:</label>
            <a-select
              v-model:value="form.supplier_name"
              placeholder="请选择供应商"
              :loading="loading.suppliers"
              show-search
              :filter-option="false"
              @search="handleSupplierSearch"
              @change="handleSupplierChange"
              class="invisible-select supplier-name-input"
            >
              <a-select-option
                v-for="supplier in supplierOptions"
                :key="supplier.supplier_id"
                :value="supplier.supplier_name"
              >
                {{ supplier.supplier_name }}
              </a-select-option>
            </a-select>
          </div>
          <div class="form-item">
            <label class="form-label"><span class="required">*</span>录入日期：</label>
            <a-date-picker
              v-model:value="form.entry_date"
              style="width: 100%"
              format="YYYY-MM-DD"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">关联销售订单：</label>
            <a-select
              v-model:value="form.related_sales_order_id"
              placeholder="请选择关联销售订单"
              :loading="loading.salesOrders"
              show-search
              :filter-option="filterSalesOrderOption"
              allow-clear
              class="invisible-select supplier-name-input"
              @change="handleSalesOrderChange"
            >
              <a-select-option
                v-for="order in salesOrderOptions"
                :key="order.sales_order_id"
                :value="order.sales_order_id"
              >
                {{ order.contract_number || order.order_number }}
              </a-select-option>
            </a-select>
          </div>
          <div class="form-item"></div>
        </div>

        <div class="table-container">
          <a-table
            :columns="itemColumns"
            :data-source="form.purchase_items"
            :pagination="false"
            bordered
            size="small"
            :scroll="{ x: 2380 }"
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
              <template v-else-if="column.key === 'inbound_quantity'">
                <a-input
                  v-model:value="record.inbound_quantity"
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
                  @change="() => calculateRowTotal(index)"
                />
              </template>

              <template v-else-if="column.key === 'tax_included_price'">
                <a-input-number
                  v-model:value="record.tax_included_price"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  @change="() => calculateRowTotal(index)"
                  class="invisible-input"
                />
              </template>
              <template v-else-if="column.key === 'tax_excluded_price'">
                <a-input
                  :value="record.tax_excluded_price?.toFixed(2)"
                  disabled
                  style="width: 100%"
                  class="invisible-input"
                />
              </template>

              <template v-else-if="column.key === 'tax_included_amount'">
                <a-input
                  :value="record.tax_included_amount?.toFixed(2)"
                  disabled
                  style="width: 100%"
                  class="invisible-input"
                />
              </template>
              <template v-else-if="column.key === 'tax_excluded_amount'">
                <a-input
                  :value="record.tax_excluded_amount?.toFixed(2)"
                  disabled
                  style="width: 100%"
                  class="invisible-input"
                />
              </template>
              <template v-else-if="column.key === 'tax_amount'">
                <a-input
                  :value="record.tax_amount?.toFixed(2)"
                  disabled
                  style="width: 100%"
                  class="invisible-input"
                />
              </template>

              <template v-else-if="column.key === 'status'">
                <a-tag :color="getStatusColor(record.status)">
                  {{ getStatusText(record.status) }}
                </a-tag>
              </template>

              <!-- <template v-else-if="column.key === 'status'">
                <a-select
                  v-model:value="record.status"
                  style="width: 150%"
                  class="invisible-select"
                >
                  <a-select-option :value="1">未入库</a-select-option>
                  <a-select-option :value="2">已全部入库</a-select-option>
                  <a-select-option :value="3">已部分入库</a-select-option>
                  <a-select-option :value="4" >退货</a-select-option>
                </a-select>
              </template> -->

              <template v-else-if="column.key === 'delivery_date'">
                <a-date-picker
                  v-model:value="record.delivery_date"
                  style="width: 100%"
                  format="YYYY-MM-DD"
                  :bordered="false"
                  size="small"
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
                  placeholder="请选择"
                  style="width: 100%"
                  class="invisible-select"
                >
                  <a-select-option value="是">是</a-select-option>
                  <a-select-option value="否">否</a-select-option>
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

              <template v-else-if="column.key === 'total_price'">
                <a-input
                  :value="record.total_price?.toFixed(2)"
                  disabled
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
                  <a-input
                    :value="totalAmount.toFixed(2)"
                    disabled
                    style="width: 150px"
                    class="invisible-input"
                  />
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

        <div class="purchase-order-note">
          <div class="note-row">
            <label class="note-label">币种：</label>
            <a-select v-model:value="form.currency" style="width: 100%">
              <a-select-option value="CNY">人民币</a-select-option>
              <a-select-option value="USD">美元</a-select-option>
              <a-select-option value="EUR">欧元</a-select-option>
            </a-select>
          </div>
          <!-- <div class="note-row">
            <label class="note-label">汇率：</label>
            <a-input-number
              v-model:value="form.exchange_rate"
              :min="0"
              :precision="4"
              style="width: 100%"
              class="invisible-input"
            />
          </div> -->

          <!-- 采购费用登记 -->
          <div class="expenses-section" style="grid-column: span 2">
            <div class="expenses-label">采购费用登记</div>
            <div class="expenses-row">
              <div class="expense-item">
                <label>运输费</label>
                <a-input-number
                  v-model:value="form.expenses.transportationFee"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  class="expense-input"
                />
              </div>
              <div class="expense-item">
                <label>增值税</label>
                <a-input-number
                  v-model:value="form.expenses.valueAddedTax"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  class="expense-input"
                />
              </div>
              <div class="expense-item">
                <label>手续费</label>
                <a-input-number
                  v-model:value="form.expenses.handlingFee"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  class="expense-input"
                />
              </div>
              <div class="expense-item">
                <label>运营费</label>
                <a-input-number
                  v-model:value="form.expenses.operatingExpenses"
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

        <div class="form-footer">
          <a-space>
            <a-button @click="handleCancel">取消</a-button>
            <a-button v-if="!isEdit" @click="handleSaveDraft">暂存</a-button>
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
import { purchaseOrdersApi } from '@/api/purchaseOrders'
import { salesOrdersApi } from '@/api/salesOrders'
import { suppliersApi } from '@/api/suppliers'
import { productsApi } from '@/api/products'
import { businessCategoriesApi } from '@/api/businessCategories'
import { useUserStore } from '@/stores/user'
import { saveDraft, loadDraft, clearDraft, hasDraft, formatDraftTime } from '@/utils/draft'
import { Modal } from 'ant-design-vue'
import type {
  CreatePurchaseOrderRequest,
  PurchaseItem,
  SupplierOption,
  ProductOption,
  BusinessCategoryOption,
  SalesOrder,
} from '@/types'

const userStore = useUserStore()

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  purchaseOrderData?: any
}>()

dayjs.locale('zh-cn')

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const orderNumber = ref('')
const submitting = ref(false)
const loading = reactive({
  suppliers: false,
  products: false,
  businessCategories: false,
  salesOrders: false,
})

const supplierOptions = ref<SupplierOption[]>([])
const productOptions = ref<ProductOption[]>([])
const businessCategoryOptions = ref<BusinessCategoryOption[]>([])
const salesOrderOptions = ref<SalesOrder[]>([])

const form = reactive<
  CreatePurchaseOrderRequest & { purchase_items: PurchaseItem[]; expenses: any }
>({
  contract_number: '',
  supplier_name: '',
  supplier_code: '',
  purchase_items: [],
  currency: 'CNY',
  exchange_rate: 1.0,
  entry_date: dayjs(),
  remarks: '',
  purchase_person: '',
  related_sales_order_id: undefined,
  expenses: {
    transportationFee: 0,
    valueAddedTax: 0,
    handlingFee: 0,
    operatingExpenses: 0,
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
  // { title: '入库数', key: 'inbound_quantity', width: 80 },
  { title: '税率（%）', key: 'tax_rate', width: 90 },
  { title: '含税单价', key: 'tax_included_price', width: 100, align: 'right' as const },
  { title: '未税单价', key: 'tax_excluded_price', width: 100, align: 'right' as const },
  { title: '含税金额', key: 'tax_included_amount', width: 110, align: 'right' as const },
  { title: '未税金额', key: 'tax_excluded_amount', width: 110, align: 'right' as const },
  { title: '税额', key: 'tax_amount', width: 100, align: 'right' as const },
  { title: '状态', key: 'status', width: 100 },
  { title: '发货日期', key: 'delivery_date', width: 120 },
  { title: '开票日期', key: 'invoice_date', width: 130 },
  { title: '发票号', key: 'invoice_number', width: 120 },
  { title: '是否到票', key: 'invoice_received', width: 90 },
  { title: '结算日期', key: 'settlement_date', width: 130 },
  { title: '结算金额', key: 'settlement_amount', width: 100, align: 'right' as const },
  { title: '未结算金额', key: 'unsettled_amount', width: 100, align: 'right' as const },
  { title: '结算状态', key: 'settlement_status', width: 100 },
  { title: '备注', key: 'remarks', width: 150 },
  { title: '总价', key: 'total_price', width: 110, align: 'right' as const },
  { title: '操作', key: 'actions', width: 70, fixed: 'right' as const },
]

const totalAmount = computed(() => {
  return form.purchase_items.reduce((sum, item) => sum + (item.total_price || 0), 0)
})

const getNewOrderNumber = async () => {
  try {
    const { order_number } = await purchaseOrdersApi.getNewOrderNumber()
    orderNumber.value = order_number
  } catch (error) {
    message.error('获取采购订单编号失败')
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
      supplier_code: s.supplier_code || s.code,
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

const filterSalesOrderOption = (input: string, option: any) => {
  const order = salesOrderOptions.value.find(o => o.sales_order_id === option.value)
  if (!order) return false
  const searchText = (order.contract_number || order.order_number || '').toLowerCase()
  return searchText.includes(input.toLowerCase())
}

const loadSalesOrders = async () => {
  try {
    loading.salesOrders = true
    const res = await salesOrdersApi.getAll({ pageSize: 1000 })
    salesOrderOptions.value = res.data?.data || res.data || []
  } catch (error) {
    console.error('加载销售订单列表失败', error)
  } finally {
    loading.salesOrders = false
  }
}

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

const handleProductChange = (value: string, index: number) => {
  const product = productOptions.value.find(p => p.product_code === value)

  if (product) {
    form.purchase_items[index].product_name = product.product_name || ''
    form.purchase_items[index].model = product.model || ''
    form.purchase_items[index].description = product.description || ''
    form.purchase_items[index].unit = product.unit || ''
  }
}

const handleSalesOrderChange = (value: string | undefined) => {
  if (!value) {
    // 清除关联时不做操作，保留当前商品行
    return
  }

  const salesOrder = salesOrderOptions.value.find(o => o.sales_order_id === value)
  if (!salesOrder) return

  try {
    const salesItems = JSON.parse(salesOrder.sales_items || '[]')
    if (salesItems.length === 0) {
      message.warning('该销售订单没有商品')
      return
    }

    // 用销售订单的商品行填充采购商品行
    form.purchase_items = salesItems.map((item: any, index: number) => ({
      no: index + 1,
      business_category: '',
      product_name: item.product_name || '',
      product_code: item.product_code || '',
      model: item.model || '',
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity || 1,
      inbound_quantity: 0,
      tax_rate: 13,
      tax_included_price: 0,
      tax_excluded_price: 0,
      tax_included_amount: 0,
      tax_excluded_amount: 0,
      tax_amount: 0,
      status: 1,
      delivery_date: undefined,
      invoice_date: undefined,
      invoice_number: '',
      invoice_received: '否',
      settlement_date: undefined,
      settlement_amount: 0,
      unsettled_amount: 0,
      settlement_status: '未结算',
      remarks: '',
      total_price: 0,
    }))

    // 重新计算每行金额
    form.purchase_items.forEach((_, index) => calculateRowTotal(index))

    message.success(`已加载销售订单 ${salesOrder.contract_number || salesOrder.order_number} 的 ${salesItems.length} 个商品`)
  } catch (error) {
    console.error('解析销售订单商品失败', error)
    message.error('解析销售订单商品失败')
  }
}

const calculateRowTotal = (index: number) => {
  const item = form.purchase_items[index]
  const taxRateDecimal = item.tax_rate / 100

  item.tax_excluded_price = parseFloat((item.tax_included_price / (1 + taxRateDecimal)).toFixed(2))

  item.tax_included_amount = parseFloat((item.quantity * item.tax_included_price).toFixed(2))

  item.tax_excluded_amount = parseFloat((item.quantity * item.tax_excluded_price).toFixed(2))

  item.tax_amount = parseFloat(((item.tax_included_amount / (1 + taxRateDecimal)) * taxRateDecimal).toFixed(2))

  item.total_price = item.tax_included_amount
}

const deleteItem = (index: number) => {
  form.purchase_items.splice(index, 1)
}

const addNewItem = () => {
  form.purchase_items.push({
    no: form.purchase_items.length + 1,
    business_category: '',
    product_name: '',
    product_code: '',
    model: '',
    description: '',
    unit: '',
    quantity: 1,
    inbound_quantity: 0,
    tax_rate: 13,
    tax_included_price: 0,
    tax_excluded_price: 0,
    tax_included_amount: 0,
    tax_excluded_amount: 0,
    tax_amount: 0,
    status: 1,
    delivery_date: undefined,
    invoice_date: undefined,
    invoice_number: '',
    invoice_received: '否',
    settlement_date: undefined,
    settlement_amount: 0,
    unsettled_amount: 0,
    settlement_status: '未结算',
    remarks: '',
    total_price: 0,
  })
}

const handleSubmit = async () => {
  if (!form.contract_number) {
    message.error('请输入采购合同编号')
    return
  }
  if (!form.supplier_name) {
    message.error('请选择供应商')
    return
  }
  if (!form.entry_date) {
    message.error('请选择录入日期')
    return
  }
  if (form.purchase_items.length === 0) {
    message.error('请添加采购商品')
    return
  }
  const hasMissingCategory = form.purchase_items.some((item: any) => !item.business_category)
  if (hasMissingCategory) {
    message.error('请填写所有商品的业务分类')
    return
  }

  const formatDate = (date: any) => {
    if (!date) return undefined
    if (typeof date === 'string') return date
    try {
      // 如果是 dayjs 对象，直接调用 format 方法
      if (date && typeof date.format === 'function') {
        return date.format('YYYY-MM-DD')
      }
      return dayjs(date).format('YYYY-MM-DD')
    } catch {
      return undefined
    }
  }

  try {
    submitting.value = true

    // 格式化 purchase_items 中的日期字段
    const formattedItems = form.purchase_items.map((item: any) => ({
      ...item,
      delivery_date: formatDate(item.delivery_date),
      invoice_date: formatDate(item.invoice_date),
      settlement_date: formatDate(item.settlement_date),
    }))

    const submitData: CreatePurchaseOrderRequest = {
      order_number: orderNumber.value,
      contract_number: form.contract_number,
      supplier_name: form.supplier_name,
      supplier_code: form.supplier_code,
      purchase_items: formattedItems,
      currency: form.currency,
      exchange_rate: form.exchange_rate,
      entry_date: formatDate(form.entry_date),
      remarks: form.remarks,
      expenses: form.expenses,
      purchase_person: userStore.user?.username || '',
      related_sales_order_id: form.related_sales_order_id,
    }

    if (props.isEdit && props.purchaseOrderData?.purchase_order_id) {
      await purchaseOrdersApi.update(props.purchaseOrderData.purchase_order_id, submitData)
      message.success('采购订单更新成功')
    } else {
      await purchaseOrdersApi.create(submitData)
      message.success('采购订单创建成功')
      clearDraft(DRAFT_KEY)
    }

    emit('success')
    emit('update:visible', false)
  } catch (error: any) {
    message.error(error?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      loadBasicData()
      if (!props.isEdit) {
        getNewOrderNumber()
        resetForm()
        form.purchase_person = userStore.user?.username || ''
        checkDraft()
      } else if (props.purchaseOrderData) {
        form.contract_number = props.purchaseOrderData.contract_number || ''
        form.supplier_name = props.purchaseOrderData.supplier_name
        form.supplier_code = props.purchaseOrderData.supplier_code
        form.currency = props.purchaseOrderData.currency || 'CNY'
        form.purchase_person = props.purchaseOrderData.purchase_person || ''
        form.related_sales_order_id = props.purchaseOrderData.related_sales_order_id || undefined
        form.exchange_rate = props.purchaseOrderData.exchange_rate || 1.0
        if (props.purchaseOrderData.entry_date) {
          form.entry_date = dayjs(props.purchaseOrderData.entry_date)
        } else {
          form.entry_date = dayjs()
        }
        form.remarks = props.purchaseOrderData.remarks || ''
        orderNumber.value = props.purchaseOrderData.order_number || ''
        try {
          const items = JSON.parse(props.purchaseOrderData.purchase_items || '[]')
          // 将 purchase_items 中的日期字符串转换为 dayjs 对象
          form.purchase_items = items.map((item: any) => ({
            ...item,
            delivery_date: item.delivery_date ? dayjs(item.delivery_date) : undefined,
            invoice_date: item.invoice_date ? dayjs(item.invoice_date) : undefined,
            settlement_date: item.settlement_date ? dayjs(item.settlement_date) : undefined,
          }))
        } catch {
          form.purchase_items = []
        }
        try {
          form.expenses = props.purchaseOrderData.expenses
            ? JSON.parse(props.purchaseOrderData.expenses)
            : { transportationFee: 0, valueAddedTax: 0, handlingFee: 0, operatingExpenses: 0, otherFee: 0 }
        } catch {
          form.expenses = {
            transportationFee: 0,
            valueAddedTax: 0,
            handlingFee: 0,
            operatingExpenses: 0,
            otherFee: 0,
          }
        }
      }
    }
  }
)

watch(
  () => props.visible,
  visible => {
    if (visible && !props.isEdit) {
      if (form.purchase_items.length === 0) {
        addNewItem()
      }
    }
  }
)

const loadBasicData = async () => {
  try {
    const [suppliers, products, businessCategories] = await Promise.all([
      suppliersApi.getAllList(),
      productsApi.getAllList(),
      businessCategoriesApi.getAllList(),
    ])
    supplierOptions.value = suppliers.data || []
    productOptions.value = products.data || []
    businessCategoryOptions.value = businessCategories.data || []
  } catch (error) {
    message.error('加载基础数据失败')
  }
  await loadSalesOrders()
}

const resetForm = () => {
  form.contract_number = ''
  form.supplier_name = ''
  form.supplier_code = ''
  form.purchase_items = []
  form.currency = 'CNY'
  form.exchange_rate = 1.0
  form.entry_date = dayjs()
  form.remarks = ''
  form.purchase_person = ''
  form.related_sales_order_id = undefined
  form.expenses = { transportationFee: 0, valueAddedTax: 0, handlingFee: 0, operatingExpenses: 0, otherFee: 0 }
  orderNumber.value = ''
}

// ==================== 暂存功能 ====================
const DRAFT_KEY = 'purchase_order'

const handleSaveDraft = () => {
  const draftData = {
    contract_number: form.contract_number,
    supplier_name: form.supplier_name,
    supplier_code: form.supplier_code,
    purchase_items: form.purchase_items,
    currency: form.currency,
    exchange_rate: form.exchange_rate,
    entry_date: form.entry_date
      ? typeof form.entry_date === 'string'
        ? form.entry_date
        : dayjs(form.entry_date).format('YYYY-MM-DD')
      : '',
    remarks: form.remarks,
    expenses: form.expenses,
    related_sales_order_id: form.related_sales_order_id,
  }
  const summary = form.supplier_name
    ? `${form.supplier_name} - ${form.purchase_items.length}个商品`
    : `${form.purchase_items.length}个商品`
  saveDraft(DRAFT_KEY, draftData, summary)
  message.success('暂存成功')
}

const restoreDraft = () => {
  const draft = loadDraft(DRAFT_KEY)
  if (!draft) return
  form.contract_number = draft.data.contract_number || ''
  form.supplier_name = draft.data.supplier_name || ''
  form.supplier_code = draft.data.supplier_code || ''
  // 将 purchase_items 中的 delivery_date 字符串转换为 dayjs 对象
  const items = draft.data.purchase_items || []
  form.purchase_items = items.map((item: any) => ({
    ...item,
    delivery_date: item.delivery_date ? dayjs(item.delivery_date) : undefined,
  }))
  form.currency = draft.data.currency || 'CNY'
  form.exchange_rate = draft.data.exchange_rate || 1.0
  // 将日期字符串转换为 dayjs 对象
  form.entry_date = draft.data.entry_date ? dayjs(draft.data.entry_date) : dayjs()
  form.remarks = draft.data.remarks || ''
  form.related_sales_order_id = draft.data.related_sales_order_id || undefined
  form.expenses = draft.data.expenses || {
    transportationFee: 0,
    valueAddedTax: 0,
    handlingFee: 0,
    operatingExpenses: 0,
    otherFee: 0,
  }
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

const getStatusColor = (status: number) => {
  const colorMap: Record<number, string> = {
    1: 'blue', // 未入库
    2: 'green', // 已全部入库
    3: 'orange', // 已部分入库
    4: 'red', // 退货
  }
  return colorMap[status] || 'default'
}
const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: '未入库',
    2: '已全部入库',
    3: '已部分入库',
    4: '退货',
  }
  return textMap[status] || '未知'
}
</script>

<style scoped lang="scss">
.purchase-order-form {
  padding: 20px;
}

.purchase-order-header {
  text-align: center;
  margin-bottom: 30px;

  .company-name {
    font-size: 22px;
    font-weight: bold;
    margin: 0 0 12px 0;
    color: #000;
  }

  .purchase-order-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
    color: #000;
  }
}

.purchase-order-content {
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

    .supplier-name-input {
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
  }

  .add-row {
    text-align: right;
    padding-top: 12px;
  }
}

.purchase-order-note {
  padding: 16px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  .note-row {
    display: flex;
    align-items: center;

    &:nth-child(n + 3):nth-child(-n + 4) {
      margin-top: 12px;
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
