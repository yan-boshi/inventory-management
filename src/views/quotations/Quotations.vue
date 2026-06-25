<template>
  <div class="quotations-container">
    <div class="header">
      <h1>报价单</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增报价单
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="报价单号">
            <a-input
              v-model:value="searchParams.quotationNumber"
              placeholder="请输入报价单号"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="客户名称">
            <a-input
              v-model:value="searchParams.customerName"
              placeholder="请输入客户名称"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="客户代码">
            <a-input
              v-model:value="searchParams.customerCode"
              placeholder="请输入客户代码"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="报价日期">
            <a-range-picker
              v-model:value="dateRange"
              @change="handleDateRangeChange"
              style="width: 260px"
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
        :data-source="quotations"
        :loading="loading"
        :pagination="pagination"
        rowKey="quotation_id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'quotation_number'">
            <a @click="handleViewDetail(record)">{{ record.quotation_number || '-' }}</a>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'created_at'">
            {{ formatDate(record.created_at) }}
          </template>

          <template v-else-if="column.key === 'entry_date'">
            {{ formatDate(record.entry_date) }}
          </template>

          <template v-else-if="column.key === 'tax_included_amount'">
            <span style="color: #f5222d; font-weight: 500">
              {{ record.tax_included_amount }}
            </span>
          </template>

          <template v-else-if="column.key === 'currency'">
            {{ record.currency || 'CNY' }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleEdit(record)"> 编辑 </a-button>
              <a-button type="link" size="small" @click="handleConvertToSales(record)">
                销售
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
              <!-- <a-dropdown>
                <a-button type="link" size="small"> 打印 <DownOutlined /> </a-button>
                <template #overlay>
                  <a-menu @click="({ key }) => handlePrint(record, key)">
                    <a-menu-item key="zh">中文版</a-menu-item>
                    <a-menu-item key="en">English</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown> -->
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <QuotationForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :quotationData="currentQuotation"
      @success="handleSuccess"
      @print="handlePrintFromForm"
      @convert="handleConvertFromForm"
    />

    <QuotationPrint
      v-model:visible="printVisible"
      :quotation="currentQuotation"
      :printData="printData"
    />

    <QuotationPrintEn
      v-model:visible="printEnVisible"
      :quotation="currentQuotation"
      :printData="printData"
    />

    <SalesOrderForm
      v-model:visible="salesOrderFormVisible"
      :isEdit="false"
      :salesOrderData="salesOrderData"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import { quotationsApi } from '@/api/quotations'
import { customersApi } from '@/api/customers'
import type { Quotation, QuotationQueryParams } from '@/types'
import QuotationForm from '@/components/QuotationForm.vue'
import QuotationPrint from '@/components/QuotationPrint.vue'
import QuotationPrintEn from '@/components/QuotationPrintEn.vue'
import SalesOrderForm from '@/components/SalesOrderForm.vue'
import dayjs from 'dayjs'

const quotations = ref<Quotation[]>([])
const loading = ref(false)
const formVisible = ref(false)
const printVisible = ref(false)
const printEnVisible = ref(false)
const isEdit = ref(false)
const currentQuotation = ref<Quotation | undefined>(undefined)
const printData = ref<any>(undefined)
const dateRange = ref<[any, any] | undefined>(undefined)
const salesOrderFormVisible = ref(false)
const salesOrderData = ref<any>(undefined)

const searchParams = reactive<QuotationQueryParams>({
  page: 1,
  pageSize: 10,
  customerName: '',
  customerCode: '',
  quotationNumber: '',
  startDate: '',
  endDate: '',
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
    title: '报价编号',
    dataIndex: 'quotation_number',
    key: 'quotation_number',
    width: 180,
  },
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
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    align: 'center',
  },
  {
    title: '录入日期',
    dataIndex: 'entry_date',
    key: 'entry_date',
    width: 80,
  },
  {
    title: '含税总价',
    key: 'tax_included_amount',
    width: 120,
    align: 'right',
  },
  {
    title: '币种',
    key: 'currency',
    width: 100,
    align: 'center',
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
  },
]

