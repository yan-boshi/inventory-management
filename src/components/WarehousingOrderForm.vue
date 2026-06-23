<template>
  <a-modal
    :title="isEdit ? '编辑入库单' : '新增入库单'"
    width="90%"
    :visible="visible"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :okText="'保存'"
    :confirmLoading="submitting"
    :footer="null"
  >
    <div v-if="visible" class="warehousing-order-form">
      <!-- 入库单头部 -->
      <div class="warehousing-order-header">
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">默认单据编号：</label>
            <span class="invisible-input">{{ orderNumber }}</span>
          </div>
          <div class="form-item">
            <label class="form-label">采购订单编号：</label>
            <a-select
              v-model:value="form.purchase_order_number"
              placeholder="请选择采购订单编号"
              :loading="loading.purchaseOrders"
              show-search
              :filter-option="false"
              @search="handlePurchaseOrderSearch"
              @change="handlePurchaseOrderChange"
              class="invisible-select purchase-order-input"
            >
              <a-select-option
                v-for="order in purchaseOrderOptions"
                :key="order.purchase_order_id"
                :value="order.order_number"
              >
                {{ order.order_number }}
              </a-select-option>
            </a-select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-item">
            <label class="form-label">供应商名称：</label>
            <a-select
              v-model:value="form.customer_name"
              placeholder="请选择供应商"
              :loading="loading.suppliers"
              show-search
              :filter-option="false"
              @search="handleSupplierSearch"
              @change="handleSupplierChange"
              style="width: 100%"
              class="invisible-select supplier-name-input"
            >
              <a-select-option
                v-for="supplier in supplierOptions"
                :key="supplier.supplier_id"
                :value="supplier.supplier_name"
              >
                {{ supplier.supplier_name }} ({{ supplier.supplier_code }})
              </a-select-option>
            </a-select>
          </div>
          <!-- <div class="form-item">
            <label class="form-label">客户地址：</label>
            <span class="invisible-input">{{ form.customer_address || '-' }}</span>
          </div> -->
        </div>
      </div>

      <!-- 入库单内容表 -->
      <div class="table-container">
        <a-table
          :columns="itemColumns"
          :data-source="form.warehousing_items"
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
                  {{ product.product_name }}
                </a-select-option>
              </a-select>
            </template>
            <template v-else-if="column.key === 'product_code'">
              <a-input
                v-model:value="record.product_code"
                placeholder="产品代码"
                style="width: 100%"
                class="invisible-input"
                :disabled="!!form.purchase_order_number"
              />
            </template>
            <template v-else-if="column.key === 'description'">
              <a-input
                v-model:value="record.description"
                placeholder="规格描述"
                style="width: 100%"
                class="invisible-input"
              />
            </template>
            <template v-else-if="column.key === 'unit'">
              <a-input
                v-model:value="record.unit"
                placeholder="单位"
                style="width: 100%"
                class="invisible-input"
                :disabled="true"
              />
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
                style="width: 100%"
                @change="() => calculateTotal()"
                class="invisible-input"
                :disabled="!!form.purchase_order_number"
              />
            </template>
            <template v-else-if="column.key === 'tax_included_price'">
              <a-input-number
                v-model:value="record.tax_included_price"
                :min="0"
                :precision="2"
                @change="() => calculateTotal()"
                style="width: 100%"
                class="invisible-input"
              />
            </template>
            <template v-else-if="column.key === 'tax_rate'">
              <a-input-number
                v-model:value="record.tax_rate"
                :min="0"
                :max="100"
                :precision="0"
                style="width: 100%"
                class="invisible-input"
              />
            </template>
            <template v-else-if="column.key === 'remarks'">
              <a-input
                v-model:value="record.remarks"
                placeholder="备注"
                style="width: 100%"
                class="invisible-input"
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" size="small" danger @click="deleteItem(index)"> 删除 </a-button>
            </template>
          </template>

          <template #footer>
            <div class="table-footer">
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

      <!-- 其他内容 -->
      <div class="warehousing-order-note">
        <div class="note-row">
          <label class="note-label">总计：</label>
          <a-input-number
            v-model:value="form.total_amount"
            :min="0"
            :precision="2"
            style="width: 200px"
            class="invisible-input"
          />
        </div>
        <div class="note-row">
          <label class="note-label">币种：</label>
          <a-select v-model:value="form.currency" style="width: 100%">
            <a-select-option value="CNY">人民币</a-select-option>
            <a-select-option value="USD">美元</a-select-option>
            <a-select-option value="EUR">欧元</a-select-option>
          </a-select>
        </div>
        <div class="note-row">
          <label class="note-label">入库时间：</label>
          <a-date-picker
            v-model:value="form.warehousing_time"
            show-time
            format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </div>
        <div class="note-row" style="grid-column: span 2">
          <label class="note-label">入库费用：</label>
          <div class="expenses-container">
            <div class="expense-item">
              <label class="expense-label">快递费：</label>
              <a-input-number
                v-model:value="form.expenses.expressDeliveryFee"
                :min="0"
                :precision="2"
                style="width: 120px"
                placeholder="0.00"
              />
            </div>
            <div class="expense-item">
              <label class="expense-label">运杂费：</label>
              <a-input-number
                v-model:value="form.expenses.transportationFee"
                :min="0"
                :precision="2"
                style="width: 120px"
                placeholder="0.00"
              />
            </div>
            <div class="expense-item">
              <label class="expense-label">报关费：</label>
              <a-input-number
                v-model:value="form.expenses.customsFee"
                :min="0"
                :precision="2"
                style="width: 120px"
                placeholder="0.00"
              />
            </div>
            <div class="expense-item">
              <label class="expense-label">其他：</label>
              <a-input-number
                v-model:value="form.expenses.otherFee"
                :min="0"
                :precision="2"
                style="width: 120px"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        <div class="note-row">
          <label class="note-label">入库人：</label>
          <a-input
            v-model:value="form.warehousing_person"
            placeholder="请输入入库人"
            class="invisible-input"
          />
        </div>
        <div class="note-row">
          <label class="note-label">联系电话：</label>
          <a-input
            v-model:value="form.contact_phone"
            placeholder="请输入联系电话"
            class="invisible-input"
          />
        </div>
        <div class="note-row" style="grid-column: span 2">
          <label class="note-label">备注：</label>
          <a-textarea v-model:value="form.remarks" :rows="3" placeholder="请输入备注信息" />
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="form-footer">
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button v-if="!isEdit" @click="handleSaveDraft">暂存</a-button>
          <a-button type="primary" @click="handlePrint">打印</a-button>
          <a-button type="primary" @click="handleSubmit">保存并打印</a-button>
          <a-button type="primary" @click="handleSubmit">保存</a-button>
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
import { warehousingOrdersApi } from '@/api/warehousingOrders'
import type { CreateWarehousingOrderRequest, WarehousingItem } from '@/types'
import { suppliersApi } from '@/api/suppliers'
import { ProductOption } from '@/types/index'
import { productsApi } from '@/api/products'
import { useUserStore } from '@/stores/user'
import { saveDraft, loadDraft, clearDraft, hasDraft, formatDraftTime } from '@/utils/draft'
import { Modal } from 'ant-design-vue'

