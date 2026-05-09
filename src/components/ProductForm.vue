<template>
  <a-modal
    :title="isEdit ? '编辑产品' : '新增产品'"
    :width="700"
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
      <a-form-item label="产品名称" name="product_name">
        <a-input v-model:value="form.product_name" placeholder="请输入产品名称" />
      </a-form-item>

      <a-form-item label="产品代码" name="product_code">
        <a-input v-model:value="form.product_code" placeholder="请输入产品代码" :disabled="isEdit" />
      </a-form-item>

      <a-form-item label="规格型号" name="model">
        <a-input v-model:value="form.model" placeholder="请输入规格型号" />
      </a-form-item>

      <a-form-item label="规格描述" name="description">
        <a-textarea v-model:value="form.description" :rows="3" placeholder="请输入规格描述" />
      </a-form-item>

      <a-form-item label="单位" name="unit">
        <a-input v-model:value="form.unit" placeholder="请输入单位" />
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
import { productsApi } from '@/api/products'
import type { Product, CreateProductRequest } from '@/types'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  productData?: Product
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const formRef = ref()
const loading = ref(false)

const form = reactive<CreateProductRequest>({
  product_name: '',
  product_code: '',
  model: '',
  description: '',
  unit: '',
  remarks: ''
})

const rules = {
  product_name: [
    { required: true, message: '请输入产品名称', trigger: 'blur' }
  ],
  product_code: [
    { required: true, message: '请输入产品代码', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    if (props.isEdit && props.productData?.product_id) {
      await productsApi.update(props.productData.product_id, form)
      message.success('产品更新成功')
      emit('success')
    } else {
      await productsApi.create(form)
      message.success('产品创建成功')
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
  if (visible && props.isEdit && props.productData) {
    Object.assign(form, {
      product_name: props.productData.product_name || '',
      product_code: props.productData.product_code || '',
      model: props.productData.model || '',
      description: props.productData.description || '',
      unit: props.productData.unit || '',
      remarks: props.productData.remarks || ''
    })
  } else if (visible && !props.isEdit) {
    resetForm()
  }
})

const resetForm = () => {
  Object.assign(form, {
    product_name: '',
    product_code: '',
    model: '',
    description: '',
    unit: '',
    remarks: ''
  })
}
</script>
