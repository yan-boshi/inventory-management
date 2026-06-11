# Vite + Vue 3 + Ant Design Vue 开发规范

开发时严格遵循以下规范，确保代码风格统一和避免常见bug。

## 项目技术栈

- **构建工具**: Vite
- **前端框架**: Vue 3 + Composition API
- **UI组件库**: Ant Design Vue 4.x
- **类型检查**: TypeScript
- **HTTP客户端**: Axios

## Vue 3 Composition API 规范

### 组件结构
```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'

// 2. Props定义
const props = defineProps<{
  id: string
  visible?: boolean
}>()

// 3. Emits定义
const emit = defineEmits<{
  (e: 'update', value: string): void
  (e: 'close'): void
}>()

// 4. 响应式状态
const loading = ref(false)
const formData = ref<DataType>({
  // 初始化所有字段，避免undefined
})

// 5. 计算属性
const isDisabled = computed(() => !formData.value.name)

// 6. 方法
const handleSubmit = async () => {
  // 实现
}

// 7. 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped lang="scss">
/* 组件样式 */
</style>
```

### 关键规则
- 始终使用 `<script setup>` 语法
- Props必须定义TypeScript类型，使用`withDefaults`设置默认值
- 响应式数据初始化时提供完整结构，避免undefined
- 异步操作使用try-catch包裹，处理loading状态

## Ant Design Vue 规范

### 表单处理
```vue
<template>
  <a-form
    :model="formData"
    :rules="rules"
    @finish="handleSubmit"
  >
    <a-form-item label="名称" name="name">
      <a-input v-model:value="formData.name" placeholder="请输入" />
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'

const formRef = ref<FormInstance>()

const rules = {
  name: [{ required: true, message: '请输入名称' }]
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validateFields()
    // 提交逻辑
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}
</script>
```

### 表格处理
```vue
<template>
  <a-table
    :columns="columns"
    :data-source="dataSource"
    :loading="loading"
    :pagination="pagination"
    @change="handleTableChange"
    row-key="id"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'action'">
        <a-space>
          <a @click="handleEdit(record)">编辑</a>
          <a-popconfirm
            title="确定删除?"
            @confirm="handleDelete(record.id)"
          >
            <a class="danger-link">删除</a>
          </a-popconfirm>
        </a-space>
      </template>
    </template>
  </a-table>
</template>
```

### 关键规则
- 表单必须设置`:model`和`:rules`
- 表格必须设置`row-key`
- 删除操作必须有二次确认
- 使用`message.success/error`进行操作反馈

## TypeScript 规范

### 类型定义
```typescript
// src/types/index.ts
export interface Product {
  id: number
  name: string
  price: number
  stock: number
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

export interface PaginationParams {
  page: number
  pageSize: number
}
```

### API调用
```typescript
// src/api/products.ts
import request from '@/utils/request'
import type { Product, ApiResponse } from '@/types'

export const getProducts = (params?: PaginationParams) => {
  return request.get<ApiResponse<Product[]>>('/api/products', { params })
}

export const createProduct = (data: Partial<Product>) => {
  return request.post<ApiResponse<Product>>('/api/products', data)
}
```

### 关键规则
- 接口和类型定义在`src/types/index.ts`统一管理
- API函数返回明确的类型
- 使用`Partial<T>`表示可选更新
- 避免使用`any`，必要时使用`unknown`

## 文件组织规范

```
src/
├── api/                    # API请求
│   ├── products.ts
│   └── orders.ts
├── components/             # 公共组件
│   ├── ProductForm.vue
│   └── OrderTable.vue
├── views/                  # 页面组件
│   ├── products/
│   │   └── Products.vue
│   └── orders/
│       └── Orders.vue
├── types/                  # 类型定义
│   └── index.ts
├── utils/                  # 工具函数
│   └── request.ts
└── router/                 # 路由配置
    └── index.ts
```

## 常见Bug避免指南

### 1. 响应式数据丢失
```typescript
// ❌ 错误：直接解构会丢失响应性
const { name, age } = reactive({ name: 'test', age: 18 })

// ✅ 正确：使用toRefs
const { name, age } = toRefs(reactive({ name: 'test', age: 18 }))
```

### 2. 异步操作状态管理
```typescript
// ❌ 错误：未处理loading和error
const fetchData = async () => {
  const res = await api.getData()
  data.value = res.data
}

// ✅ 正确：完整的状态管理
const loading = ref(false)
const error = ref<string | null>(null)

const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await api.getData()
    data.value = res.data
  } catch (e) {
    error.value = (e as Error).message
    message.error('获取数据失败')
  } finally {
    loading.value = false
  }
}
```

### 3. 表单数据初始化
```typescript
// ❌ 错误：初始化不完整导致验证问题
const formData = ref({})

// ✅ 正确：提供完整初始值
const formData = ref<Product>({
  id: 0,
  name: '',
  price: 0,
  stock: 0
})
```

### 4. 组件卸载后操作
```typescript
// ❌ 错误：组件卸载后更新状态
onMounted(async () => {
  const res = await api.getData()
  data.value = res.data  // 组件可能已卸载
})

// ✅ 正确：使用标志位或AbortController
onMounted(async () => {
  const controller = new AbortController()
  try {
    const res = await api.getData({ signal: controller.signal })
    data.value = res.data
  } catch (e) {
    if (!controller.signal.aborted) {
      console.error(e)
    }
  }
  onUnmounted(() => controller.abort())
})
```

### 5. 路由参数处理
```typescript
// ❌ 错误：直接使用可能为undefined的参数
const id = route.params.id
await api.getItem(id)

// ✅ 正确：验证参数存在
const id = route.params.id as string
if (!id) {
  message.error('参数错误')
  router.back()
  return
}
await api.getItem(id)
```

## 代码检查清单

在提交代码前，确保：
- [ ] 运行 `npm run typecheck` 无类型错误
- [ ] 运行 `npm run build` 构建成功
- [ ] 所有异步操作有loading状态
- [ ] 表单有完整的验证规则
- [ ] 删除操作有二次确认
- [ ] 错误信息用户友好
- [ ] 组件props有TypeScript类型定义
