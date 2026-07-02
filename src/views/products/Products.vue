<template>
  <div class="products-container">
    <div class="header">
      <h1>产品管理</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增产品
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="产品名称">
            <a-input
              v-model:value="searchParams.name"
              placeholder="请输入产品名称"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="产品代码">
            <a-input
              v-model:value="searchParams.code"
              placeholder="请输入产品代码"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch"> <SearchOutlined /> 查询 </a-button>
              <a-button @click="handleReset"> <ReloadOutlined /> 重置 </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="columns"
        :data-source="products"
        :loading="loading"
        :pagination="false"
        rowKey="product_id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'stock'">
            <span :style="{ color: Math.floor(record.stock || 0) <= 0 ? '#ff4d4f' : '#52c41a' }">
              {{ Math.floor(record.stock || 0) }}
            </span>
          </template>

          <template v-else-if="column.key === 'created_at'">
            {{ formatDate(record.created_at) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleEdit(record)"> 编辑 </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <a-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        :total="pagination.total"
        show-total
        show-size-changer
        show-quick-jumper
        :page-size-options="['10', '20', '50', '100']"
        style="margin-top: 16px; text-align: right"
        @change="handlePageChange"
        @showSizeChange="handlePageChange"
      />
    </a-card>

    <ProductForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :productData="currentProduct"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { productsApi } from '@/api/products'
import type { Product, ProductQueryParams } from '@/types'
import ProductForm from '@/components/ProductForm.vue'
import dayjs from 'dayjs'

const products = ref<Product[]>([])
const loading = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const currentProduct = ref<Product | undefined>(undefined)

const searchParams = reactive<ProductQueryParams>({
  page: 1,
  pageSize: 10,
  name: '',
  code: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const columns = [
  {
    title: '产品名称',
    dataIndex: 'product_name',
    key: 'product_name',
    width: 150,
  },
  {
    title: '产品代码',
    dataIndex: 'product_code',
    key: 'product_code',
    width: 120,
  },
  {
    title: '规格型号',
    dataIndex: 'model',
    key: 'model',
    width: 120,
  },
  {
    title: '规格描述',
    dataIndex: 'description',
    key: 'description',
    width: 200,
    ellipsis: true,
  },
  {
    title: '库存',
    dataIndex: 'stock',
    key: 'stock',
    width: 80,
    align: 'right' as const,
  },
  {
    title: '单位',
    dataIndex: 'unit',
    key: 'unit',
    width: 80,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 120,
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
  },
]

const loadProducts = async () => {
  loading.value = true
  try {
    const response = await productsApi.getAll(searchParams)
    products.value = response.data || []
    pagination.total = response.data?.pagination?.total || 0
    pagination.current = response.data?.pagination?.page || 1
    pagination.pageSize = response.data?.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载产品列表失败:', error)
    message.error('加载产品列表失败')
    products.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadProducts()
}

const handleReset = () => {
  searchParams.name = ''
  searchParams.code = ''
  handleSearch()
}

const handlePageChange = (page: number, pageSize: number) => {
  searchParams.page = page
  searchParams.pageSize = pageSize
  loadProducts()
}

const handleAdd = () => {
  isEdit.value = false
  currentProduct.value = undefined
  formVisible.value = true
}

const handleEdit = (product: Product) => {
  isEdit.value = true
  currentProduct.value = product
  formVisible.value = true
}

const handleDelete = (product: Product) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除产品 ${product.product_name} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await productsApi.delete(product.product_id)
        message.success('删除成功')
        loadProducts()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleSuccess = () => {
  loadProducts()
}

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD')
}

onMounted(() => {
  loadProducts()
})
</script>

<style scoped lang="scss">
.products-container {
  padding: 24px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
  }

  .search-bar {
    margin-bottom: 16px;
  }
}
</style>
