<template>
  <div class="payment-methods-container">
    <div class="header">
      <h1>结算方式管理</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增结算方式
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="结算方式名称">
            <a-input
              v-model:value="searchParams.name"
              placeholder="请输入结算方式名称"
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
        :data-source="paymentMethods"
        :loading="loading"
        :pagination="false"
        rowKey="payment_method_id"
        :scroll="{ y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'created_at'">
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

    <PaymentMethodForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :paymentMethodData="currentPaymentMethod"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { paymentMethodsApi } from '@/api/paymentMethods'
import type { PaymentMethod, PaymentMethodQueryParams } from '@/types'
import PaymentMethodForm from '@/components/PaymentMethodForm.vue'
import { formatDate } from '@/utils/date'
import dayjs from 'dayjs'

const paymentMethods = ref<PaymentMethod[]>([])
const loading = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const currentPaymentMethod = ref<PaymentMethod | undefined>(undefined)

const searchParams = reactive<PaymentMethodQueryParams>({
  page: 1,
  pageSize: 100,
  name: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 100,
  total: 0,
})

const columns = [
  {
    title: '结算方式名称',
    dataIndex: 'payment_method_name',
    key: 'payment_method_name',
    width: 200,
  },
  {
    title: '备注',
    dataIndex: 'remarks',
    key: 'remarks',
    width: 300,
    ellipsis: true,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 120,
    customRender: ({ text }: { text: string }) => formatDate(text),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
  },
]

const loadPaymentMethods = async () => {
  loading.value = true
  try {
    const response = await paymentMethodsApi.getAll(searchParams)
    paymentMethods.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载结算方式列表失败:', error)
    message.error('加载结算方式列表失败')
    paymentMethods.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadPaymentMethods()
}

const handleReset = () => {
  searchParams.name = ''
  handleSearch()
}

const handlePageChange = (page: number, pageSize: number) => {
  searchParams.page = page
  searchParams.pageSize = pageSize
  loadPaymentMethods()
}

const handleAdd = () => {
  isEdit.value = false
  currentPaymentMethod.value = undefined
  formVisible.value = true
}

const handleEdit = (paymentMethod: PaymentMethod) => {
  isEdit.value = true
  currentPaymentMethod.value = paymentMethod
  formVisible.value = true
}

const handleDelete = (paymentMethod: PaymentMethod) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除结算方式 ${paymentMethod.payment_method_name} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await paymentMethodsApi.delete(paymentMethod.payment_method_id)
        message.success('删除成功')
        loadPaymentMethods()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleSuccess = () => {
  loadPaymentMethods()
}

onMounted(() => {
  loadPaymentMethods()
})
</script>

<style scoped lang="scss">
.payment-methods-container {
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
