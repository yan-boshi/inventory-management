<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑海关汇率' : '新增海关汇率'"
    @cancel="handleCancel"
    @ok="handleSubmit"
    :confirmLoading="submitting"
    width="500px"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="源币种" name="source_currency">
            <a-select
              v-model:value="formData.source_currency"
              placeholder="请选择源币种"
              :disabled="isEdit"
            >
              <a-select-option v-for="cur in currencyList" :key="cur.currency_code" :value="cur.currency_code">
                {{ cur.currency_code }} - {{ cur.currency_name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="目标币种" name="target_currency">
            <a-select
              v-model:value="formData.target_currency"
              placeholder="请选择目标币种"
              :disabled="isEdit"
            >
              <a-select-option v-for="cur in currencyList" :key="cur.currency_code" :value="cur.currency_code">
                {{ cur.currency_code }} - {{ cur.currency_name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="生效月" name="effective_month">
        <a-month-picker
          v-model:value="formData.effective_month"
          placeholder="选择月份"
          style="width: 100%"
          :disabled="isEdit"
          @change="handleMonthChange"
        />
      </a-form-item>
      <a-form-item label="汇率" name="rate">
        <a-input-number
          v-model:value="formData.rate"
          :min="0"
          :max="999999"
          :precision="6"
          :step="0.0001"
          placeholder="请输入汇率"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="备注" name="remarks">
        <a-textarea
          v-model:value="formData.remarks"
          placeholder="请输入备注"
          :rows="3"
          :maxlength="200"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { createCustomsExchangeRate, updateCustomsExchangeRate } from '@/api/customsExchangeRates'
import type { CustomsExchangeRate, Currency } from '@/types'
import dayjs, { type Dayjs } from 'dayjs'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  rateData?: CustomsExchangeRate
  currencyList: Currency[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const submitting = ref(false)

function getFirstDayStr(date: Dayjs): string {
  return date.startOf('month').format('YYYY-MM-DD')
}

const getDefaultFormData = () => ({
  source_currency: undefined as string | undefined,
  target_currency: undefined as string | undefined,
  effective_month: null as Dayjs | null,
  effective_month_str: '',
  rate: undefined as number | undefined,
  remarks: '',
})

const formData = reactive(getDefaultFormData())

const rules = {
  source_currency: [{ required: true, message: '请选择源币种', trigger: 'change' }],
  target_currency: [{ required: true, message: '请选择目标币种', trigger: 'change' }],
  effective_month: [{ required: true, message: '请选择生效月', trigger: 'change' }],
  rate: [{ required: true, message: '请输入汇率', trigger: 'blur' }],
}

const handleMonthChange = (val: Dayjs | null) => {
  formData.effective_month_str = val ? getFirstDayStr(val) : ''
}

watch(() => props.visible, (val) => {
  if (val) {
    if (props.isEdit && props.rateData) {
      const monthDate = dayjs(props.rateData.effective_month)
      Object.assign(formData, {
        source_currency: props.rateData.source_currency,
        target_currency: props.rateData.target_currency,
        effective_month: monthDate,
        effective_month_str: props.rateData.effective_month.slice(0, 10),
        rate: Number(props.rateData.rate),
        remarks: props.rateData.remarks || '',
      })
    } else {
      Object.assign(formData, getDefaultFormData())
    }
  }
})

const handleCancel = () => {
  formRef.value?.resetFields()
  emit('update:visible', false)
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validateFields()
    submitting.value = true

    if (props.isEdit && props.rateData) {
      await updateCustomsExchangeRate(props.rateData.customs_exchange_rate_id, {
        rate: formData.rate,
        remarks: formData.remarks,
      })
      message.success('更新成功')
    } else {
      await createCustomsExchangeRate({
        source_currency: formData.source_currency,
        target_currency: formData.target_currency,
        effective_month: formData.effective_month_str,
        rate: formData.rate,
        remarks: formData.remarks,
      })
      message.success('创建成功')
    }

    formRef.value?.resetFields()
    emit('update:visible', false)
    emit('success')
  } catch (error: any) {
    if (error.response?.data?.message) {
      message.error(error.response.data.message)
    }
  } finally {
    submitting.value = false
  }
}
</script>
