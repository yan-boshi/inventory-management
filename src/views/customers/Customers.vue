<template>
  <div class="customers-container">
    <div class="header">
      <h1>客户管理</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增客户
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="客户名称">
            <a-input
              v-model:value="searchParams.name"
              placeholder="请输入客户名称"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="客户代码">
            <a-input
              v-model:value="searchParams.code"
              placeholder="请输入客户代码"
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
        :data-source="customers"
        :loading="loading"
        :pagination="false"
        rowKey="customer_id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'customer_name'">
            <a @click="handleViewDetail(record)">{{ record.customer_name }}</a>
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

    <CustomerForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :customerData="currentCustomer"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { customersApi } from '@/api/customers'
import type { Customer, CustomerQueryParams } from '@/types'
import CustomerForm from '@/components/CustomerForm.vue'
import dayjs from 'dayjs'

const customers = ref<Customer[]>([])
const loading = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const currentCustomer = ref<Customer | undefined>(undefined)

const searchParams = reactive<CustomerQueryParams>({
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
    title: '客户名称',
    dataIndex: 'customer_name',
    key: 'customer_name',
    width: 150,
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
    width: 150,
  },
  {
    title: '联系电话',
    dataIndex: 'customer_phone',
    key: 'customer_phone',
    width: 120,
  },
  {
    title: '联系人',
    dataIndex: 'contact',
    key: 'contact',
    width: 100,
  },
  {
    title: '邮箱',
    dataIndex: 'customer_email',
    key: 'customer_email',
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

const loadCustomers = async () => {
  loading.value = true
  try {
    const response = await customersApi.getAll(searchParams)
    customers.value = response.data || []
    pagination.total = response.data?.pagination?.total || 0
    pagination.current = response.data?.pagination?.page || 1
    pagination.pageSize = response.data?.pagination?.pageSize || 10
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

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD')
}

onMounted(() => {
  loadCustomers()
})
</script>

<style scoped lang="scss">
.customers-container {
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