const userStore = useUserStore()

const currentUser = computed(() => userStore.user)

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  warehousingOrderData?: any
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
  purchaseOrders: false,
})

const purchaseOrderOptions = ref<any[]>([])

const form = reactive<CreateWarehousingOrderRequest & { warehousing_items: WarehousingItem[] }>({
  purchase_order_number: '',
  warehousing_items: [],
  warehousing_time: dayjs(),
  customer_name: '',
  customer_address: '',
  total_amount: 0,
  currency: 'CNY',
  warehousing_person: '',
  contact_phone: '',
  remarks: '',
  expenses: {
    expressDeliveryFee: 0,
    transportationFee: 0,
    customsFee: 0,
    otherFee: 0,
  },
})

const itemColumns = [
  { title: '序号', key: 'no', width: '5%', align: 'center' },
  { title: '产品代码', key: 'product_code', width: '10%' },
  { title: '产品名称', key: 'product_name', width: '12%' },
  { title: '规格描述', key: 'description', width: '10%' },
  { title: '单位', key: 'unit', width: '5%' },
  { title: '剩余可入库', key: 'max_quantity', width: '7%', align: 'right' },
  { title: '入库数量', key: 'quantity', width: '7%', align: 'right' },
  { title: '含税单价', key: 'tax_included_price', width: '8%', align: 'right' },
  { title: '税率(%)', key: 'tax_rate', width: '7%', align: 'right' },
  { title: '备注', key: 'remarks', width: '10%' },
  { title: '操作', key: 'actions', width: '5%', fixed: 'right' },
]

