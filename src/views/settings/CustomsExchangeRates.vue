<template>
  <div class="customs-exchange-rates-container">
    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="源币种">
            <a-select
              v-model:value="searchParams.source_currency"
              placeholder="全部"
              allow-clear
              style="width: 120px"
            >
              <a-select-option v-for="cur in currencyList" :key="cur.currency_code" :value="cur.currency_code">
                {{ cur.currency_code }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="目标币种">
            <a-select
              v-model:value="searchParams.target_currency"
              placeholder="全部"
              allow-clear
              style="width: 120px"
            >
              <a-select-option v-for="cur in currencyList" :key="cur.currency_code" :value="cur.currency_code">
                {{ cur.currency_code }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="生效月">
            <a-month-picker
              v-model:value="searchMonth"
              placeholder="选择月份"
              style="width: 160px"
              @change="handleMonthChange"
            />
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
                新增海关汇率
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="columns"
        :data-source="customsRates"
        :loading="loading"
        :pagination="false"
        rowKey="customs_exchange_rate_id"
        :scroll="{ y: 'calc(100vh - 300px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'rate'">
            {{ Number(record.rate).toFixed(6) }}
          </template>
          <template v-else-if="column.key === 'effective_month'">
            {{ formatMonth(record.effective_month) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
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

    <CustomsExchangeRateForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :rateData="currentRate"
      :currencyList="currencyList"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { getAllCustomsExchangeRates, deleteCustomsExchangeRate } from '@/api/customsExchangeRates'
import { getActiveCurrencies } from '@/api/currencies'
import type { CustomsExchangeRate, CustomsExchangeRateQueryParams, Currency } from '@/types'
import CustomsExchangeRateForm from '@/components/CustomsExchangeRateForm.vue'
import dayjs, { type Dayjs } from 'dayjs'

const customsRates = ref<CustomsExchangeRate[]>([])
const currencyList = ref<Currency[]>([])
const loading = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const currentRate = ref<CustomsExchangeRate | undefined>(undefined)
const searchMonth = ref<Dayjs | null>(null)

const searchParams = reactive<CustomsExchangeRateQueryParams>({
  page: 1,
  pageSize: 20,
  source_currency: undefined,
  target_currency: undefined,
  effective_month: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

const columns = [
  {
    title: '源币种',
    dataIndex: 'source_currency',
    key: 'source_currency',
    width: 100,
  },
  {
    title: '目标币种',
    dataIndex: 'target_currency',
    key: 'target_currency',
    width: 100,
  },
  {
    title: '汇率',
    dataIndex: 'rate',
    key: 'rate',
    width: 150,
  },
  {
    title: '生效月',
    dataIndex: 'effective_month',
    key: 'effective_month',
    width: 100,
  },
  {
    title: '备注',
    dataIndex: 'remarks',
    key: 'remarks',
    width: 200,
    ellipsis: true,
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
  },
]

function getFirstDayStr(date: Dayjs): string {
  return date.startOf('month').format('YYYY-MM-DD')
}

function formatMonth(dateStr: string): string {
  if (!dateStr) return ''
  return dayjs(dateStr).format('YYYY-MM')
}

const handleMonthChange = (val: Dayjs | null) => {
  searchParams.effective_month = val ? getFirstDayStr(val) : undefined
}

const loadCurrencies = async () => {
  try {
    const res = await getActiveCurrencies()
    currencyList.value = res.data || []
  } catch (error) {
    console.error('加载币种列表失败:', error)
  }
}

const loadCustomsRates = async () => {
  loading.value = true
  try {
    const response = await getAllCustomsExchangeRates(searchParams)
    customsRates.value = response.data || []
    pagination.total = response.pagination?.total || 0
    pagination.current = response.pagination?.page || 1
    pagination.pageSize = response.pagination?.pageSize || 20
  } catch (error) {
    console.error('加载海关汇率列表失败:', error)
    message.error('加载海关汇率列表失败')
    customsRates.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadCustomsRates()
}

const handleReset = () => {
  searchParams.source_currency = undefined
  searchParams.target_currency = undefined
  searchParams.effective_month = undefined
  searchMonth.value = null
  handleSearch()
}

const handlePageChange = (page: number, pageSize: number) => {
  searchParams.page = page
  searchParams.pageSize = pageSize
  loadCustomsRates()
}

const handleAdd = () => {
  isEdit.value = false
  currentRate.value = undefined
  formVisible.value = true
}

const handleEdit = (rate: CustomsExchangeRate) => {
  isEdit.value = true
  currentRate.value = rate
  formVisible.value = true
}

const handleDelete = (rate: CustomsExchangeRate) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除 ${rate.source_currency} → ${rate.target_currency} 在 ${formatMonth(rate.effective_month)} 的海关汇率吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteCustomsExchangeRate(rate.customs_exchange_rate_id)
        message.success('删除成功')
        loadCustomsRates()
      } catch (error: any) {
        message.error(error.response?.data?.message || '删除失败')
      }
    },
  })
}

const handleSuccess = () => {
  loadCustomsRates()
}

onMounted(() => {
  loadCurrencies()
  loadCustomsRates()
})
</script>

<style scoped lang="scss">
.customs-exchange-rates-container {
  padding: 16px;

  .search-bar {
    margin-bottom: 8px;
  }
}
</style>
