<template>
  <a-modal
    :title="isEdit ? '编辑供应商' : '新增供应商'"
    :width="800"
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
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <a-form-item label="供应商名称" name="supplier_name">
          <a-input v-model:value="form.supplier_name" placeholder="请输入供应商名称" />
        </a-form-item>

        <a-form-item label="供应商代码" name="supplier_code">
          <a-input v-model:value="form.supplier_code" placeholder="请输入供应商代码" :disabled="isEdit" />
        </a-form-item>

        <a-form-item label="供应商税号" name="supplier_tax_number">
          <a-input v-model:value="form.supplier_tax_number" placeholder="请输入供应商税号" />
        </a-form-item>

        <a-form-item label="联系电话" name="supplier_phone">
          <a-input v-model:value="form.supplier_phone" placeholder="请输入联系电话" />
        </a-form-item>

        <a-form-item label="联系邮箱" name="supplier_email">
          <a-input v-model:value="form.supplier_email" placeholder="请输入联系邮箱" />
        </a-form-item>

        <a-form-item label="联系人" name="contact">
          <a-input v-model:value="form.contact" placeholder="请输入联系人" />
        </a-form-item>

        <a-form-item label="联系人电话" name="contact_phone">
          <a-input v-model:value="form.contact_phone" placeholder="请输入联系人电话" />
        </a-form-item>

        <a-form-item label="注册地址" name="register_address" :label-col="{ span: 24 }">
          <a-textarea v-model:value="form.register_address" :rows="2" placeholder="请输入注册地址" />
        </a-form-item>

        <a-form-item label="开户银行" name="bank_name">
          <a-input v-model:value="form.bank_name" placeholder="请输入开户银行" />
        </a-form-item>

        <a-form-item label="银行账号" name="bank_account">
          <a-input v-model:value="form.bank_account" placeholder="请输入银行账号" />
        </a-form-item>

        <a-form-item label="银行代码" name="bank_code">
          <a-input v-model:value="form.bank_code" placeholder="请输入银行代码" />
        </a-form-item>

        <a-form-item label="备注" name="remarks" :label-col="{ span: 24 }">
          <a-textarea v-model:value="form.remarks" :rows="3" placeholder="请输入备注信息" />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { suppliersApi } from '@/api/suppliers'
import type { Supplier, CreateSupplierRequest } from '@/types'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  supplierData?: Supplier
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const formRef = ref()
const loading = ref(false)

const form = reactive<CreateSupplierRequest>({
  supplier_name: '',
  supplier_code: '',
  supplier_tax_number: '',
  register_address: '',
  supplier_phone: '',
  supplier_email: '',
  bank_name: '',
  bank_account: '',
  bank_code: '',
  contact: '',
  contact_phone: '',
  remarks: ''
})

const rules = {
  supplier_name: [
    { required: true, message: '请输入供应商名称', trigger: 'blur' }
  ],
  supplier_code: [
    { required: true, message: '请输入供应商代码', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    if (props.isEdit && props.supplierData?.supplier_id) {
      await suppliersApi.update(props.supplierData.supplier_id, form)
      message.success('供应商更新成功')
      emit('success')
    } else {
      await suppliersApi.create(form)
      message.success('供应商创建成功')
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
  if (visible && props.isEdit && props.supplierData) {
    Object.assign(form, {
      supplier_name: props.supplierData.supplier_name || '',
      supplier_code: props.supplierData.supplier_code || '',
      supplier_tax_number: props.supplierData.supplier_tax_number || '',
      register_address: props.supplierData.register_address || '',
      supplier_phone: props.supplierData.supplier_phone || '',
      supplier_email: props.supplierData.supplier_email || '',
      bank_name: props.supplierData.bank_name || '',
      bank_account: props.supplierData.bank_account || '',
      bank_code: props.supplierData.bank_code || '',
      contact: props.supplierData.contact || '',
      contact_phone: props.supplierData.contact_phone || '',
      remarks: props.supplierData.remarks || ''
    })
  } else if (visible && !props.isEdit) {
    resetForm()
  }
})

const resetForm = () => {
  Object.assign(form, {
    supplier_name: '',
    supplier_code: '',
    supplier_tax_number: '',
    register_address: '',
    supplier_phone: '',
    supplier_email: '',
    bank_name: '',
    bank_account: '',
    bank_code: '',
    contact: '',
    contact_phone: '',
    remarks: ''
  })
}
</script>
