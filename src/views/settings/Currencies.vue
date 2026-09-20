<template>
  <div class="currencies-container">
    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="币种代码">
            <a-input
              v-model:value="searchParams.currency_code"
              placeholder="请输入币种代码"
              allow-clear
              style="width: 150px"
            />
          </a-form-item>
          <a-form-item label="币种名称">
            <a-input
              v-model:value="searchParams.currency_name"
              placeholder="请输入币种名称"
              allow-clear
              style="width: 150px"
            />
          </a-form-item>
          <a-form-item label="状态">
            <a-select
              v-model:value="searchParams.is_active"
              placeholder="全部"
              allow-clear
              style="width: 100px"
            >
              <a-select-option :value="1">启用</a-select-option>
              <a-select-option :value="0">停用</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch">
                <SearchOutlined /> 查询
              </a-button>
              <a-button @click="handleReset">
                <ReloadOutlined /> 重置
              </a-button>
              <a-button type="primary" @click="handleAdd">
                <template #icon><PlusOutlined /></template>
                新增币种
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="columns"
        :data-source="currencies"
        :loading="loading"
        :pagination="false"
        rowKey="currency_id"
        :scroll="{ y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'is_base_currency'">
            <a-tag :color="record.is_base_currency ? 'green' : 'default'">
              {{ record.is_base_currency ? '是' : '否' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'is_active'">
            <a-tag :color="record.is_active ? 'blue' : 'default'">
              {{ record.is_active ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
              <a-button
                type="link"
                size="small"
                danger
                :disabled="record.is_base_currency === 1"
                @click="handleDelete(record)"
              >
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

    <CurrencyForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :currencyData="currentCurrency"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { getAllCurrencies, deleteCurrency } from '@/api/currencies'
import type { Currency, CurrencyQueryParams } from '@/types'
import CurrencyForm from '@/components/CurrencyForm.vue'

const currencies = ref<Currency[]>([])
const loading = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const currentCurrency = ref<Currency | undefined>(undefined)

const searchParams = reactive<CurrencyQueryParams>({
  page: 1,
  pageSize: 20,
  currency_code: '',
  currency_name: '',
  is_active: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

const columns = [
  {
    title: '币种代码',
    dataIndex: 'currency_code',
    key: 'currency_code',
    width: 100,
  },
  {
    title: '币种名称',
    dataIndex: 'currency_name',
    key: 'currency_name',
    width: 120,
  },
  {
    title: '符号',
    dataIndex: 'currency_symbol',
    key: 'currency_symbol',
    width: 80,
  },
  {
    title: '小数位数',
    dataIndex: 'decimal_places',
    key: 'decimal_places',
    width: 100,
  },
  {
    title: '基础币种',
    dataIndex: 'is_base_currency',
    key: 'is_base_currency',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 80,
  },
  {
    title: '排序',
    dataIndex: 'sort_order',
    key: 'sort_order',
    width: 80,
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
  },
]

const loadCurrencies = async () => {
  loading.value = true
  try {
    const response = await getAllCurrencies(searchParams)
    currencies.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 20
  } catch (error) {
    console.error('加载币种列表失败:', error)
    message.error('加载币种列表失败')
    currencies.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadCurrencies()
}

const handleReset = () => {
  searchParams.currency_code = ''
  searchParams.currency_name = ''
  searchParams.is_active = undefined
  handleSearch()
}

const handlePageChange = (page: number, pageSize: number) => {
  searchParams.page = page
  searchParams.pageSize = pageSize
  loadCurrencies()
}

const handleAdd = () => {
  isEdit.value = false
  currentCurrency.value = undefined
  formVisible.value = true
}

const handleEdit = (currency: Currency) => {
  isEdit.value = true
  currentCurrency.value = currency
  formVisible.value = true
}

const handleDelete = (currency: Currency) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除币种 ${currency.currency_name}（${currency.currency_code}）吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteCurrency(currency.currency_id)
        message.success('删除成功')
        loadCurrencies()
      } catch (error: any) {
        message.error(error.response?.data?.message || '删除失败')
      }
    },
  })
}

const handleSuccess = () => {
  loadCurrencies()
}

onMounted(() => {
  loadCurrencies()
})
</script>

<style scoped lang="scss">
.currencies-container {
  padding: 16px;

  .search-bar {
    margin-bottom: 8px;
  }
}
</style>
