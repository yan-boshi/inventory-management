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
            />
          </a-form-item>

          <a-form-item label="供应商代码">
            <a-input
              v-model:value="searchParams.code"
              placeholder="请输入供应商代码"
              allow-clear
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch"> <SearchOutlined /> 查询 </a-button>
              <a-button @click="handleReset"> <ReloadOutlined /> 重置 </a-button>
              <a-button @click="handleExport"> <DownloadOutlined /> 导出Excel </a-button>
              <ColumnConfig :columns="allColumns" @update:columns="handleColumnConfigUpdate" cacheKey="suppliers" />
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="visibleColumns"
        :data-source="suppliers"
        :loading="loading"
        :pagination="false"
        rowKey="supplier_id"
        :scroll="{ x: 2100, y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'supplier_name'">
            <a @click="handleViewDetail(record)">{{ record.supplier_name }}</a>
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

    <SupplierForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :supplierData="currentSupplier"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { suppliersApi } from '@/api/suppliers'
import type { Supplier, SupplierQueryParams } from '@/types'
import SupplierForm from '@/components/SupplierForm.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'
import { formatDate } from '@/utils/date'

const suppliers = ref<Supplier[]>([])
const loading = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const currentSupplier = ref<Supplier | undefined>(undefined)

const searchParams = reactive<SupplierQueryParams>({
  page: 1,
  pageSize: 100,
  name: '',
  code: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 100,
  total: 0,
})

// 使用 ref 使列配置可通过 ColumnConfig 组件更新
const allColumns = ref([
  {
    title: '序号',
    key: 'index',
    width: 60,
    align: 'center',
    fixed: 'left',
    customRender: ({ index }: { index: number }) => {
      return (pagination.current - 1) * pagination.pageSize + index + 1
    },
  },
  {
    title: '供应商名称',
    dataIndex: 'supplier_name',
    key: 'supplier_name',
    width: 150,
    fixed: 'left',
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
    width: 180,
  },
  {
    title: '联系电话',
    dataIndex: 'supplier_phone',
    key: 'supplier_phone',
    width: 130,
  },
  {
    title: '联系人',
    dataIndex: 'contact',
    key: 'contact',
    width: 100,
  },
  {
    title: '联系人电话',
    dataIndex: 'contact_phone',
    key: 'contact_phone',
    width: 130,
  },
  {
    title: '邮箱',
    dataIndex: 'supplier_email',
    key: 'supplier_email',
    width: 180,
  },
  {
    title: '注册地址',
    dataIndex: 'register_address',
    key: 'register_address',
    width: 200,
    ellipsis: true,
  },
  {
    title: '开户银行',
    dataIndex: 'bank_name',
    key: 'bank_name',
    width: 150,
  },
  {
    title: '银行账号',
    dataIndex: 'bank_account',
    key: 'bank_account',
    width: 180,
  },
  {
    title: '银行代码',
    dataIndex: 'bank_code',
    key: 'bank_code',
    width: 120,
  },
  {
    title: '备注',
    dataIndex: 'remarks',
    key: 'remarks',
    width: 150,
    ellipsis: true,
  },
  {
    title: '建档日期',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
  },
  {
    title: '建档人',
    dataIndex: 'created_by',
    key: 'created_by',
    width: 100,
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
  },
])

// 处理 ColumnConfig 组件的列更新
const handleColumnConfigUpdate = (newColumns: any[]) => {
  allColumns.value = newColumns
}

// 计算可见列
const visibleColumns = computed(() => {
  return allColumns.value.filter((col: any) => col.visible !== false)
})

const loadSuppliers = async () => {
  loading.value = true
  try {
    const response = await suppliersApi.getAll(searchParams)
    suppliers.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
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

const handlePageChange = (page: number, pageSize: number) => {
  searchParams.page = page
  searchParams.pageSize = pageSize
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

// 导出Excel
const exportColumns: ExportColumn[] = [
  { key: 'supplier_name', title: '供应商名称' },
  { key: 'supplier_code', title: '供应商代码' },
  { key: 'supplier_tax_number', title: '供应商税号' },
  { key: 'supplier_phone', title: '联系电话' },
  { key: 'contact', title: '联系人' },
  { key: 'contact_phone', title: '联系人电话' },
  { key: 'supplier_email', title: '邮箱' },
  { key: 'register_address', title: '注册地址' },
  { key: 'bank_name', title: '开户银行' },
  { key: 'bank_account', title: '银行账号' },
  { key: 'bank_code', title: '银行代码' },
  { key: 'remarks', title: '备注' },
  { key: 'created_at', title: '建档日期', formatter: (v) => formatDate(v) },
  { key: 'created_by', title: '建档人' },
]

const handleExport = async () => {
  try {
    const params: any = { page: 1, pageSize: 99999 }
    if (searchParams.name) params.name = searchParams.name
    if (searchParams.code) params.code = searchParams.code

    const response = await suppliersApi.getAll(params)
    const data = response.data || []

    // 只导出显示的列
    const visibleKeySet = new Set(visibleColumns.value.flatMap((col: any) => [col.dataIndex, col.key]).filter(Boolean))
    const filteredExportColumns = exportColumns.filter(col => visibleKeySet.has(col.key))

    exportToExcel({ filename: '供应商列表', columns: filteredExportColumns, data })
  } catch (error) {
    console.error('导出失败:', error)
  }
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

    :deep(.ant-form-item) {
      margin-bottom: 12px;

      > .ant-form-item-label {
        width: 80px;
        text-align: right;
        padding-right: 8px;
      }
    }

    :deep(.ant-input),
    :deep(.ant-input-affix-wrapper) {
      width: 180px;
    }

    :deep(.ant-picker) {
      width: 240px;
    }

    :deep(.ant-select) {
      width: 180px;
    }
  }
}
</style>