// 获取新的入库单编号
const getNewOrderNumber = async () => {
  try {
    const response = await warehousingOrdersApi.getNewOrderNumber()
    orderNumber.value = response.data?.order_number || ''
  } catch (error) {
    message.error('获取入库单编号失败')
  }
}

// 获取可入库的采购订单
const getPurchaseOrdersForWarehousing = async () => {
  loading.purchaseOrders = true
  try {
    const response = await warehousingOrdersApi.getPurchaseOrdersForWarehousing()
    purchaseOrderOptions.value = response.data || []
  } catch (error) {
    message.error('获取采购订单列表失败')
  }
  loading.purchaseOrders = false
}

// 搜索采购订单
const handlePurchaseOrderSearch = async (value: string) => {
  if (!value) {
    getPurchaseOrdersForWarehousing()
    return
  }
  loading.purchaseOrders = true
  try {
    const response = await warehousingOrdersApi.getPurchaseOrdersForWarehousing()
    purchaseOrderOptions.value = response.data.filter((o: any) =>
      o.order_number.toLowerCase().includes(value.toLowerCase())
    )
  } catch (error) {
    message.error('获取采购订单列表失败')
  }
  loading.purchaseOrders = false
}

// 选择采购订单
const handlePurchaseOrderChange = async (value: string) => {
  const order = purchaseOrderOptions.value.find((o: any) => o.order_number === value)
  if (order) {
    try {
      const items = JSON.parse(order.purchase_items || '[]')
      // 过滤掉已全部入库的商品，计算剩余可入库数量
      form.warehousing_items = items
        .map((item: any, index: number) => {
          const inboundQty = item.inbound_quantity || 0
          const remainingQty = (item.quantity || 0) - inboundQty
          return {
            no: index + 1,
            product_code: item.product_code || '',
            product_name: item.product_name || '',
            description: item.description || '',
            unit: item.unit || '',
            quantity: remainingQty > 0 ? remainingQty : 0,
            max_quantity: remainingQty > 0 ? remainingQty : 0,
            remarks: item.remarks || '',
            total_price: item.total_price || 0,
            tax_included_price: item.tax_included_price || 0,
            tax_rate: item.tax_rate || 0,
          }
        })
        .filter((item: any) => item.max_quantity > 0) // 过滤掉已全部入库的商品
      form.customer_name = order.supplier_name || ''
      form.customer_address = order.supplier_address || ''
      form.total_amount = order.tax_included_amount || 0
      form.currency = order.currency || 'CNY'
      calculateTotal()
    } catch (error) {
      console.error('Parse purchase items error:', error)
    }
  }
}

// 计算总计
const calculateTotal = () => {
  console.log(form.warehousing_items)
  form.total_amount = form.warehousing_items.reduce((sum, item) => sum + (item.quantity * (item.tax_included_price || 0)), 0)
  console.log(form.total_amount)
}

// 删除行
const deleteItem = (index: number) => {
  form.warehousing_items.splice(index, 1)
  calculateTotal()
}

// 新增行
const addNewItem = () => {
  form.warehousing_items.push({
    no: form.warehousing_items.length + 1,
    product_code: '',
    product_name: '',
    description: '',
    unit: '',
    quantity: 1,
    max_quantity: 0,
    remarks: '',
    tax_included_price: 0,
    tax_rate: 13,
  })
}

