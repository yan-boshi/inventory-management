<template>
  <div class="customers-container">
    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="客户名称">
            <a-input
              v-model:value="searchParams.name"
              placeholder="请输入客户名称"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="客户代码">
            <a-input
              v-model:value="searchParams.code"
              placeholder="请输入客户代码"
              allow-clear
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch"> <SearchOutlined /> 查询 </a-button>
              <a-button @click="handleReset"> <ReloadOutlined /> 重置 </a-button>
              <a-button @click="handleExport"> <DownloadOutlined /> 导出Excel </a-button>
              <ColumnConfig :columns="allColumns" @update:columns="handleColumnConfigUpdate" cacheKey="customers" />
              <a-button type="primary" @click="handleAdd" style="margin-left: 16px;">
                <template #icon>
                  <PlusOutlined />
                </template>
                新增客户
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="visibleColumns"
        :data-source="customers"
        :loading="loading"
        :pagination="false"
        rowKey="customer_id"
        :scroll="{ x: 2100, y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'customer_name'">
            <a @click="handleViewDetail(record)">{{ record.customer_name }}</a>
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

    <CustomerForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :customerData="currentCustomer"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons-vue'
import { customersApi } from '@/api/customers'
import type { Customer, CustomerQueryParams } from '@/types'
import CustomerForm from '@/components/CustomerForm.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import { exportToExcel, type ExportColumn } from '@/utils/exportExcel'
import { formatDate } from '@/utils/date'

const customers = ref<Customer[]>([])
const loading = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const currentCustomer = ref<Customer | undefined>(undefined)

const searchParams = reactive<CustomerQueryParams>({
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
    title: '客户名称',
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 150,
    fixed: 'left',
  },
  {
    title: '客户代码',
    dataIndex: 'customer_code',
    key: 'customer_code',
    width: 120,
  },
  {
    title: '信用代码',
    dataIndex: 'customer_tax_number',
    key: 'customer_tax_number',
    width: 180,
  },
  {
    title: '联系电话',
    dataIndex: 'customer_phone',
    key: 'customer_phone',
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
    dataIndex: 'customer_email',
    key: 'customer_email',
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
    title: '收货人',
    dataIndex: 'receiver',
    key: 'receiver',
    width: 100,
  },
  {
    title: '收货地址',
    dataIndex: 'receiver_address',
    key: 'receiver_address',
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

const loadCustomers = async () => {
  loading.value = true
  try {
    const response = await customersApi.getAll(searchParams)
    customers.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载客户列表失败:', error)
    message.error('加载客户列表失败')
    customers.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadCustomers()
}

const handleReset = () => {
  searchParams.name = ''
  searchParams.code = ''
  handleSearch()
}

const handlePageChange = (page: number, pageSize: number) => {
  searchParams.page = page
  searchParams.pageSize = pageSize
  loadCustomers()
}

const handleAdd = () => {
  isEdit.value = false
  currentCustomer.value = undefined
  formVisible.value = true
}

const handleEdit = (customer: Customer) => {
  isEdit.value = true
  currentCustomer.value = customer
  formVisible.value = true
}

const handleViewDetail = (customer: Customer) => {
  currentCustomer.value = customer
  formVisible.value = true
  isEdit.value = true
}

const handleDelete = (customer: Customer) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除客户 ${customer.customer_name} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await customersApi.delete(customer.customer_id)
        message.success('删除成功')
        loadCustomers()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleSuccess = () => {
  loadCustomers()
}

// 导出Excel
const exportColumns: ExportColumn[] = [
  { key: 'customer_name', title: '客户名称' },
  { key: 'customer_code', title: '客户代码' },
  { key: 'customer_tax_number', title: '信用代码' },
  { key: 'customer_phone', title: '联系电话' },
  { key: 'contact', title: '联系人' },
  { key: 'contact_phone', title: '联系人电话' },
  { key: 'customer_email', title: '邮箱' },
  { key: 'register_address', title: '注册地址' },
  { key: 'receiver', title: '收货人' },
  { key: 'receiver_address', title: '收货地址' },
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

    const response = await customersApi.getAll(params)
    const data = response.data || []

    // 只导出显示的列
    const visibleKeySet = new Set(visibleColumns.value.flatMap((col: any) => [col.dataIndex, col.key]).filter(Boolean))
    const filteredExportColumns = exportColumns.filter(col => visibleKeySet.has(col.key))

    exportToExcel({ filename: '客户列表', columns: filteredExportColumns, data })
  } catch (error) {
    console.error('导出失败:', error)
  }
}

onMounted(() => {
  loadCustomers()
})
</script>

<style scoped lang="scss">
.customers-container {
  .search-bar {
    margin-bottom: 12px;

    :deep(.ant-form-item) {
      margin-bottom: 8px;

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
