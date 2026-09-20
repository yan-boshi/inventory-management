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
        {{ isEdit ? '编辑核销单' : (props.type === 1 ? '应收核销单' : '应付核销单') }}
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
      <!-- 基本信息 -->
      <a-card class="form-card" size="small">
        <a-row :gutter="16">
          <!-- 客户/供应商代码 -->
          <a-col :span="8">
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
          <!-- 核销单编号 -->
          <a-col :span="8">
            <a-form-item label="核销单编号" name="write_off_number" class="mb-2">
              <a-input
                v-model:value="formData.write_off_number"
                placeholder="自动生成"
                size="small"
                disabled
              />
            </a-form-item>
          </a-col>
          <!-- 核销日期 -->
          <a-col :span="8">
            <a-form-item label="核销日期" name="write_off_date" class="mb-2">
              <a-date-picker
                v-model:value="formData.write_off_date"
                format="YYYY-MM-DD"
                style="width: 100%"
                placeholder="请选择核销日期"
                size="small"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <!-- 客户/供应商名称 -->
          <a-col :span="8">
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
          <!-- 收付款方式 -->
          <a-col :span="8">
            <a-form-item label="收付款方式" name="payment_method" class="mb-2">
              <a-select
                v-model:value="formData.payment_method"
                placeholder="请选择收付款方式"
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
          <!-- 银行流水号 -->
          <a-col :span="8">
            <a-form-item label="银行流水号" name="bank_reference" class="mb-2">
              <a-input
                v-model:value="formData.bank_reference"
                placeholder="请输入银行流水号"
                size="small"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- 核销明细表格 -->
      <a-card
        title="核销明细"
        class="form-card"
        size="small"
      >
        <a-table
          :columns="itemColumns"
          :data-source="pendingItems"
          :pagination="false"
          bordered
          size="small"
          rowKey="record_id"
          :scroll="{ y: 300 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'no'">
              {{ index + 1 }}
            </template>

            <template v-else-if="column.key === 'source_bill_id'">
              <a @click="handleViewSourceBill(record)">{{ record.source_bill_id }}</a>
            </template>

            <template v-else-if="column.key === 'receivable_total'">
              {{ formatMoney(record.receivable_total) }}
            </template>

            <template v-else-if="column.key === 'received_amount'">
              {{ formatMoney(record.received_amount) }}
            </template>

            <template v-else-if="column.key === 'balance_amount'">
              <span :style="{ color: record.balance_amount <= 0 ? '#52c41a' : '#f5222d' }">
                {{ formatMoney(record.balance_amount) }}
              </span>
            </template>

            <template v-else-if="column.key === 'write_off_amount'">
              <a-input-number
                v-model:value="record.write_off_amount"
                :min="0"
                :max="record.balance_amount"
                :precision="2"
                style="width: 100%"
                placeholder="本次核销金额"
                size="small"
                @change="() => handleWriteOffAmountChange(record)"
              />
            </template>

            <template v-else-if="column.key === 'after_received'">
              {{ formatMoney(record.balance_amount - (record.write_off_amount || 0)) }}
            </template>
          </template>

          <template #summary>
            <a-table-summary>
              <a-table-summary-row>
                <a-table-summary-cell :index="0" :colSpan="5" align="right">
                  <strong>合计</strong>
                </a-table-summary-cell>
                <a-table-summary-cell :index="5" align="right">
                  <strong>{{ formatMoney(totalWriteOffAmount) }}</strong>
                </a-table-summary-cell>
                <a-table-summary-cell :index="6" />
              </a-table-summary-row>
            </a-table-summary>
          </template>
        </a-table>
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
import { writeOffApi } from '@/api/writeOff'
import { customersApi } from '@/api/customers'
import { suppliersApi } from '@/api/suppliers'
import { paymentMethodsApi } from '@/api/paymentMethods'
import { formatDate } from '@/utils/date'
import type { PendingRecord } from '@/types'
import dayjs from 'dayjs'

