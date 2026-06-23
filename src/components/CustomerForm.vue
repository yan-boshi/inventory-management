<template>
  <a-modal
    :title="isEdit ? '编辑客户' : '新增客户'"
    :width="1100"
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
      style="margin-bottom: 0;"
    >
      <!-- 客户信息 -->
      <a-divider orientation="left" style="margin: 4px 0 8px;">客户信息</a-divider>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 16px;">
        <a-form-item label="客户名称" name="customer_name" style="margin-bottom: 8px;">
          <a-input v-model:value="form.customer_name" placeholder="请输入客户名称" />
        </a-form-item>

        <a-form-item label="客户代码" name="customer_code" style="margin-bottom: 8px;">
          <a-input v-model:value="form.customer_code" placeholder="请输入客户代码" :disabled="isEdit" />
        </a-form-item>

        <a-form-item label="信用代码" name="customer_tax_number" style="margin-bottom: 8px;">
          <a-input v-model:value="form.customer_tax_number" placeholder="请输入信用代码" />
        </a-form-item>

        <a-form-item label="联系电话" name="customer_phone" style="margin-bottom: 8px;">
          <a-input v-model:value="form.customer_phone" placeholder="请输入联系电话" />
        </a-form-item>

        <a-form-item label="联系邮箱" name="customer_email" style="margin-bottom: 8px;">
          <a-input v-model:value="form.customer_email" placeholder="请输入联系邮箱" />
        </a-form-item>

        <a-form-item label="注册地址" name="register_address" style="grid-column: 1 / -1; margin-bottom: 8px;">
          <a-textarea v-model:value="form.register_address" :rows="1" placeholder="请输入注册地址" />
        </a-form-item>
      </div>

      <!-- 联系人信息 -->
      <a-divider orientation="left" style="margin: 4px 0 8px;">联系人信息</a-divider>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 16px;">
        <a-form-item label="联系人" name="contact" style="margin-bottom: 8px;">
          <a-input v-model:value="form.contact" placeholder="请输入联系人" />
        </a-form-item>

        <a-form-item label="联系人电话" name="contact_phone" style="margin-bottom: 8px;">
          <a-input v-model:value="form.contact_phone" placeholder="请输入联系人电话" />
        </a-form-item>
      </div>

      <!-- 收货信息 -->
      <a-divider orientation="left" style="margin: 4px 0 8px;">收货信息</a-divider>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 16px;">
        <a-form-item label="收货人" name="receiver" style="margin-bottom: 8px;">
          <a-input v-model:value="form.receiver" placeholder="请输入收货人" />
        </a-form-item>

        <a-form-item label="收货地址" name="receiver_address" style="grid-column: 1 / -1; margin-bottom: 8px;">
          <a-textarea v-model:value="form.receiver_address" :rows="1" placeholder="请输入收货地址" />
        </a-form-item>
      </div>

      <!-- 开户银行信息 -->
      <a-divider orientation="left" style="margin: 4px 0 8px;">开户银行信息</a-divider>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 16px;">
        <a-form-item label="开户银行" name="bank_name" style="margin-bottom: 8px;">
          <a-input v-model:value="form.bank_name" placeholder="请输入开户银行" />
        </a-form-item>

        <a-form-item label="银行账号" name="bank_account" style="margin-bottom: 8px;">
          <a-input v-model:value="form.bank_account" placeholder="请输入银行账号" />
        </a-form-item>

        <a-form-item label="银行代码" name="bank_code" style="margin-bottom: 8px;">
          <a-input v-model:value="form.bank_code" placeholder="请输入银行代码" />
        </a-form-item>
      </div>

      <!-- 备注 -->
      <a-divider orientation="left" style="margin: 4px 0 8px;">备注</a-divider>
      <a-form-item name="remarks" style="margin-bottom: 0;">
        <a-textarea v-model:value="form.remarks" :rows="2" placeholder="请输入备注信息" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { customersApi } from '@/api/customers'
import type { Customer, CreateCustomerRequest } from '@/types'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  customerData?: Customer
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const formRef = ref()
const loading = ref(false)

const form = reactive<CreateCustomerRequest>({
  customer_name: '',
  customer_code: '',
  customer_tax_number: '',
  register_address: '',
  customer_phone: '',
  customer_email: '',
  bank_name: '',
  bank_account: '',
  bank_code: '',
  contact: '',
  contact_phone: '',
  receiver: '',
  receiver_address: '',
  remarks: ''
})

const rules = {
  customer_name: [
    { required: true, message: '请输入客户名称', trigger: 'blur' }
  ],
  customer_code: [
    { required: true, message: '请输入客户代码', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    if (props.isEdit && props.customerData?.customer_id) {
      await customersApi.update(props.customerData.customer_id, form)
      message.success('客户更新成功')
      emit('success')
    } else {
      await customersApi.create(form)
      message.success('客户创建成功')
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
  if (visible && props.isEdit && props.customerData) {
    Object.assign(form, {
      customer_name: props.customerData.customer_name || '',
      customer_code: props.customerData.customer_code || '',
      customer_tax_number: props.customerData.customer_tax_number || '',
      register_address: props.customerData.register_address || '',
      customer_phone: props.customerData.customer_phone || '',
      customer_email: props.customerData.customer_email || '',
      bank_name: props.customerData.bank_name || '',
      bank_account: props.customerData.bank_account || '',
      bank_code: props.customerData.bank_code || '',
      contact: props.customerData.contact || '',
      contact_phone: props.customerData.contact_phone || '',
      receiver: props.customerData.receiver || '',
      receiver_address: props.customerData.receiver_address || '',
      remarks: props.customerData.remarks || ''
    })
  } else if (visible && !props.isEdit) {
    resetForm()
  }
})

const resetForm = () => {
  Object.assign(form, {
    customer_name: '',
    customer_code: '',
    customer_tax_number: '',
    register_address: '',
    customer_phone: '',
    customer_email: '',
    bank_name: '',
    bank_account: '',
    bank_code: '',
    contact: '',
    contact_phone: '',
    receiver: '',
    receiver_address: '',
    remarks: ''
  })
}
</script>
