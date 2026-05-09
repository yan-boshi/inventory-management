<template>
  <a-modal
    :title="isEdit ? '编辑结算方式' : '新增结算方式'"
    :width="600"
    :visible="visible"
    @ok="handleSubmit"
    @cancel="handleCancel"
    :okText="isEdit ? '保存' : '创建'"
    :confirmLoading="loading"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
      v-if="visible"
    >
      <a-form-item label="结算方式名称" name="payment_method_name">
        <a-input v-model:value="form.payment_method_name" placeholder="请输入结算方式名称" />
      </a-form-item>

      <a-form-item label="备注" name="remarks">
        <a-textarea v-model:value="form.remarks" :rows="3" placeholder="请输入备注信息" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { paymentMethodsApi } from '@/api/paymentMethods'
import type { PaymentMethod, CreatePaymentMethodRequest } from '@/types'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  paymentMethodData?: PaymentMethod
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const formRef = ref()
const loading = ref(false)

const form = reactive<CreatePaymentMethodRequest>({
  payment_method_name: '',
  remarks: ''
})

const rules = {
  payment_method_name: [
    { required: true, message: '请输入结算方式名称', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    if (props.isEdit && props.paymentMethodData?.payment_method_id) {
      await paymentMethodsApi.update(props.paymentMethodData.payment_method_id, form)
      message.success('结算方式更新成功')
      emit('success')
    } else {
      await paymentMethodsApi.create(form)
      message.success('结算方式创建成功')
      emit('success')
    }

    emit('update:visible', false)
  } catch (error) {
    message.error((error as any).message || '操作失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}

watch(() => props.visible, (visible) => {
  if (visible && props.isEdit && props.paymentMethodData) {
    Object.assign(form, {
      payment_method_name: props.paymentMethodData.payment_method_name || '',
      remarks: props.paymentMethodData.remarks || ''
    })
  } else if (visible && !props.isEdit) {
    resetForm()
  }
})

const resetForm = () => {
  Object.assign(form, {
    payment_method_name: '',
    remarks: ''
  })
}
</script>
