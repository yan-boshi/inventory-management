<template>
  <div class="settlement-form-container">
    <!-- 页面头 -->
    <div class="header">
      <a-button type="link" size="small" @click="handleBack">
        <template #icon><ArrowLeftOutlined /></template>
        返回
      </a-button>
      <h1>对账单</h1>
    </div>

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
                placeholder="请输入账单编号"
                size="small"
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
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="销售额" name="sales_amount" class="mb-2">
              <a-input-number
                v-model:value="formData.sales_amount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="请输入销售额"
                size="small"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
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
          <a-col :span="12">
            <a-form-item label="开票日期" name="invoice_date" class="mb-2">
              <a-date-picker
                v-model:value="formData.invoice_date"
                format="YYYY-MM-DD"
                style="width: 100%"
                placeholder="请选择开票日期"
                size="small"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="是否开票" name="is_invoiced" class="mb-2">
              <a-select
                v-model:value="formData.is_invoiced"
                placeholder="请选择是否开票"
                size="small"
              >
                <a-select-option :value="0">未开票</a-select-option>
                <a-select-option :value="1">已开票</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="发票号" name="invoice_number" class="mb-2">
              <a-input
                v-model:value="formData.invoice_number"
                placeholder="请输入发票号"
                size="small"
              />
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

      <!-- 页面下部分 -->
      <a-card class="form-card" size="small">
        <a-row :gutter="16">
          <a-col :span="8">
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
          <a-col :span="8">
            <a-form-item label="已开票金额" name="invoiced_amount" class="mb-2">
              <a-input-number
                v-model:value="formData.invoiced_amount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="请输入已开票金额"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="未开票金额" name="uninvoiced_amount" class="mb-2">
              <a-input-number
                v-model:value="formData.uninvoiced_amount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="请输入未开票金额"
                size="small"
              />
            </a-form-item>
          </a-col>
        </a-row>
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
          <a-button size="small" @click="handleBack">取消</a-button>
          <a-button type="primary" size="small" html-type="submit" :loading="submitting">
            {{ isEdit ? '保存' : '新增' }}
          </a-button>
        </a-space>
      </div>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { settlementApi } from '@/api/settlement'
import { customersApi } from '@/api/customers'
import { suppliersApi } from '@/api/suppliers'
import { paymentMethodsApi } from '@/api/paymentMethods'
import type { SettlementStatement, SettlementStatementItem } from '@/types'
import { formatDate } from '@/utils/date'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const formRef = ref()
const submitting = ref(false)
const entityOptions = ref<{ id: string; code: string; name: string }[]>([])
const paymentMethods = ref<{ payment_method_id: string; payment_method_name: string }[]>([])
const searchText = ref('')

const isEdit = computed(() => !!route.params.id)

// 根据路由判断类型
const getTypeFromRoute = (): 1 | 2 => {
  const path = route.path
  if (path.includes('create-payable')) return 2
  return 1
}

const formData = reactive({
  type: getTypeFromRoute() as 1 | 2,
  entity_id: '',
  entity_name: '',
  statement_number: '',
  settlement_date_start: null as dayjs.Dayjs | null,
  settlement_date_end: null as dayjs.Dayjs | null,
  payment_method: '',
  sales_amount: 0,
  is_invoiced: 0 as 0 | 1,
  invoice_date: null as dayjs.Dayjs | null,
  invoice_number: '',
  handling_fee: 0,
  document_date: dayjs() as dayjs.Dayjs | null,
  total_amount: 0,
  invoiced_amount: 0,
  uninvoiced_amount: 0,
  billing_status: 0 as 0 | 1 | 2,
  remarks: '',
  items: [] as any[],
})

const rules = {
  entity_id: [{ required: true, message: '请选择客户/供应商代码' }],
  entity_name: [{ required: true, message: '请输入客户/供应商名称' }],
  statement_number: [{ required: true, message: '请输入账单编号' }],
  settlement_date_start: [{ required: true, message: '请选择开始月份' }],
  settlement_date_end: [{ required: true, message: '请选择结束月份' }],
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
  if (formData.entity_id && formData.billing_month) {
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
    const startDate = formData.settlement_date_start.format('YYYY-MM-DD')
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
          delivery_date: formData.type === 1 ? record.delivery_time : record.warehousing_time,
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
  if (!isEdit.value) return

  try {
    const res = await settlementApi.getById(route.params.id as string)
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
    formData.sales_amount = data.sales_amount
    formData.is_invoiced = data.is_invoiced
    formData.invoice_date = data.invoice_date ? dayjs(data.invoice_date) : null
    formData.invoice_number = data.invoice_number || ''
    formData.handling_fee = data.handling_fee || 0
    formData.document_date = data.document_date ? dayjs(data.document_date) : null
    formData.total_amount = data.total_amount
    formData.invoiced_amount = data.invoiced_amount
    formData.uninvoiced_amount = data.uninvoiced_amount
    formData.billing_status = data.billing_status
    formData.remarks = data.remarks || ''
    formData.items = data.items || []

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

  // 验证账单编号唯一性（创建时）
  if (!isEdit.value && !formData.statement_number) {
    message.error('请输入账单编号')
    return
  }

  submitting.value = true
  try {
    // 如果只选择了开始月份，结束月份默认为开始月份的月底
    const settlementDateStart = formData.settlement_date_start
      ? formData.settlement_date_start.format('YYYY-MM-DD')
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
      sales_amount: formData.sales_amount,
      is_invoiced: formData.is_invoiced,
      invoice_date: formData.invoice_date ? formData.invoice_date.format('YYYY-MM-DD') : null,
      invoice_number: formData.invoice_number,
      handling_fee: formData.handling_fee,
      document_date: formData.document_date ? formData.document_date.format('YYYY-MM-DD') : null,
      total_amount: totalAmount.value,
      invoiced_amount: formData.invoiced_amount,
      uninvoiced_amount: formData.uninvoiced_amount,
      billing_status: formData.is_invoiced === 1 ? 1 : 0,
      remarks: formData.remarks,
      items: formData.items,
    }

    if (isEdit.value) {
      await settlementApi.update(route.params.id as string, submitData)
      message.success('保存成功')
    } else {
      await settlementApi.create(submitData)
      message.success('新增成功')
    }

    router.push('/settlement-statement')
  } catch (error: any) {
    message.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleBack = () => {
  router.push('/settlement-statement')
}

watch(
  () => formData.type,
  () => {
    formData.entity_id = ''
    formData.entity_name = ''
    formData.items = []
    fetchEntityOptions()
  }
)

onMounted(() => {
  fetchEntityOptions()
  fetchPaymentMethods()
  fetchDetail()
})
</script>

<style scoped>
.settlement-form-container {
  padding: 0;
  font-size: 13px;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.header h1 {
  margin: 0;
  font-size: 16px;
}

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
