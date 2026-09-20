<template>
  <div class="invoices-page">
    <div class="page-header">
      <h1>发票查询</h1>
      <a-button type="primary" @click="showCreateModal"> <PlusOutlined /> 新建发票 </a-button>
    </div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <a-form layout="inline" :model="queryParams">
        <a-form-item label="发票号">
          <a-input
            v-model:value="queryParams.invoiceNumber"
            placeholder="请输入发票号"
            allow-clear
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="SO.号">
          <a-input
            v-model:value="queryParams.soNumber"
            placeholder="请输入SO.号"
            allow-clear
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="买方公司">
          <a-input
            v-model:value="queryParams.buyerName"
            placeholder="请输入买方公司"
            allow-clear
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="开票日期">
          <a-range-picker
            v-model:value="dateRange"
            format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch"> <SearchOutlined /> 搜索 </a-button>
            <a-button @click="handleReset"> <ReloadOutlined /> 重置 </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="invoiceList"
      :loading="loading"
      :pagination="pagination"
      @change="handleTableChange"
      row-key="invoice_id"
      :scroll="{ x: 1000 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'invoice_number'">
          <a @click="handleViewDetail(record)">{{ record.invoice_number }}</a>
        </template>
        <template v-if="column.key === 'total_value'">
          {{ formatMoney(record.total_value) }}
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="handleViewDetail(record)"> 查看 </a-button>
            <a-button type="link" size="small" @click="handlePrint(record)"> 打印 </a-button>
            <a-popconfirm title="确定要删除这个发票吗？" @confirm="handleDelete(record.invoice_id)">
              <a-button type="link" size="small" danger> 删除 </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新建发票弹窗 -->
    <InvoiceForm v-model:visible="createFormVisible" @success="handleCreateSuccess" />

    <!-- 发票详情弹窗 -->
    <a-modal v-model:open="detailVisible" title="发票详情" width="900px" :footer="null">
      <div v-if="currentRecord" class="invoice-detail">
        <div class="detail-header">
          <h2>{{ currentRecord.invoice_number }}</h2>
          <p>开票日期：{{ currentRecord.invoice_date }}</p>
        </div>

        <a-descriptions bordered :column="2">
          <a-descriptions-item label="SO.号">{{
            currentRecord.so_number || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="成交方式">{{
            currentRecord.trade_terms
          }}</a-descriptions-item>
          <a-descriptions-item label="卖方公司">{{
            currentRecord.seller_name
          }}</a-descriptions-item>
          <a-descriptions-item label="买方公司">{{ currentRecord.buyer_name }}</a-descriptions-item>
          <a-descriptions-item label="卖方联系人">{{
            currentRecord.seller_contact || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="买方联系人">{{
            currentRecord.buyer_contact || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="卖方地址" :span="2">{{
            currentRecord.seller_address || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="买方地址" :span="2">{{
            currentRecord.buyer_address || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="卖方电话">{{
            currentRecord.seller_phone || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="买方电话">{{
            currentRecord.buyer_phone || '-'
          }}</a-descriptions-item>
        </a-descriptions>

        <h3 style="margin: 16px 0 8px">商品明细</h3>
        <a-table
          :columns="itemColumns"
          :data-source="parseInvoiceItems(currentRecord.invoice_items)"
          :pagination="false"
          row-key="no"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'total_value'">
              {{ formatMoney(record.total_value) }}
            </template>
          </template>
        </a-table>

        <div class="detail-footer">
          <p>
            <strong>总金额：{{ formatMoney(currentRecord.total_value) }}</strong>
          </p>
        </div>

        <h3 style="margin: 16px 0 8px">银行信息</h3>
        <a-descriptions bordered :column="1">
          <a-descriptions-item label="收款银行">{{
            currentRecord.bank_name || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="银行地址">{{
            currentRecord.bank_address || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="SWIFT代码">{{
            currentRecord.swift_code || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="收款人名称">{{
            currentRecord.beneficiary_name || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="收款人地址">{{
            currentRecord.beneficiary_address || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="账号">{{
            currentRecord.account_number || '-'
          }}</a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue'
import { invoicesApi, type Invoice, type InvoiceQueryParams } from '@/api/invoices'
import InvoiceForm from '@/components/InvoiceForm.vue'
import dayjs from 'dayjs'

const loading = ref(false)
const invoiceList = ref<Invoice[]>([])
const createFormVisible = ref(false)
const detailVisible = ref(false)
const currentRecord = ref<Invoice | null>(null)
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

const queryParams = reactive<InvoiceQueryParams>({
  page: 1,
  pageSize: 10,
  invoiceNumber: '',
  soNumber: '',
  buyerName: '',
  startDate: '',
  endDate: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

// 动态生成筛选选项
const buyerNameFilters = ref<{ text: string; value: string }[]>([])
const tradeTermsFilters = ref<{ text: string; value: string }[]>([])

// 从数据中提取筛选选项
const extractFilterOptions = (data: Invoice[]) => {
  const buyerNames = new Set<string>()
  const tradeTerms = new Set<string>()

  data.forEach((item) => {
    if (item.buyer_name) {
      buyerNames.add(item.buyer_name)
    }
    if (item.trade_terms) {
      tradeTerms.add(item.trade_terms)
    }
  })

  buyerNameFilters.value = Array.from(buyerNames).map((name) => ({
    text: name,
    value: name,
  }))

  tradeTermsFilters.value = Array.from(tradeTerms).map((term) => ({
    text: term,
    value: term,
  }))
}

const columns = computed(() => [
  {
    title: '发票号',
    dataIndex: 'invoice_number',
    key: 'invoice_number',
    width: 130,
  },
  {
    title: 'SO.号',
    dataIndex: 'so_number',
    key: 'so_number',
    width: 130,
  },
  {
    title: '开票日期',
    dataIndex: 'invoice_date',
    key: 'invoice_date',
    width: 110,
  },
  {
    title: '买方公司',
    dataIndex: 'buyer_name',
    key: 'buyer_name',
    width: 180,
    ellipsis: true,
    filters: buyerNameFilters.value,
    filterMultiple: true,
    onFilter: (value: string, record: Invoice) => record.buyer_name === value,
  },
  {
    title: '成交方式',
    dataIndex: 'trade_terms',
    key: 'trade_terms',
    width: 110,
    filters: tradeTermsFilters.value,
    filterMultiple: true,
    onFilter: (value: string, record: Invoice) => record.trade_terms === value,
  },
  {
    title: '总金额',
    dataIndex: 'total_value',
    key: 'total_value',
    width: 120,
    align: 'right' as const,
  },
  {
    title: '操作',
    key: 'action',
    width: 160,
    fixed: 'right' as const,
  },
])

const itemColumns = [
  {
    title: '序号',
    dataIndex: 'no',
    key: 'no',
    width: 60,
  },
  {
    title: '商品名称',
    dataIndex: 'product_name',
    key: 'product_name',
  },
  {
    title: '产品描述',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
  },
  {
    title: '单位',
    dataIndex: 'unit',
    key: 'unit',
    width: 80,
  },
  {
    title: '单价',
    dataIndex: 'unit_value',
    key: 'unit_value',
    width: 100,
  },
  {
    title: '金额',
    dataIndex: 'total_value',
    key: 'total_value',
    width: 120,
  },
]

const loadInvoices = async () => {
  loading.value = true
  try {
    const response = await invoicesApi.getAll(queryParams)
    const data = response as any
    invoiceList.value = data.data || []
    pagination.total = data.pagination?.total || 0

    // 提取筛选选项
    extractFilterOptions(invoiceList.value)
  } catch (error) {
    console.error('加载发票列表失败:', error)
    message.error('加载发票列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.page = 1
  pagination.current = 1
  loadInvoices()
}

const handleReset = () => {
  queryParams.invoiceNumber = ''
  queryParams.soNumber = ''
  queryParams.buyerName = ''
  queryParams.startDate = ''
  queryParams.endDate = ''
  dateRange.value = null
  handleSearch()
}

const handleDateChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
  if (dates) {
    queryParams.startDate = dates[0].format('YYYY-MM-DD')
    queryParams.endDate = dates[1].format('YYYY-MM-DD')
  } else {
    queryParams.startDate = ''
    queryParams.endDate = ''
  }
}

const handleTableChange = (pag: any, filters: any) => {
  queryParams.page = pag.current
  queryParams.pageSize = pag.pageSize
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadInvoices()
}

const showCreateModal = () => {
  createFormVisible.value = true
}

const handleCreateSuccess = () => {
  createFormVisible.value = false
  loadInvoices()
}

const handleViewDetail = (record: Invoice) => {
  currentRecord.value = record
  detailVisible.value = true
}

const handlePrint = (record: Invoice) => {
  // 打印功能
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const items = parseInvoiceItems(record.invoice_items)

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>发票 - ${record.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header h2 { margin: 5px 0 0; font-size: 20px; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .parties { display: flex; gap: 20px; margin-bottom: 20px; }
        .party { flex: 1; border: 1px solid #ccc; padding: 10px; }
        .party h3 { margin: 0 0 10px; font-size: 14px; }
        .party p { margin: 5px 0; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f5f5f5; }
        .total { text-align: right; font-weight: bold; font-size: 14px; }
        .bank-section { margin-top: 20px; }
        .bank-section h3 { margin-bottom: 10px; }
        .bank-section p { margin: 5px 0; font-size: 12px; }
        .signature { margin-top: 40px; text-align: right; }
        .signature-box { display: inline-block; width: 200px; height: 100px; border: 1px dashed #ccc; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Commercial Invoice</h1>
        <h2>商业发票</h2>
      </div>
      <div class="info-section">
        <div></div>
        <div>
          <p><strong>Invoice No.:</strong> ${record.invoice_number}</p>
          <p><strong>SO.:</strong> ${record.so_number || '-'}</p>
          <p><strong>Date:</strong> ${record.invoice_date}</p>
        </div>
      </div>
      <div class="parties">
        <div class="party">
          <h3>Seller(卖方公司):</h3>
          <p>${record.seller_name}</p>
          <p>Contact person: ${record.seller_contact || '-'}</p>
          <p>Address: ${record.seller_address || '-'}</p>
          <p>Phone: ${record.seller_phone || '-'}</p>
        </div>
        <div class="party">
          <h3>Buyer(买方公司):</h3>
          <p>${record.buyer_name}</p>
          <p>Contact person: ${record.buyer_contact || '-'}</p>
          <p>Address: ${record.buyer_address || '-'}</p>
          <p>Phone: ${record.buyer_phone || '-'}</p>
        </div>
      </div>
      <p><strong>Trade terms:</strong> ${record.trade_terms}</p>
      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Name of goods</th>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Unit value</th>
            <th>Total value</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item: any) => `
            <tr>
              <td>${item.no}</td>
              <td>${item.product_name}</td>
              <td>${item.description || '-'}</td>
              <td>${item.quantity}</td>
              <td>${item.unit}</td>
              <td>${item.unit_value}</td>
              <td>${item.total_value}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <p class="total">Total value: ${record.total_value}</p>
      <div class="bank-section">
        <h3>Bank Information:</h3>
        <p><strong>Beneficiary Bank:</strong> ${record.bank_name || '-'}</p>
        <p>${record.bank_address || '-'}</p>
        <p><strong>SWIFT:</strong> ${record.swift_code || '-'}</p>
        <p><strong>Beneficiary:</strong> ${record.beneficiary_name || '-'}</p>
        <p><strong>Address:</strong> ${record.beneficiary_address || '-'}</p>
        <p><strong>Account No.:</strong> ${record.account_number || '-'}</p>
      </div>
      <div class="signature">
        <p>Seller's signature/chop</p>
        <div class="signature-box"></div>
      </div>
    </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

const handleDelete = async (id: string) => {
  try {
    await invoicesApi.delete(id)
    message.success('删除成功')
    loadInvoices()
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}

const parseInvoiceItems = (items: string | any[]) => {
  if (typeof items === 'string') {
    try {
      return JSON.parse(items)
    } catch {
      return []
    }
  }
  return items || []
}

const formatMoney = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return (num || 0).toFixed(2)
}

onMounted(() => {
  loadInvoices()
})
</script>

<style scoped lang="scss">
.invoices-page {
  padding: 16px;
  background: #fff;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h1 {
    margin: 0;
    font-size: 20px;
  }
}

.search-section {
  margin-bottom: 16px;
  padding: 20px;
  background: #fafafa;
  border-radius: 4px;
}

.invoice-detail {
  .detail-header {
    margin-bottom: 20px;

    h2 {
      margin: 0 0 5px;
    }

    p {
      margin: 0;
      color: #666;
    }
  }

  .detail-footer {
    margin-top: 16px;
    text-align: right;
    font-size: 16px;
  }
}
</style>