// 提交表单
const handleSubmit = async () => {
  if (form.warehousing_items.length === 0) {
    message.error('请添加入库商品')
    return
  }

  // 前端超量校验：检查入库数量是否超过剩余可入库量
  if (form.purchase_order_number) {
    for (const item of form.warehousing_items) {
      if (item.max_quantity && item.quantity > item.max_quantity) {
        message.error(`商品 ${item.product_name} 入库数量(${item.quantity})超过剩余可入库数量(${item.max_quantity})`)
        return
      }
    }
  }

  const formatDate = (date: any) => {
    if (!date) return undefined
    if (typeof date === 'string') return date
    try {
      return dayjs(date).format('YYYY-MM-DD HH:mm')
    } catch {
      return undefined
    }
  }

  try {
    submitting.value = true

    const submitData: CreateWarehousingOrderRequest = {
      purchase_order_number: form.purchase_order_number,
      warehousing_items: JSON.stringify(form.warehousing_items),
      warehousing_time: formatDate(form.warehousing_time),
      customer_name: form.customer_name,
      customer_address: form.customer_address,
      total_amount: form.total_amount,
      currency: form.currency,
      warehousing_person: form.warehousing_person,
      contact_phone: form.contact_phone,
      remarks: form.remarks,
      expenses: form.expenses,
    }

    if (props.isEdit && props.warehousingOrderData?.warehousing_order_id) {
      await warehousingOrdersApi.update(props.warehousingOrderData.warehousing_order_id, submitData)
      message.success('入库单更新成功')
      emit('success')
    } else {
      await warehousingOrdersApi.create(submitData)
      message.success('入库单创建成功')
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
    purchase_order_number: form.purchase_order_number,
    warehousing_items: form.warehousing_items,
    warehousing_time: form.warehousing_time,
    customer_name: form.customer_name,
    customer_address: form.customer_address,
    total_amount: form.total_amount,
    currency: form.currency,
    warehousing_person: form.warehousing_person,
    contact_phone: form.contact_phone,
    remarks: form.remarks,
  })
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
        getNewOrderNumber()
        getPurchaseOrdersForWarehousing()
        resetForm()
        checkDraft()
      } else if (props.warehousingOrderData) {
        orderNumber.value = props.warehousingOrderData.order_number || ''
        form.purchase_order_number = props.warehousingOrderData.purchase_order_number || ''
        form.customer_name = props.warehousingOrderData.customer_name || ''
        form.customer_address = props.warehousingOrderData.customer_address || ''
        form.total_amount = props.warehousingOrderData.total_amount || 0
        form.currency = props.warehousingOrderData.currency || 'CNY'
        form.warehousing_person = props.warehousingOrderData.warehousing_person || ''
        form.contact_phone = props.warehousingOrderData.contact_phone || ''
        form.remarks = props.warehousingOrderData.remarks || ''
        if (props.warehousingOrderData.warehousing_time) {
          form.warehousing_time = dayjs(props.warehousingOrderData.warehousing_time)
        } else {
          form.warehousing_time = dayjs()
        }
        try {
          form.warehousing_items = JSON.parse(props.warehousingOrderData.warehousing_items || '[]')
          // Initialize expenses if not present
          form.expenses = {
            expressDeliveryFee: 0,
            transportationFee: 0,
            customsFee: 0,
            otherFee: 0,
          }
          if (props.warehousingOrderData.expenses) {
            const savedExpenses = JSON.parse(props.warehousingOrderData.expenses || '{}')
            Object.keys(form.expenses).forEach(key => {
              form.expenses[key] = savedExpenses[key] || 0
            })
          }
        } catch {
          form.warehousing_items = []
          form.expenses = {
            expressDeliveryFee: 0,
            transportationFee: 0,
            customsFee: 0,
            otherFee: 0,
          }
        }
        getPurchaseOrdersForWarehousing()
      }
    }
  }
)

