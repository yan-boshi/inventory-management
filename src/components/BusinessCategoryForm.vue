<template>
  <a-modal
    :title="isEdit ? '编辑业务分类' : '新增业务分类'"
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
      <a-form-item label="业务分类名称" name="business_category_name">
        <a-input v-model:value="form.business_category_name" placeholder="请输入业务分类名称" />
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
import { businessCategoriesApi } from '@/api/businessCategories'
import type { BusinessCategory, CreateBusinessCategoryRequest } from '@/types'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  businessCategoryData?: BusinessCategory
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const formRef = ref()
const loading = ref(false)

const form = reactive<CreateBusinessCategoryRequest>({
  business_category_name: '',
  remarks: ''
})

const rules = {
  business_category_name: [
    { required: true, message: '请输入业务分类名称', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    if (props.isEdit && props.businessCategoryData?.business_category_id) {
      await businessCategoriesApi.update(props.businessCategoryData.business_category_id, form)
      message.success('业务分类更新成功')
      emit('success')
    } else {
      await businessCategoriesApi.create(form)
      message.success('业务分类创建成功')
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
  if (visible && props.isEdit && props.businessCategoryData) {
    Object.assign(form, {
      business_category_name: props.businessCategoryData.business_category_name || '',
      remarks: props.businessCategoryData.remarks || ''
    })
  } else if (visible && !props.isEdit) {
    resetForm()
  }
})

const resetForm = () => {
  Object.assign(form, {
    business_category_name: '',
    remarks: ''
  })
}
</script>
