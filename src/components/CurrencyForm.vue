<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑币种' : '新增币种'"
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
      <a-form-item label="币种代码" name="currency_code">
        <a-input
          v-model:value="formData.currency_code"
          placeholder="如 USD、HKD"
          :disabled="isEdit"
          :maxlength="10"
        />
      </a-form-item>
      <a-form-item label="币种名称" name="currency_name">
        <a-input
          v-model:value="formData.currency_name"
          placeholder="如 美元、港币"
          :maxlength="50"
        />
      </a-form-item>
      <a-form-item label="币种符号" name="currency_symbol">
        <a-input
          v-model:value="formData.currency_symbol"
          placeholder="如 $、HK$"
          :maxlength="10"
        />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="小数位数" name="decimal_places">
            <a-input-number
              v-model:value="formData.decimal_places"
              :min="0"
              :max="6"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="排序号" name="sort_order">
            <a-input-number
              v-model:value="formData.sort_order"
              :min="0"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="基础币种" name="is_base_currency">
            <a-switch
              v-model:checked="formData.is_base_currency"
              checked-children="是"
              un-checked-children="否"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="启用状态" name="is_active">
            <a-switch
              v-model:checked="formData.is_active"
              checked-children="启用"
              un-checked-children="停用"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { createCurrency, updateCurrency } from '@/api/currencies'
import type { Currency } from '@/types'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  currencyData?: Currency
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const getDefaultFormData = () => ({
  currency_code: '',
  currency_name: '',
  currency_symbol: '',
  decimal_places: 2,
  is_base_currency: false,
  is_active: true,
  sort_order: 0,
})

const formData = reactive(getDefaultFormData())

const rules = {
  currency_code: [{ required: true, message: '请输入币种代码', trigger: 'blur' }],
  currency_name: [{ required: true, message: '请输入币种名称', trigger: 'blur' }],
  currency_symbol: [{ required: true, message: '请输入币种符号', trigger: 'blur' }],
}

watch(() => props.visible, (val) => {
  if (val) {
    if (props.isEdit && props.currencyData) {
      Object.assign(formData, {
        currency_code: props.currencyData.currency_code,
        currency_name: props.currencyData.currency_name,
        currency_symbol: props.currencyData.currency_symbol,
        decimal_places: props.currencyData.decimal_places,
        is_base_currency: props.currencyData.is_base_currency === 1,
        is_active: props.currencyData.is_active === 1,
        sort_order: props.currencyData.sort_order,
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

    const submitData = {
      ...formData,
      is_base_currency: formData.is_base_currency ? 1 : 0,
      is_active: formData.is_active ? 1 : 0,
    }

    if (props.isEdit && props.currencyData) {
      await updateCurrency(props.currencyData.currency_id, submitData)
      message.success('更新成功')
    } else {
      await createCurrency(submitData)
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
