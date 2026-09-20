<template>
  <a-modal
    :visible="visible"
    :width="1200"
    :footer="null"
    @cancel="handleCancel"
    :destroyOnClose="true"
  >
    <template #title>
      <div style="text-align: center; width: 100%;">
        {{ isEdit ? '编辑对账单' : '对账单' }}
      </div>
    </template>
    <a-form
      :model="formData"
      :rules="rules"
      ref="formRef"
      layout="vertical"
      size="small"
      @finish="handleSubmit"
      class="compact-form"
    >
      <!-- 页面上部分：左侧和右侧布局 -->
      <a-card class="form-card" size="small">
        <a-row :gutter="16">
          <!-- 左侧 -->
          <a-col :span="12">
            <a-form-item
              :label="formData.type === 1 ? '客户代码' : '供应商代码'"
              name="entity_id"
              class="mb-2"
            >
              <a-select
                v-model:value="formData.entity_id"
                :placeholder="formData.type === 1 ? '请选择客户代码' : '请选择供应商代码'"
                show-search
                :filter-option="filterOption"
                @change="handleEntityCodeChange"
                size="small"
                :disabled="hasPreSelected"
              >
                <a-select-option v-for="item in entityOptions" :key="item.id" :value="item.code">
                  {{ item.code }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="账单编号" name="statement_number" class="mb-2">
              <a-input
                v-model:value="formData.statement_number"
                placeholder="自动生成"
                size="small"
                disabled
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              :label="formData.type === 1 ? '客户名称' : '供应商名称'"
              name="entity_name"
              class="mb-2"
            >
              <a-select
                v-model:value="formData.entity_name"
                :placeholder="
                  formData.type === 1 ? '请选择或输入客户名称' : '请选择或输入供应商名称'
                "
                show-search
                :filter-option="filterOptionByName"
                @change="handleEntityNameChange"
                @search="handleEntityNameSearch"
                size="small"
                :options="entityNameOptions"
                :disabled="hasPreSelected"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结算方式" name="payment_method" class="mb-2">
              <a-select
                v-model:value="formData.payment_method"
                placeholder="请选择结算方式"
                size="small"
              >
                <a-select-option
                  v-for="item in paymentMethods"
                  :key="item.payment_method_id"
                  :value="item.payment_method_name"
                >
                  {{ item.payment_method_name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="制单日期" name="document_date" class="mb-2">
              <a-date-picker
                v-model:value="formData.document_date"
                format="YYYY-MM-DD"
                style="width: 100%"
                placeholder="请选择制单日期"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="开票状态" class="mb-2">
              <a-tag :color="billingStatusColor" style="font-size: 14px; padding: 4px 12px;">
                {{ billingStatusText }}
              </a-tag>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item label="开始月份" name="settlement_date_start" class="mb-0">
              <a-month-picker
                v-model:value="formData.settlement_date_start"
                format="YYYY-MM"
                placeholder="请选择开始月份"
                style="width: 100%"
                size="small"
                @change="handleSettlementDateChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="结束月份" name="settlement_date_end" class="mb-0">
              <a-month-picker
                v-model:value="formData.settlement_date_end"
                format="YYYY-MM"
                placeholder="请选择结束月份"
                style="width: 100%"
                size="small"
                @change="handleSettlementDateChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手续费" name="handling_fee" class="mb-0">
              <a-input-number
                v-model:value="formData.handling_fee"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="请输入手续费"
                size="small"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- 页面中部分：商品信息表格 -->
      <a-card
        :title="formData.type === 1 ? '出库单信息' : '入库单信息'"
        class="form-card"
        size="small"
      >
        <a-table
          :columns="itemColumns"
          :data-source="formData.items"
          :pagination="false"
          bordered
          size="small"
          rowKey="index"
          :scroll="{ y: 300 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'no'">
              {{ index + 1 }}
            </template>
            <template v-else-if="column.key === 'delivery_date'">
              {{ formatDate(record.delivery_date) }}
            </template>
            <template v-else-if="column.key === 'quantity'">
              {{ record.quantity }}
            </template>
            <template v-else-if="column.key === 'unit_price'">
              {{ formatMoney(record.unit_price) }}
            </template>
            <template v-else-if="column.key === 'amount_with_tax'">
              {{ formatMoney(record.amount_with_tax) }}
            </template>
          </template>
          <template #summary>
            <a-table-summary>
              <a-table-summary-row>
                <a-table-summary-cell :index="0" :colSpan="11" />
                <a-table-summary-cell :index="11" align="right">
                  <strong>{{ formatMoney(totalAmount) }}</strong>
                </a-table-summary-cell>
                <a-table-summary-cell :index="12" />
              </a-table-summary-row>
            </a-table-summary>
          </template>
        </a-table>
      </a-card>

      <!-- 页面下部分：开票记录 -->
      <a-card title="开票记录" class="form-card" size="small">
        <a-table
          :columns="invoiceRecordColumns"
          :data-source="formData.invoice_records"
          :pagination="false"
          bordered
          size="small"
          rowKey="_key"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'no'">
              {{ index + 1 }}
            </template>
            <template v-else-if="column.key === 'invoice_date'">
              <a-date-picker
                v-model:value="record._invoice_date"
                format="YYYY-MM-DD"
                style="width: 100%"
                placeholder="请选择开票日期"
                size="small"
                @change="(date: any) => { record.invoice_date = date ? date.format('YYYY-MM-DD') : null }"
              />
            </template>
            <template v-else-if="column.key === 'invoice_number'">
              <a-input
                v-model:value="record.invoice_number"
                placeholder="请输入发票号"
                size="small"
              />
            </template>
            <template v-else-if="column.key === 'invoiced_amount'">
              <a-input-number
                v-model:value="record.invoiced_amount"
                :min="0"
                :precision="4"
                style="width: 100%"
                placeholder="开票金额"
                size="small"
              />
            </template>
            <template v-else-if="column.key === 'uninvoiced_amount'">
              <span>{{ formatMoney4(computedInvoiceRecords[index]?.uninvoiced_amount) }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" danger size="small" :disabled="formData.invoice_records.length <= 1" @click="removeInvoiceRecord(index)">
                删除
              </a-button>
            </template>
          </template>
        </a-table>
        <div style="margin-top: 8px; text-align: center;">
          <a-button type="dashed" size="small" @click="addInvoiceRecord" style="width: 200px;">
            + 添加开票记录
          </a-button>
        </div>
      </a-card>

      <!-- 备注 -->
      <a-card class="form-card" size="small">
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="备注" name="remarks" class="mb-0">
              <a-textarea
                v-model:value="formData.remarks"
                :rows="2"
                placeholder="请输入备注"
                size="small"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <div class="form-actions">
        <a-space>
          <a-button size="small" @click="handleCancel">取消</a-button>
          <a-button type="primary" size="small" html-type="submit" :loading="submitting">
            {{ isEdit ? '保存' : '新增' }}
          </a-button>
        </a-space>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { settlementApi } from '@/api/settlement'
import { customersApi } from '@/api/customers'
import { suppliersApi } from '@/api/suppliers'
import { paymentMethodsApi } from '@/api/paymentMethods'
import { formatDate } from '@/utils/date'
import dayjs from 'dayjs'

const props = defineProps<{
  visible: boolean
  type: 1 | 2 // 1=应收, 2=应付
  settlementId?: string
  preSelectedRecords?: any[] // 从应收账款/应付账款页面预选的记录
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const formRef = ref()
const submitting = ref(false)
const entityOptions = ref<{ id: string; code: string; name: string }[]>([])
const paymentMethods = ref<{ payment_method_id: string; payment_method_name: string }[]>([])
const searchText = ref('')

const isEdit = computed(() => !!props.settlementId)

// 是否有预选记录（从应收账款/应付账款页面选择行后生成对账单）
const hasPreSelected = computed(() => !!props.preSelectedRecords && props.preSelectedRecords.length > 0)

// 开票记录行的类型
interface InvoiceRecordRow {
  _key: string
  invoice_date: string | null
  _invoice_date: dayjs.Dayjs | null
  invoice_number: string
  invoiced_amount: number
  uninvoiced_amount: number
}

let invoiceRecordKeyCounter = 0

const formData = reactive({
  type: props.type as 1 | 2,
  entity_id: '',
  entity_name: '',
  statement_number: '',
  settlement_date_start: null as dayjs.Dayjs | null,
  settlement_date_end: null as dayjs.Dayjs | null,
  payment_method: '',
  handling_fee: 0,
  document_date: dayjs() as dayjs.Dayjs | null,
  total_amount: 0,
  billing_status: 0 as 0 | 1 | 2,
  remarks: '',
  items: [] as any[],
  invoice_records: [{
    _key: `inv_${++invoiceRecordKeyCounter}`,
    invoice_date: null,
    _invoice_date: null,
    invoice_number: '',
    invoiced_amount: 0,
    uninvoiced_amount: 0,
  }] as InvoiceRecordRow[],
})

const rules = {
  entity_id: [{ required: true, message: '请选择客户/供应商代码' }],
  entity_name: [{ required: true, message: '请输入客户/供应商名称' }],
}

const itemColumns = computed(() => {
  const dateTitle = formData.type === 1 ? '出库日期' : '入库日期'
  const numberTitle = formData.type === 1 ? '出库编号' : '入库编号'

  return [
    { title: '序号', key: 'no', width: 60, align: 'center' as const },
    { title: dateTitle, key: 'delivery_date', width: 100 },
    { title: numberTitle, dataIndex: 'delivery_number', key: 'delivery_number', width: 120 },
    { title: '产品代码', dataIndex: 'product_code', key: 'product_code', width: 100 },
    { title: '产品名称', dataIndex: 'product_name', key: 'product_name', width: 120 },
    { title: '产品型号', dataIndex: 'product_model', key: 'product_model', width: 100 },
    { title: '产品描述', dataIndex: 'product_description', key: 'product_description', width: 120 },
    { title: '数量', key: 'quantity', width: 80, align: 'right' as const },
    { title: '币种', dataIndex: 'currency', key: 'currency', width: 60 },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 60 },
    { title: '单价', key: 'unit_price', width: 100, align: 'right' as const },
    { title: '金额(含税)', key: 'amount_with_tax', width: 110, align: 'right' as const },
    { title: '备注', dataIndex: 'remarks', key: 'remarks', width: 120 },
  ]
})

const totalAmount = computed(() => {
  return formData.items.reduce((sum, item) => sum + (item.amount_with_tax || 0), 0)
})

const invoiceRecordColumns = [
  { title: '序号', key: 'no', width: 60, align: 'center' as const },
  { title: '开票日期', key: 'invoice_date', width: 160 },
  { title: '发票号', key: 'invoice_number', width: 160 },
  { title: '开票金额', key: 'invoiced_amount', width: 140, align: 'right' as const },
  { title: '未开票金额', key: 'uninvoiced_amount', width: 140, align: 'right' as const },
  { title: '操作', key: 'actions', width: 80, align: 'center' as const },
]

const addInvoiceRecord = () => {
  formData.invoice_records.push({
    _key: `inv_${++invoiceRecordKeyCounter}`,
    invoice_date: null,
    _invoice_date: null,
    invoice_number: '',
    invoiced_amount: 0,
    uninvoiced_amount: 0,
  })
}

const removeInvoiceRecord = (index: number) => {
  formData.invoice_records.splice(index, 1)
}

// 格式化金额（4位小数）
const formatMoney4 = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '0.0000'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

// 计算每行未开票金额：总额 - 累计已开票金额
const computedInvoiceRecords = computed(() => {
  const total = totalAmount.value || 0
  let cumulativeInvoiced = 0
  return formData.invoice_records.map(record => {
    cumulativeInvoiced += record.invoiced_amount || 0
    return {
      ...record,
      uninvoiced_amount: Math.max(0, total - cumulativeInvoiced),
    }
  })
})

// 根据开票记录计算总已开票金额
const totalInvoicedAmount = computed(() => {
  return formData.invoice_records.reduce((sum, r) => sum + (r.invoiced_amount || 0), 0)
})

// 根据已开票金额和总金额计算开票状态
// 0=未开票, 1=已开票, 2=部分开票
const computedBillingStatus = computed(() => {
  const invoiced = totalInvoicedAmount.value
  const total = totalAmount.value || 0
  if (total <= 0) return 0
  if (invoiced >= total) return 1
  if (invoiced > 0) return 2
  return 0
})

const billingStatusText = computed(() => {
  const status = computedBillingStatus.value
  if (status === 1) return '已开票'
  if (status === 2) return '部分开票'
  return '未开票'
})

const billingStatusColor = computed(() => {
  const status = computedBillingStatus.value
  if (status === 1) return 'green'
  if (status === 2) return 'orange'
  return 'default'
})

const formatMoney = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// 客户名称下拉选项
const entityNameOptions = computed(() => {
  const options = entityOptions.value.map(item => ({
    value: item.name,
    label: item.name,
  }))
  // 如果搜索文本不在选项中，添加为自定义选项
  if (searchText.value && !options.some(opt => opt.value === searchText.value)) {
    options.unshift({
      value: searchText.value,
      label: searchText.value,
    })
  }
  return options
})

const filterOptionByName = (input: string, option: any) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

const handleEntityNameSearch = (value: string) => {
  searchText.value = value
}

const filterOption = (input: string, option: any) => {
  return option.value.toLowerCase().includes(input.toLowerCase())
}

const handleEntityCodeChange = (value: string) => {
  const option = entityOptions.value.find(item => item.code === value)
  if (option) {
    formData.entity_name = option.name
  }
  // 如果已选择月份，自动获取未开票记录
  if (formData.entity_id && formData.settlement_date_start) {
    fetchUninvoicedRecords()
  }
}

const fetchEntityOptions = async () => {
  try {
    if (formData.type === 1) {
      const res = await customersApi.getAll({ pageSize: 1000 })
      entityOptions.value = (res.data || []).map((item: any) => ({
        id: item.customer_id,
        code: item.customer_code,
        name: item.customer_name,
      }))
    } else {
      const res = await suppliersApi.getAll({ pageSize: 1000 })
      entityOptions.value = (res.data || []).map((item: any) => ({
        id: item.supplier_id,
        code: item.supplier_code,
        name: item.supplier_name,
      }))
    }
  } catch (error: any) {
    message.error(error.message || '获取列表失败')
  }
}

const fetchPaymentMethods = async () => {
  try {
    const res = await paymentMethodsApi.getAllList()
    paymentMethods.value = res.data || []
  } catch (error: any) {
    message.error(error.message || '获取结算方式失败')
  }
}

const handleEntityNameChange = (value: string) => {
  const option = entityOptions.value.find(item => item.name === value)
  if (option) {
    formData.entity_id = option.code
  }
  // 如果已选择结算日期，自动获取未开票记录
  if (formData.entity_id && formData.settlement_date_start) {
    fetchUninvoicedRecords()
  }
}

const handleSettlementDateChange = () => {
  // 如果已选择客户/供应商，自动获取未开票记录
  if (formData.entity_id && formData.settlement_date_start) {
    fetchUninvoicedRecords()
  }
}

const fetchUninvoicedRecords = async () => {
  if (!formData.entity_id || !formData.settlement_date_start) return

  try {
    // 如果只选择了开始月份，结束月份默认为开始月份的月底
    const startDate = formData.settlement_date_start.startOf('month').format('YYYY-MM-DD')
    const endDate = formData.settlement_date_end
      ? formData.settlement_date_end.endOf('month').format('YYYY-MM-DD')
      : formData.settlement_date_start.endOf('month').format('YYYY-MM-DD')

    const res = await settlementApi.getUninvoicedRecords({
      type: formData.type,
      settlement_date_start: startDate,
      settlement_date_end: endDate,
      entity_id: formData.entity_id,
    })

    const records = res.data || []
    if (records.length === 0) {
      message.info('没有找到未开票的记录')
      formData.items = []
      return
    }

    // 获取每个记录的商品信息
    const allItems: any[] = []
    for (const record of records) {
      const orderNumber = formData.type === 1 ? record.delivery_number : record.warehousing_number
      if (orderNumber) {
        const itemsRes = await settlementApi.getOrderItems({
          type: formData.type,
          order_number: orderNumber,
        })
        const items = (itemsRes.data || []).map((item: any) => ({
          ...item,
          delivery_date: dayjs(formData.type === 1 ? record.delivery_time : record.warehousing_time).format('YYYY-MM-DD'),
          delivery_number: orderNumber,
          source_type: formData.type,
          source_id: formData.type === 1 ? record.receivable_id : record.payable_id,
          currency: 'CNY',
        }))
        allItems.push(...items)
      }
    }

    formData.items = allItems
    // 自动计算总计
    formData.total_amount = totalAmount.value
  } catch (error: any) {
    message.error(error.message || '获取未开票记录失败')
  }
}

const fetchDetail = async () => {
  if (!isEdit.value || !props.settlementId) return

  try {
    const res = await settlementApi.getById(props.settlementId)
    const data = res.data

    formData.type = data.type
    formData.entity_id = data.entity_id
    formData.entity_name = data.entity_name
    formData.statement_number = data.statement_number
    // 如果有结算日期，转换为开始和结束月份
    if (data.settlement_date) {
      const date = dayjs(data.settlement_date)
      formData.settlement_date_start = date.startOf('month')
      formData.settlement_date_end = date.endOf('month')
    }
    formData.payment_method = data.payment_method || ''
    formData.handling_fee = data.handling_fee || 0
    formData.document_date = data.document_date ? dayjs(data.document_date) : null
    formData.total_amount = data.total_amount
    formData.billing_status = data.billing_status
    formData.remarks = data.remarks || ''
    formData.items = data.items || []

    // 加载开票记录
    const loadedRecords = (data.invoice_records || []).map((r: any) => ({
      _key: `inv_${++invoiceRecordKeyCounter}`,
      invoice_date: r.invoice_date || null,
      _invoice_date: r.invoice_date ? dayjs(r.invoice_date) : null,
      invoice_number: r.invoice_number || '',
      invoiced_amount: Number(r.invoiced_amount) || 0,
      uninvoiced_amount: Number(r.uninvoiced_amount) || 0,
    }))
    formData.invoice_records = loadedRecords.length > 0 ? loadedRecords : [{
      _key: `inv_${++invoiceRecordKeyCounter}`,
      invoice_date: null,
      _invoice_date: null,
      invoice_number: '',
      invoiced_amount: 0,
      uninvoiced_amount: 0,
    }]

    await fetchEntityOptions()
  } catch (error: any) {
    message.error(error.message || '获取详情失败')
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validateFields()
  } catch {
    return
  }

  submitting.value = true
  try {
    // 如果只选择了开始月份，结束月份默认为开始月份的月底
    const settlementDateStart = formData.settlement_date_start
      ? formData.settlement_date_start.startOf('month').format('YYYY-MM-DD')
      : null
    const settlementDateEnd = formData.settlement_date_start
      ? formData.settlement_date_end
        ? formData.settlement_date_end.endOf('month').format('YYYY-MM-DD')
        : formData.settlement_date_start.endOf('month').format('YYYY-MM-DD')
      : null

    const submitData = {
      type: formData.type,
      entity_id: formData.entity_id,
      entity_name: formData.entity_name,
      statement_number: formData.statement_number,
      settlement_date: settlementDateStart,
      settlement_date_end: settlementDateEnd,
      payment_method: formData.payment_method,
      is_invoiced: computedBillingStatus.value === 1 ? 1 : 0,
      handling_fee: formData.handling_fee,
      document_date: formData.document_date ? formData.document_date.format('YYYY-MM-DD') : null,
      total_amount: totalAmount.value,
      invoiced_amount: totalInvoicedAmount.value,
      billing_status: computedBillingStatus.value,
      remarks: formData.remarks,
      items: formData.items,
      invoice_records: computedInvoiceRecords.value.map(r => ({
        invoice_date: r.invoice_date,
        invoice_number: r.invoice_number,
        invoiced_amount: r.invoiced_amount,
        uninvoiced_amount: r.uninvoiced_amount,
      })),
    }

    if (isEdit.value && props.settlementId) {
      await settlementApi.update(props.settlementId, submitData)
      message.success('保存成功')
    } else {
      await settlementApi.create(submitData)
      message.success('新增成功')
    }

    emit('success')
  } catch (error: any) {
    message.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}

// 重置表单
const resetForm = () => {
  formData.type = props.type
  formData.entity_id = ''
  formData.entity_name = ''
  formData.statement_number = ''
  formData.settlement_date_start = null
  formData.settlement_date_end = null
  formData.payment_method = ''
  formData.handling_fee = 0
  formData.document_date = dayjs()
  formData.total_amount = 0
  formData.billing_status = 0
  formData.remarks = ''
  formData.items = []
  invoiceRecordKeyCounter = 0
  formData.invoice_records = [{
    _key: `inv_${++invoiceRecordKeyCounter}`,
    invoice_date: null,
    _invoice_date: null,
    invoice_number: '',
    invoiced_amount: 0,
    uninvoiced_amount: 0,
  }]
}

// 从预选记录中加载数据
const loadFromPreSelectedRecords = async () => {
  if (!props.preSelectedRecords || props.preSelectedRecords.length === 0) return

  const firstRecord = props.preSelectedRecords[0]

  // 自动填充实体信息
  if (formData.type === 1) {
    // 应收：客户信息
    formData.entity_id = firstRecord.customer_id || ''
    formData.entity_name = firstRecord.customer_name || ''
  } else {
    // 应付：供应商信息
    formData.entity_id = firstRecord.supplier_id || ''
    formData.entity_name = firstRecord.supplier_name || ''
  }

  // 同步结算方式：取第一个有结算方式的记录
  const paymentMethodRecord = props.preSelectedRecords.find(r => r.payment_method)
  if (paymentMethodRecord) {
    formData.payment_method = paymentMethodRecord.payment_method
  }

  // 获取每个记录的商品信息
  const allItems: any[] = []
  for (const record of props.preSelectedRecords) {
    const orderNumber = record.source_bill_id
    if (orderNumber) {
      try {
        const itemsRes = await settlementApi.getOrderItems({
          type: formData.type,
          order_number: orderNumber,
        })
        const items = (itemsRes.data || []).map((item: any) => ({
          ...item,
          delivery_date: dayjs(formData.type === 1 ? record.delivery_time : record.warehousing_time).format('YYYY-MM-DD'),
          delivery_number: orderNumber,
          source_type: formData.type,
          source_id: record.receivable_id || record.payable_id,
          currency: 'CNY',
        }))
        allItems.push(...items)
      } catch (error: any) {
        console.error(`获取单据 ${orderNumber} 商品信息失败:`, error)
      }
    }
  }

  formData.items = allItems
  formData.total_amount = totalAmount.value
}

// 获取下一个账单编号
const fetchNextStatementNumber = async () => {
  try {
    const res = await settlementApi.getNextStatementNumber()
    formData.statement_number = res.data.statement_number
  } catch (error: any) {
    console.error('获取账单编号失败:', error)
  }
}

// 监听 visible 变化
watch(
  () => props.visible,
  async visible => {
    if (visible) {
      formData.type = props.type
      await fetchEntityOptions()
      await fetchPaymentMethods()
      if (isEdit.value) {
        await fetchDetail()
      } else if (props.preSelectedRecords && props.preSelectedRecords.length > 0) {
        resetForm()
        formData.type = props.type
        await fetchNextStatementNumber()
        await loadFromPreSelectedRecords()
      } else {
        resetForm()
        await fetchNextStatementNumber()
      }
    }
  }
)
</script>

<style scoped>
.form-card {
  margin-bottom: 8px;
}

.form-card :deep(.ant-card-head) {
  min-height: 32px;
  padding: 0 12px;
}

.form-card :deep(.ant-card-head-title) {
  padding: 8px 0;
  font-size: 13px;
}

.form-card :deep(.ant-card-body) {
  padding: 12px;
}

.compact-form :deep(.ant-form-item-label) {
  padding: 0 0 2px;
}

.compact-form :deep(.ant-form-item-label > label) {
  font-size: 12px;
  height: 20px;
}

.compact-form :deep(.ant-form-item) {
  margin-bottom: 8px;
}

.compact-form :deep(.ant-form-item-with-help) {
  margin-bottom: 4px;
}

.mb-0 {
  margin-bottom: 0 !important;
}

.mb-2 {
  margin-bottom: 4px !important;
}

.form-actions {
  text-align: center;
  padding: 8px 0;
}

:deep(.ant-table-small) {
  font-size: 12px;
}

:deep(.ant-table-small .ant-table-thead > tr > th),
:deep(.ant-table-small .ant-table-tbody > tr > td) {
  padding: 4px 8px;
}

:deep(.ant-input),
:deep(.ant-input-number),
:deep(.ant-select-selector),
:deep(.ant-picker) {
  font-size: 12px;
}

:deep(.ant-input-number-input) {
  font-size: 12px;
}
</style>
