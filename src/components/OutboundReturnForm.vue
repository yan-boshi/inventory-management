<template>
  <a-modal
    :title="isEdit ? '编辑出库退货单' : '新增出库退货单'"
    width="90%"
    :visible="visible"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :okText="'保存'"
    :confirmLoading="submitting"
    :footer="null"
  >
    <div v-if="visible" class="return-order-form">
      <!-- 退货单头部 -->
      <div class="return-order-header">
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">退货单编号：</label>
            <a-input v-model:value="orderNumber" class="invisible-input" disabled />
          </div>
          <div class="form-item">
            <label class="form-label">原出库单号：</label>
            <a-input v-model:value="form.source_order_number" class="invisible-input" disabled />
          </div>
        </div>
        <div class="form-row">
          <div class="form-item">
            <label class="form-label">销售合同编号：</label>
            <a-input v-model:value="form.contract_number" class="invisible-input" disabled />
          </div>
          <div class="form-item">
            <label class="form-label">客户名称：</label>
            <a-input v-model:value="form.customer_name" class="invisible-input" disabled />
          </div>
        </div>
      </div>

      <!-- 退货商品表 -->
      <div class="table-container">
        <a-table
          :columns="itemColumns"
          :data-source="form.return_items"
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
              {{ record.product_code }}
            </template>
            <template v-else-if="column.key === 'product_name'">
              {{ record.product_name }}
            </template>
            <template v-else-if="column.key === 'specifications'">
              {{ record.specifications }}
            </template>
            <template v-else-if="column.key === 'unit'">
              {{ record.unit }}
            </template>
            <template v-else-if="column.key === 'original_quantity'">
              {{ record.original_quantity }}
            </template>
            <template v-else-if="column.key === 'quantity'">
              <a-input-number
                v-model:value="record.quantity"
                :min="1"
                :max="record.original_quantity"
                :precision="0"
                style="width: 100%"
                @change="() => calculateTotal()"
              />
            </template>
            <template v-else-if="column.key === 'unit_price'">
              {{ record.unit_price }}
            </template>
            <template v-else-if="column.key === 'amount_with_tax'">
              {{ record.amount_with_tax ? record.amount_with_tax.toFixed(2) : '0.00' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" size="small" danger @click="deleteItem(index)"> 删除 </a-button>
            </template>
          </template>
        </a-table>
      </div>

      <!-- 底部信息 -->
      <div class="return-order-note">
        <div class="note-row">
          <label class="note-label">币种：</label>
          <a-select v-model:value="form.currency" style="width: 100%">
            <a-select-option value="CNY">人民币</a-select-option>
            <a-select-option value="USD">美元</a-select-option>
            <a-select-option value="EUR">欧元</a-select-option>
          </a-select>
        </div>
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
          <label class="note-label">退货日期：</label>
          <a-date-picker
            v-model:value="form.return_time"
            format="YYYY-MM-DD"
            style="width: 100%"
          />
        </div>
        <div class="note-row">
          <label class="note-label">录入日期：</label>
          <a-date-picker
            v-model:value="form.entry_date"
            format="YYYY-MM-DD"
            style="width: 100%"
          />
        </div>
        <div class="note-row">
          <label class="note-label">退货人：</label>
          <a-input
            v-model:value="form.return_person"
            placeholder="请输入退货人"
            style="width: 100%"
          />
        </div>
        <div class="note-row">
          <label class="note-label">退货原因：</label>
          <a-input
            v-model:value="form.reason"
            placeholder="请输入退货原因"
            style="width: 100%"
          />
        </div>
        <div class="note-row" style="grid-column: span 2">
          <label class="note-label">备注：</label>
          <a-textarea
            v-model:value="form.remarks"
            :rows="2"
            placeholder="请输入备注"
          />
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="form-footer">
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" :loading="submitting" @click="handleSubmit">保存</a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { createOutboundReturn, updateOutboundReturn, getNewOutboundReturnOrderNumber } from '@/api/outboundReturns'

const props = defineProps<{
  visible: boolean
  editData?: any
  sourceOrder?: any
}>()

const emit = defineEmits(['update:visible', 'success'])

const isEdit = ref(false)
const orderNumber = ref('')
const submitting = ref(false)

const form = reactive({
  source_order_id: '',
  source_order_number: '',
  contract_number: '',
  customer_name: '',
  customer_code: '',
  return_items: [] as any[],
  return_time: dayjs(),
  entry_date: dayjs(),
  currency: 'CNY',
  return_person: '',
  reason: '',
  remarks: ''
})

const itemColumns = [
  { title: '序号', key: 'no', width: '5%', align: 'center' },
  { title: '产品代码', key: 'product_code', width: '10%' },
  { title: '产品名称', key: 'product_name', width: '15%' },
  { title: '规格型号', key: 'specifications', width: '12%' },
  { title: '单位', key: 'unit', width: '6%' },
  { title: '原出库数量', key: 'original_quantity', width: '8%', align: 'right' },
  { title: '退货数量', key: 'quantity', width: '8%', align: 'right' },
  { title: '含税单价', key: 'unit_price', width: '8%', align: 'right' },
  { title: '金额', key: 'amount_with_tax', width: '8%', align: 'right' },
  { title: '操作', key: 'actions', width: '6%', fixed: 'right' }
]

// 获取新单号
const getNewOrderNumber = async () => {
  try {
    const response = await getNewOutboundReturnOrderNumber()
    orderNumber.value = response.data?.order_number || ''
  } catch (error) {
    message.error('获取退货单编号失败')
  }
}

// 获取当前登录用户名
const getCurrentUsername = () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      return user.real_name || user.username || ''
    }
  } catch (e) {}
  return ''
}

