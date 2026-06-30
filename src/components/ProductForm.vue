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
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" v-if="visible">
      <a-divider orientation="left" style="margin: 0 0 8px">产品分类</a-divider>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px">
        <a-form-item label="分类方案" style="margin-bottom: 8px">
          <a-select
            v-model:value="selectedScheme"
            placeholder="请选择分类方案"
            allow-clear
            @change="onSchemeChange"
          >
            <a-select-option
              v-for="item in schemeList"
              :key="item.product_classification_id"
              :value="item.classification_name"
            >
              {{ item.classification_name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="一级分类" style="margin-bottom: 8px">
          <a-select
            v-model:value="selectedLevel1"
            placeholder="请选择一级分类"
            allow-clear
            :disabled="!selectedScheme"
            @change="onLevel1Change"
          >
            <a-select-option v-for="name in level1Options" :key="name" :value="name">
              {{ name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="二级分类" style="margin-bottom: 8px">
          <a-select
            v-model:value="selectedLevel2"
            placeholder="请选择二级分类"
            allow-clear
            :disabled="!selectedLevel1"
            @change="onLevel2Change"
          >
            <a-select-option v-for="name in level2Options" :key="name" :value="name">
              {{ name }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </div>

      <a-divider orientation="left" style="margin: 4px 0 8px">产品信息</a-divider>

      <a-form-item label="产品名称" name="product_name" style="margin-bottom: 8px">
        <a-input v-model:value="form.product_name" placeholder="请输入产品名称" />
      </a-form-item>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px">
        <a-form-item label="产品代码" name="product_code" style="margin-bottom: 8px">
          <a-input
            v-model:value="form.product_code"
            placeholder="请输入产品代码"
            :disabled="isEdit"
          />
        </a-form-item>

        <a-form-item label="规格型号" name="model" style="margin-bottom: 8px">
          <a-input v-model:value="form.model" placeholder="请输入规格型号" />
        </a-form-item>

        <a-form-item label="单位" name="unit" style="margin-bottom: 8px">
          <a-input v-model:value="form.unit" placeholder="请输入单位" />
        </a-form-item>

        <a-form-item label="库存" name="stock" style="margin-bottom: 8px">
          <a-input-number
            v-model:value="form.stock"
            :min="0"
            :precision="0"
            :disabled="!isAdmin"
            placeholder="请输入库存数量"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="规格描述" name="description" style="margin-bottom: 8px">
          <a-input v-model:value="form.description" placeholder="请输入规格描述" />
        </a-form-item>
      </div>

      <a-divider orientation="left" style="margin: 4px 0 8px">备注</a-divider>
      <a-form-item name="remarks" style="margin-bottom: 0">
        <a-textarea v-model:value="form.remarks" :rows="2" placeholder="请输入备注信息" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { productsApi } from '@/api/products'
import { productClassificationApi } from '@/api/productClassification'
import { useUserStore } from '@/stores/user'
import type {
  Product,
  CreateProductRequest,
  ProductClassificationSelection,
  ClassificationTree,
} from '@/types'

const props = defineProps<{
  visible: boolean
  isEdit: boolean
  productData?: Product
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)

const formRef = ref()
const loading = ref(false)

const form = reactive<CreateProductRequest>({
  product_name: '',
  product_code: '',
  model: '',
  description: '',
  unit: '',
  stock: 0,
  tax_included_price: undefined,
  tax_excluded_price: undefined,
  remarks: '',
})

const rules = {
  product_name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  product_code: [{ required: true, message: '请输入产品代码', trigger: 'blur' }],
}

// ==================== 产品分类级联选择 ====================
const schemeList = ref<{ product_classification_id: string; classification_name: string }[]>([])
const classificationTrees = ref<Record<string, ClassificationTree>>({})

const selectedScheme = ref<string | undefined>(undefined)
const selectedLevel1 = ref<string | undefined>(undefined)
const selectedLevel2 = ref<string | undefined>(undefined)

// 获取当前方案的分类树
const currentTree = computed(() => {
  if (!selectedScheme.value) return {}
  return classificationTrees.value[selectedScheme.value] || {}
})

// 一级分类选项
const level1Options = computed(() => {
  return Object.keys(currentTree.value)
})

// 二级分类选项
const level2Options = computed(() => {
  if (!selectedLevel1.value || !currentTree.value[selectedLevel1.value]) return []
  return Object.keys(currentTree.value[selectedLevel1.value])
})

// 加载分类方案列表和详情
const loadClassifications = async () => {
  try {
    console.log('开始加载分类方案...')
    const res = await productClassificationApi.getAllList()
    console.log('分类方案API返回:', res)
    schemeList.value = res.data || []
    console.log('分类方案列表:', schemeList.value)
    // 预加载每个方案的详情（分类树）
    for (const scheme of schemeList.value) {
      const detail = await productClassificationApi.getById(scheme.product_classification_id)
      console.log('分类方案详情:', scheme.classification_name, detail)
      if (detail.data?.classification_data) {
        const data = detail.data.classification_data
        classificationTrees.value[scheme.classification_name] =
          typeof data === 'string' ? JSON.parse(data) : data
      }
    }
    console.log('分类树加载完成:', classificationTrees.value)
  } catch (error) {
    console.error('加载分类方案失败:', error)
    message.error('加载分类方案失败，请刷新重试')
  }
}

onMounted(() => {
  loadClassifications()
})

// 监听分类选择变化，自动更新表单字段
watch([selectedScheme, selectedLevel1, selectedLevel2], () => {
  if (selectedScheme.value && selectedLevel1.value) {
    const selection: ProductClassificationSelection = {
      classification_name: selectedScheme.value,
      level1: selectedLevel1.value,
      level2: selectedLevel2.value || '',
    }
    form.product_classification = JSON.stringify(selection)
  } else {
    form.product_classification = ''
  }
})

// 级联选择事件
const onSchemeChange = () => {
  selectedLevel1.value = undefined
  selectedLevel2.value = undefined
}

const onLevel1Change = () => {
  selectedLevel2.value = undefined
}

const onLevel2Change = () => {
  // 二级选择变更时，更新表单中的 product_classification 字段
}

// 解析分类字段并回填选择器
const parseAndFillClassification = (classificationStr: string | undefined) => {
  if (!classificationStr) {
    selectedScheme.value = undefined
    selectedLevel1.value = undefined
    selectedLevel2.value = undefined
    return
  }
  try {
    const selection: ProductClassificationSelection = JSON.parse(classificationStr)
    selectedScheme.value = selection.classification_name || undefined
    selectedLevel1.value = selection.level1 || undefined
    selectedLevel2.value = selection.level2 || undefined
  } catch {
    selectedScheme.value = undefined
    selectedLevel1.value = undefined
    selectedLevel2.value = undefined
  }
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

watch(
  () => props.visible,
  visible => {
    if (visible && props.isEdit && props.productData) {
      Object.assign(form, {
        product_name: props.productData.product_name || '',
        product_code: props.productData.product_code || '',
        model: props.productData.model || '',
        description: props.productData.description || '',
        unit: props.productData.unit || '',
        stock: props.productData.stock || 0,
        tax_included_price: props.productData.tax_included_price,
        tax_excluded_price: props.productData.tax_excluded_price,
        product_classification: props.productData.product_classification || '',
        remarks: props.productData.remarks || '',
      })
      parseAndFillClassification(props.productData.product_classification)
    } else if (visible && !props.isEdit) {
      resetForm()
    }
  }
)

const resetForm = () => {
  Object.assign(form, {
    product_name: '',
    product_code: '',
    model: '',
    description: '',
    unit: '',
    stock: 0,
    tax_included_price: undefined,
    tax_excluded_price: undefined,
    product_classification: '',
    remarks: '',
  })
  selectedScheme.value = undefined
  selectedLevel1.value = undefined
  selectedLevel2.value = undefined
}
</script>
