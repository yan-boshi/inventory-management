<template>
  <div class="suppliers-container">
    <div class="header">
      <h1>供应商管理</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增供应商
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="供应商名称">
            <a-input
              v-model:value="searchParams.name"
              placeholder="请输入供应商名称"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="供应商代码">
            <a-input
              v-model:value="searchParams.code"
              placeholder="请输入供应商代码"
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
        :data-source="suppliers"
        :loading="loading"
        :pagination="pagination"
        rowKey="supplier_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'supplier_name'">
            <a @click="handleViewDetail(record)">{{ record.supplier_name }}</a>
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
    </a-card>

    <SupplierForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :supplierData="currentSupplier"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { suppliersApi } from '@/api/suppliers'
import type { Supplier, SupplierQueryParams } from '@/types'
import SupplierForm from '@/components/SupplierForm.vue'
import dayjs from 'dayjs'

const suppliers = ref<Supplier[]>([])
const loading = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const currentSupplier = ref<Supplier | undefined>(undefined)

const searchParams = reactive<SupplierQueryParams>({
  page: 1,
  pageSize: 10,
  name: '',
  code: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
  pageSizeOptions: ['10', '20', '50', '100'],
})

const columns = [
  {
    title: '供应商名称',
    dataIndex: 'supplier_name',
    key: 'supplier_name',
    width: 150,
  },
  {
    title: '供应商代码',
    dataIndex: 'supplier_code',
    key: 'supplier_code',
    width: 120,
  },
  {
    title: '供应商税号',
    dataIndex: 'supplier_tax_number',
    key: 'supplier_tax_number',
    width: 150,
  },
  {
    title: '联系电话',
    dataIndex: 'supplier_phone',
    key: 'supplier_phone',
    width: 120,
  },
  {
    title: '联系人',
    dataIndex: 'contact',
    key: 'contact',
    width: 100,
  },
  {
    title: '联系邮箱',
    dataIndex: 'supplier_email',
    key: 'supplier_email',
    width: 180,
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

const loadSuppliers = async () => {
  loading.value = true
  try {
    const response = await suppliersApi.getAll(searchParams)
    suppliers.value = response.data || []
    pagination.total = response.data?.pagination?.total || 0
    pagination.current = response.data?.pagination?.page || 1
    pagination.pageSize = response.data?.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载供应商列表失败:', error)
    message.error('加载供应商列表失败')
    suppliers.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadSuppliers()
}

const handleReset = () => {
  searchParams.name = ''
  searchParams.code = ''
  handleSearch()
}

const handleTableChange = (pag: any) => {
  searchParams.page = pag.current
  searchParams.pageSize = pag.pageSize
  loadSuppliers()
}

const handleAdd = () => {
  isEdit.value = false
  currentSupplier.value = undefined
  formVisible.value = true
}

const handleEdit = (supplier: Supplier) => {
  isEdit.value = true
  currentSupplier.value = supplier
  formVisible.value = true
}

const handleViewDetail = (supplier: Supplier) => {
  currentSupplier.value = supplier
  formVisible.value = true
  isEdit.value = true
}

const handleDelete = (supplier: Supplier) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除供应商 ${supplier.supplier_name} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await suppliersApi.delete(supplier.supplier_id)
        message.success('删除成功')
        loadSuppliers()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleSuccess = () => {
  loadSuppliers()
}

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD')
}

onMounted(() => {
  loadSuppliers()
})
</script>

<style scoped lang="scss">
.suppliers-container {
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