const loadQuotations = async () => {
  loading.value = true
  try {
    const response = await quotationsApi.getAll(searchParams)
    quotations.value = response.data || []
    pagination.total = response.data?.pagination?.total || 0
    pagination.current = response.data?.pagination?.page || 1
    pagination.pageSize = response.data?.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载报价单失败:', error)
    message.error('加载报价单失败')
    quotations.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadQuotations()
}

const handleReset = () => {
  searchParams.quotationNumber = ''
  searchParams.customerName = ''
  searchParams.customerCode = ''
  searchParams.startDate = ''
  searchParams.endDate = ''
  dateRange.value = undefined
  handleSearch()
}

const handleDateRangeChange = (dates: [any, any]) => {
  if (dates && dates[0] && dates[1]) {
    searchParams.startDate = dates[0].format('YYYY-MM-DD')
    searchParams.endDate = dates[1].format('YYYY-MM-DD')
  } else {
    searchParams.startDate = ''
    searchParams.endDate = ''
  }
}

const handleTableChange = (pag: any) => {
  searchParams.page = pag.current
  searchParams.pageSize = pag.pageSize
  loadQuotations()
}

const handleAdd = () => {
  isEdit.value = false
  currentQuotation.value = undefined
  formVisible.value = true
}

const handleEdit = async (quotation: Quotation) => {
  isEdit.value = true
  currentQuotation.value = quotation
  formVisible.value = true
}

const handleViewDetail = async (quotation: Quotation) => {
  isEdit.value = true
  try {
    const detail = await quotationsApi.getById(quotation.quotation_id)
    currentQuotation.value = detail.data
    formVisible.value = true
  } catch (error) {
    message.error('获取报价单详情失败')
  }
}

const handleDelete = (quotation: Quotation) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除报价单 ${quotation.quotation_number} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await quotationsApi.delete(quotation.quotation_id)
        message.success('删除成功')
        loadQuotations()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleSuccess = () => {
  loadQuotations()
}

const handlePrint = async (quotation: Quotation, lang: 'zh' | 'en' = 'zh') => {
  try {
    const detail = await quotationsApi.getById(quotation.quotation_id)
    currentQuotation.value = detail.data
    printData.value = {
      quotation_number: detail.data.quotation_number,
      customer_name: detail.data.customer_name,
      customer_code: detail.data.customer_code,
      quotation_items: detail.data.quotation_items || [],
      validity_period: detail.data.validity_period,
      delivery_method: detail.data.delivery_method,
      tax_rate: detail.data.tax_rate,
    }
    if (lang === 'en') {
      printEnVisible.value = true
    } else {
      printVisible.value = true
    }
  } catch (error) {
    message.error('获取报价单详情失败')
  }
}

const handlePrintFromForm = (data: any) => {
  printData.value = data
  printVisible.value = true
}

const handleConvertToSales = async (quotation: Quotation) => {
  try {
    console.log('quotation', quotation)
    const response = await quotationsApi.getById(quotation.quotation_id)
    const detail = response.data
    console.log('detail', detail)
    const items =
      typeof detail.quotation_items === 'string'
        ? JSON.parse(detail.quotation_items)
        : detail.quotation_items
    console.log('items', items)
    const salesItems = items.map((item: any) => ({
      no: item.no,
      business_category: '',
      product_name: item.product_name,
      model: item.model || '',
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity,
      tax_rate: detail.tax_rate,
      tax_included_price: item.unit_price,
      tax_excluded_price: Number(item.unit_price) * (1 - Number(detail.tax_rate) / 100),
      tax_included_amount: Number(item.unit_price) * Number(item.quantity),
      tax_excluded_amount:
        Number(item.unit_price) * (1 - Number(detail.tax_rate) / 100) * Number(item.quantity),
      tax_amount:
        ((Number(item.unit_price) * Number(detail.tax_rate)) / 100) * Number(item.quantity),
      status: 1,
      remarks: item.remarks || '',
      product_code: item.product_code || '',
    }))

    salesOrderData.value = {
      quotation_number: detail.quotation_number,
      contract_number: '',
      customer_name: detail.customer_name,
      customer_code: detail.customer_code,
      payment_method: '',
      sales_items: salesItems,
      delivery_date: dayjs().format('YYYY-MM-DD'),
      currency: detail.currency || 'CNY',
      status: '1',
      tax_included_amount: detail.tax_included_amount,
      remarks: '',
    }

    salesOrderFormVisible.value = true
  } catch (error) {
    console.error('转换报价单失败:', error)
    message.error('转换报价单失败')
  }
}

const handleConvertFromForm = (data: any) => {
  const {
    quotation_number,
    customer_name,
    customer_code,
    quotation_items,
    tax_rate,
    currency,
    isRowConvert,
  } = data

  // 根据是否为行级别转换，准备商品数据
  let salesItems
  let orderNumber

  if (isRowConvert) {
    // 行级别转换：单据编号为报价单单据编号-行编号
    orderNumber = `${quotation_number}-${quotation_items[0].no}`
    salesItems = [quotation_items[0]] // 只取当前行
  } else {
    // 整单转换：单据编号为报价单单据编号
    orderNumber = quotation_number
    salesItems = quotation_items.map((item: any) => ({
      no: item.no,
      business_category: '',
      product_name: item.product_name,
      model: item.model || '',
      description: item.description || '',
      unit: item.unit || '',
      quantity: item.quantity,
      tax_rate: tax_rate || 13,
      tax_included_price: item.unit_price || 0,
      tax_excluded_price: 0,
      tax_included_amount: item.total_amount || 0,
      tax_excluded_amount: 0,
      tax_amount: 0,
      status: 1,
      remarks: item.remarks || '',
      product_code: '',
    }))
  }

  const totalTaxIncludedAmount = salesItems.reduce(
    (sum: number, item: any) => sum + (item.tax_included_amount || 0),
    0
  )

  salesOrderData.value = {
    quotation_number,
    contract_number: '',
    customer_name,
    customer_code,
    payment_method: '',
    sales_items: salesItems,
    sales_date: dayjs().format('YYYY-MM-DD'),
    currency: currency || 'CNY',
    exchange_rate: 1,
    delivery_date: '',
    remarks: '',
  }

  salesOrderFormVisible.value = true
}

const getStatusColor = (status: number) => {
  const colorMap: Record<number, string> = {
    1: 'blue',
    2: 'green',
    3: 'orange',
    4: 'red',
  }
  return colorMap[status] || 'default'
}

const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: '报价中',
    2: '全部销售',
    3: '部分销售',
    4: '已取消',
  }
  return textMap[status] || '-'
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return dayjs(dateString).format('YYYY-MM-DD')
}

onMounted(() => {
  loadQuotations()
})
</script>

<style scoped lang="scss">
.quotations-container {
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