const props = defineProps<{
  visible: boolean
  type: 1 | 2 // 1=应收, 2=应付
  writeOffId?: string
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
const pendingItems = ref<(PendingRecord & { write_off_amount: number })[]>([])

const isEdit = computed(() => !!props.writeOffId)
const hasPreSelected = computed(() => !!props.preSelectedRecords && props.preSelectedRecords.length > 0)

const formData = reactive({
  type: props.type as 1 | 2,
  entity_id: '',
  entity_name: '',
  write_off_number: '',
  write_off_date: dayjs() as dayjs.Dayjs | null,
  payment_method: '',
  bank_reference: '',
  document_date: dayjs() as dayjs.Dayjs | null,
  remarks: '',
})

const rules = {
  entity_id: [{ required: true, message: '请选择客户/供应商代码' }],
  entity_name: [{ required: true, message: '请输入客户/供应商名称' }],
  write_off_date: [{ required: true, message: '请选择核销日期' }],
}

const itemColumns = computed(() => [
  { title: '序号', key: 'no', dataIndex: 'no', width: 60, align: 'center' as const },
  { title: '来源单据号', dataIndex: 'source_bill_id', key: 'source_bill_id', width: 130 },
  { title: '应收/应付金额', dataIndex: 'receivable_total', key: 'receivable_total', width: 120, align: 'right' as const },
  { title: '已核销金额', dataIndex: 'received_amount', key: 'received_amount', width: 100, align: 'right' as const },
  { title: '待核销金额', dataIndex: 'balance_amount', key: 'balance_amount', width: 100, align: 'right' as const },
  { title: '本次核销金额', dataIndex: 'write_off_amount', key: 'write_off_amount', width: 140, align: 'right' as const },
  { title: '核销后余额', dataIndex: 'after_received', key: 'after_received', width: 100, align: 'right' as const },
])

// 本次核销总额
const totalWriteOffAmount = computed(() => {
  return pendingItems.value.reduce((sum, item) => sum + (item.write_off_amount || 0), 0)
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
  fetchPendingRecords()
}

const handleEntityNameChange = (value: string) => {
  const option = entityOptions.value.find(item => item.name === value)
  if (option) {
    formData.entity_id = option.code
  }
  fetchPendingRecords()
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

// 获取待核销记录
const fetchPendingRecords = async () => {
  if (!formData.entity_id) {
    pendingItems.value = []
    return
  }

  try {
    const res = await writeOffApi.getPendingRecords({
      type: formData.type,
      entity_id: formData.entity_id,
    })

    const records = (res.data || []).map((record: PendingRecord) => ({
      ...record,
      write_off_amount: 0,
    }))

    // 如果有预选记录，自动填充核销金额
    if (props.preSelectedRecords && props.preSelectedRecords.length > 0) {
      const selectedIds = props.preSelectedRecords.map((r: any) => r.receivable_id || r.payable_id)
      records.forEach((record: any) => {
        const matchingRecord = props.preSelectedRecords?.find(
          (r: any) => (r.receivable_id || r.payable_id) === record.record_id
        )
        if (matchingRecord && selectedIds.includes(record.record_id)) {
          record.write_off_amount = record.balance_amount
        }
      })
    }

    pendingItems.value = records
  } catch (error: any) {
    message.error(error.message || '获取待核销记录失败')
  }
}

// 从预选记录直接构建待核销列表（不依赖API）
const buildPendingItemsFromSelected = () => {
  if (!props.preSelectedRecords || props.preSelectedRecords.length === 0) return

  const idField = formData.type === 1 ? 'receivable_id' : 'payable_id'

  // 过滤掉已结算(status=2)的记录
  const filtered = props.preSelectedRecords.filter((record: any) => record.status !== 2)
  if (filtered.length === 0) {
    message.warning('所选记录均已结算，无法核销')
    pendingItems.value = []
    return
  }
  if (filtered.length < props.preSelectedRecords.length) {
    message.warning(`已自动排除${props.preSelectedRecords.length - filtered.length}条已结算记录`)
  }

  const records = filtered.map((record: any) => {
    const amount = Number(record.amount) || 0
    const handlingFee = Number(record.handling_fee) || 0
    const receivedAmount = Number(record.received_amount) || 0
    const receivableTotal = amount + handlingFee
    const balanceAmount = receivableTotal - receivedAmount

    return {
      record_id: record[idField],
      source_bill_id: record.source_bill_id,
      source_bill_type: record.source_bill_type,
      amount,
      handling_fee: handlingFee,
      receivable_total: receivableTotal,
      received_amount: receivedAmount,
      balance_amount: balanceAmount,
      status: record.status,
      payment_method: record.payment_method,
      write_off_amount: balanceAmount > 0 ? balanceAmount : 0,
    }
  })

  pendingItems.value = records
}

const handleWriteOffAmountChange = (record: any) => {
  if (record.write_off_amount > record.balance_amount) {
    record.write_off_amount = record.balance_amount
    message.warning('核销金额不能超过待核销余额')
  }
}

const handleViewSourceBill = (record: any) => {
  // 可以跳转到对应的出库单或入库单详情
  message.info(`查看来源单据: ${record.source_bill_id}`)
}

// 获取下一个核销单编号
const fetchNextWriteOffNumber = async () => {
  try {
    const res = await writeOffApi.getNextNumber()
    formData.write_off_number = res.data.write_off_number
  } catch (error: any) {
    console.error('获取核销单编号失败:', error)
  }
}

// 获取详情
const fetchDetail = async () => {
  if (!isEdit.value || !props.writeOffId) return

  try {
    const res = await writeOffApi.getById(props.writeOffId)
    const data = res.data

    formData.type = data.type
    formData.entity_id = data.entity_id
    formData.entity_name = data.entity_name
    formData.write_off_number = data.write_off_number
    formData.write_off_date = data.write_off_date ? dayjs(data.write_off_date) : null
    formData.payment_method = data.payment_method || ''
    formData.bank_reference = data.bank_reference || ''
    formData.document_date = data.document_date ? dayjs(data.document_date) : null
    formData.remarks = data.remarks || ''

    await fetchEntityOptions()

    // 获取待核销记录并填充已核销金额
    const res2 = await writeOffApi.getPendingRecords({
      type: data.type,
      entity_id: data.entity_id,
    })

    const records = (res2.data || []).map((record: PendingRecord) => {
      // 找到对应的明细
      const item = (data.items || []).find((i: any) => i.source_bill_id === record.source_bill_id)
      return {
        ...record,
        write_off_amount: item ? item.write_off_amount : 0,
      }
    })

    pendingItems.value = records
  } catch (error: any) {
    message.error(error.message || '获取详情失败')
  }
}

// 从预选记录加载
const loadFromPreSelectedRecords = async () => {
  if (!props.preSelectedRecords || props.preSelectedRecords.length === 0) return

  const firstRecord = props.preSelectedRecords[0]

  // 自动填充实体信息（entity_id 对应客户代码/供应商代码，不是 UUID）
  if (formData.type === 1) {
    formData.entity_id = firstRecord.customer_code || ''
    formData.entity_name = firstRecord.customer_name || ''
  } else {
    formData.entity_id = firstRecord.supplier_code || ''
    formData.entity_name = firstRecord.supplier_name || ''
  }

  // 同步结算方式
  const paymentMethodRecord = props.preSelectedRecords.find(r => r.payment_method)
  if (paymentMethodRecord) {
    formData.payment_method = paymentMethodRecord.payment_method
  }

  // 直接从预选记录构建待核销列表
  buildPendingItemsFromSelected()
}

const handleSubmit = async () => {
  try {
    await formRef.value.validateFields()
  } catch {
    return
  }

  // 验证是否有核销金额
  const itemsToSubmit = pendingItems.value.filter(item => item.write_off_amount > 0)
  if (itemsToSubmit.length === 0) {
    message.warning('请至少输入一项核销金额')
    return
  }

  submitting.value = true
  try {
    const submitData = {
      type: formData.type,
      entity_id: formData.entity_id,
      entity_name: formData.entity_name,
      write_off_date: formData.write_off_date ? formData.write_off_date.format('YYYY-MM-DD') : null,
      payment_method: formData.payment_method,
      bank_reference: formData.bank_reference,
      document_date: formData.document_date ? formData.document_date.format('YYYY-MM-DD') : null,
      total_amount: totalWriteOffAmount.value,
      remarks: formData.remarks,
      items: itemsToSubmit.map(item => ({
        source_id: item.record_id,
        source_bill_id: item.source_bill_id,
        source_bill_type: item.source_bill_type,
        write_off_amount: item.write_off_amount,
      })),
    }

    if (isEdit.value && props.writeOffId) {
      await writeOffApi.update(props.writeOffId, submitData)
      message.success('保存成功')
    } else {
      await writeOffApi.create(submitData)
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
  formData.write_off_number = ''
  formData.write_off_date = dayjs()
  formData.payment_method = ''
  formData.bank_reference = ''
  formData.document_date = dayjs()
  formData.remarks = ''
  pendingItems.value = []
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
        await fetchNextWriteOffNumber()
        await loadFromPreSelectedRecords()
      } else {
        resetForm()
        await fetchNextWriteOffNumber()
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
  margin-bottom: 2px !important;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 12px;
  padding: 12px;
}
</style>