// 从源出库单加载商品
const loadSourceOrderItems = () => {
  if (!props.sourceOrder) return

  const sourceOrder = props.sourceOrder
  form.source_order_id = sourceOrder.delivery_order_id || sourceOrder.id || ''
  form.source_order_number = sourceOrder.order_number || ''
  form.contract_number = sourceOrder.contract_number || ''
  form.customer_name = sourceOrder.customer_name || ''
  form.customer_code = sourceOrder.customer_code || ''
  form.currency = sourceOrder.currency || 'CNY'
  form.return_person = getCurrentUsername()

  const sourceItems = JSON.parse(sourceOrder.delivery_items || '[]')
  form.return_items = sourceItems.map((item: any, index: number) => ({
    no: index + 1,
    product_code: item.product_code || '',
    product_name: item.product_name || '',
    specifications: item.specifications || item.model || '',
    unit: item.unit || '',
    quantity: item.quantity || 0,
    original_quantity: item.quantity || 0,
    unit_price: item.tax_included_price || item.unit_price || 0,
    amount_with_tax: (item.quantity || 0) * (item.tax_included_price || item.unit_price || 0)
  }))

  calculateTotal()
}

// 计算总金额
const calculateTotal = () => {
  let total = 0
  form.return_items.forEach(item => {
    item.amount_with_tax = (item.quantity || 0) * (item.unit_price || 0)
    total += item.amount_with_tax
  })
  form.total_amount = total
}

// 删除商品行
const deleteItem = (index: number) => {
  form.return_items.splice(index, 1)
  calculateTotal()
}

// 监听visible和editData变化
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    if (props.editData) {
      // 编辑模式
      isEdit.value = true
      const data = props.editData
      orderNumber.value = data.order_number || ''
      form.source_order_id = data.source_order_id || ''
      form.source_order_number = data.source_order_number || ''
      form.contract_number = data.contract_number || ''
      form.customer_name = data.customer_name || ''
      form.customer_code = data.customer_code || ''
      form.return_time = data.return_time ? dayjs(data.return_time) : dayjs()
      form.entry_date = data.entry_date ? dayjs(data.entry_date) : dayjs()
      form.currency = data.currency || 'CNY'
      form.return_person = data.return_person || ''
      form.reason = data.reason || ''
      form.remarks = data.remarks || ''
      form.return_items = JSON.parse(data.return_items || '[]')
      calculateTotal()
    } else if (props.sourceOrder) {
      // 新增模式 - 从源出库单加载
      isEdit.value = false
      await getNewOrderNumber()
      loadSourceOrderItems()
    }
  }
})

const handleSubmit = async () => {
  if (form.return_items.length === 0) {
    message.error('退货商品不能为空')
    return
  }

  // 校验退货数量
  for (const item of form.return_items) {
    if (!item.quantity || item.quantity <= 0) {
      message.error(`商品 ${item.product_name} 的退货数量必须大于0`)
      return
    }
    if (item.quantity > item.original_quantity) {
      message.error(`商品 ${item.product_name} 的退货数量不能超过原出库数量`)
      return
    }
  }

  submitting.value = true
  try {
    const submitData = {
      ...form,
      return_items: JSON.stringify(form.return_items),
      return_time: form.return_time ? dayjs(form.return_time).format('YYYY-MM-DD') : null,
      entry_date: form.entry_date ? dayjs(form.entry_date).format('YYYY-MM-DD') : null,
      total_amount: form.total_amount
    }

    if (isEdit.value && props.editData) {
      await updateOutboundReturn(props.editData.outbound_return_id, submitData)
      message.success('出库退货单更新成功')
    } else {
      await createOutboundReturn(submitData)
      message.success('出库退货单创建成功')
    }

    emit('update:visible', false)
    emit('success')
  } catch (error: any) {
    message.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.return-order-form {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.return-order-header {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.form-item {
  flex: 1;
  display: flex;
  align-items: center;
}

.form-label {
  width: 100px;
  text-align: right;
  margin-right: 8px;
  white-space: nowrap;
}

.invisible-input :deep(.ant-input) {
  border: none;
  background: transparent;
}

.invisible-input :deep(.ant-input-number) {
  border: none;
  background: transparent;
}

.table-container {
  margin-bottom: 16px;
}

.return-order-note {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;
  margin-bottom: 16px;
}

.note-row {
  display: flex;
  align-items: center;
}

.note-label {
  width: 80px;
  text-align: right;
  margin-right: 8px;
  white-space: nowrap;
}

.form-footer {
  text-align: right;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