// 重置表单
const resetForm = () => {
  form.purchase_order_number = ''
  form.warehousing_items = []
  form.warehousing_time = dayjs()
  form.customer_name = ''
  form.customer_address = ''
  form.total_amount = 0
  form.currency = 'CNY'
  form.warehousing_person = currentUser.value?.username || ''
  form.contact_phone = currentUser.value?.phone || ''
  form.remarks = ''
  form.expenses = {
    expressDeliveryFee: 0,
    transportationFee: 0,
    customsFee: 0,
    otherFee: 0,
  }
}

// ==================== 暂存功能 ====================
const DRAFT_KEY = 'warehousing_order'

const handleSaveDraft = () => {
  const draftData = {
    purchase_order_number: form.purchase_order_number,
    customer_name: form.customer_name,
    customer_address: form.customer_address,
    warehousing_items: form.warehousing_items,
    total_amount: form.total_amount,
    currency: form.currency,
    warehousing_time: form.warehousing_time ? (typeof form.warehousing_time === 'string' ? form.warehousing_time : dayjs(form.warehousing_time).format('YYYY-MM-DD HH:mm')) : '',
    warehousing_person: form.warehousing_person,
    contact_phone: form.contact_phone,
    remarks: form.remarks,
    expenses: form.expenses,
  }
  const summary = form.customer_name ? `${form.customer_name} - ${form.warehousing_items.length}个商品` : `${form.warehousing_items.length}个商品`
  saveDraft(DRAFT_KEY, draftData, summary)
  message.success('暂存成功')
}

const restoreDraft = () => {
  const draft = loadDraft(DRAFT_KEY)
  if (!draft) return
  form.purchase_order_number = draft.data.purchase_order_number || ''
  form.customer_name = draft.data.customer_name || ''
  form.customer_address = draft.data.customer_address || ''
  form.warehousing_items = draft.data.warehousing_items || []
  form.total_amount = draft.data.total_amount || 0
  form.currency = draft.data.currency || 'CNY'
  form.warehousing_time = draft.data.warehousing_time ? dayjs(draft.data.warehousing_time) : dayjs()
  form.warehousing_person = draft.data.warehousing_person || currentUser.value?.username || ''
  form.contact_phone = draft.data.contact_phone || currentUser.value?.phone || ''
  form.remarks = draft.data.remarks || ''
  form.expenses = draft.data.expenses || { expressDeliveryFee: 0, transportationFee: 0, customsFee: 0, otherFee: 0 }
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

const supplierOptions = ref<any[]>([])
const productOptions = ref<ProductOption[]>([])

// 初始化时添加一行
watch(
  () => props.visible,
  visible => {
    if (visible) {
      loadBasicData()
      if (!props.isEdit) {
        if (form.warehousing_items.length === 0) {
          addNewItem()
        }
      }
    }
  }
)

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
    form.warehousing_items[index].model = product.model || ''
    form.warehousing_items[index].product_code = product.product_code || ''
    form.warehousing_items[index].description = product.description || ''
    form.warehousing_items[index].unit = product.unit || ''
  }
}

const loadBasicData = async () => {
  try {
    const [suppliersRes, productsRes] = await Promise.all([
      suppliersApi.getAllList(),
      productsApi.getAllList(),
    ])
    supplierOptions.value = suppliersRes.data || []
    productOptions.value = productsRes.data || []
  } catch (error) {
    message.error('加载基础数据失败')
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
  const supplier = supplierOptions.value.find((s: any) => s.supplier_name === value)
  if (supplier) {
    form.customer_name = supplier.supplier_name
  }
}
</script>

<style scoped lang="scss">
.warehousing-order-form {
  padding: 20px;
}

.warehousing-order-header {
  margin-bottom: 20px;

  .form-row {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;

    .form-item {
      flex: 1;
      display: flex;
      align-items: center;

      .purchase-order-input {
        min-width: 300px !important;
      }

      .form-label {
        white-space: nowrap;
        margin-right: 8px;
        min-width: 100px;
        font-size: 14px;
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

.warehousing-order-note {
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

    &:nth-child(n + 6):nth-child(-n + 7) {
      grid-column: span 2;
    }

    .note-label {
      white-space: nowrap;
      margin-right: 12px;
      min-width: 80px;
      font-size: 14px;
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
</style>
