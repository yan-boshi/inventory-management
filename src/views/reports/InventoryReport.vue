<template>
  <div class="inventory-report-container">
    <div class="header">
      <h1>进销存明细表</h1>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="年份">
            <a-select
              v-model:value="searchParams.year"
              placeholder="请选择年份"
              style="width: 120px"
            >
              <a-select-option v-for="y in yearOptions" :key="y" :value="y">
                {{ y }}年
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="月份">
            <a-select
              v-model:value="searchParams.month"
              placeholder="全部"
              allowClear
              style="width: 120px"
            >
              <a-select-option v-for="m in 12" :key="m" :value="m">
                {{ m }}月
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch" :loading="loading">
                <template #icon><SearchOutlined /></template>
                查询
              </a-button>
              <a-button @click="handleReset">
                <template #icon><ReloadOutlined /></template>
                重置
              </a-button>
              <a-popover title="显示列" trigger="click" placement="bottomRight">
                <template #content>
                  <div class="column-settings">
                    <div v-for="col in allColumns" :key="col.key" class="column-item">
                      <a-checkbox :checked="visibleColumnKeys.includes(col.key)" @change="(e: any) => handleColumnChange(col.key, e.target.checked)">
                        {{ col.title }}
                      </a-checkbox>
                    </div>
                  </div>
                </template>
                <a-button>
                  <template #icon><SettingOutlined /></template>
                  列设置
                </a-button>
              </a-popover>
              <a-button @click="handlePrint" :disabled="reportData.length === 0">
                <template #icon><PrinterOutlined /></template>
                打印
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="filteredColumns"
        :data-source="reportData"
        :loading="loading"
        :pagination="pagination"
        rowKey="product_id"
        bordered
        size="small"
        @change="handleTableChange"
        :scroll="{ x: 1400 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'opening_stock'">
            {{ formatNumber(record.opening_stock) }}
          </template>
          <template v-else-if="column.key === 'inbound_quantity'">
            <span style="color: #52c41a">{{ formatNumber(record.inbound_quantity) }}</span>
          </template>
          <template v-else-if="column.key === 'outbound_quantity'">
            <span style="color: #ff4d4f">{{ formatNumber(record.outbound_quantity) }}</span>
          </template>
          <template v-else-if="column.key === 'closing_stock'">
            <strong>{{ formatNumber(record.closing_stock) }}</strong>
          </template>
          <template v-else-if="column.key === 'tax_included_price'">
            {{ formatMoney(record.tax_included_price) }}
          </template>
          <template v-else-if="column.key === 'tax_excluded_price'">
            {{ formatMoney(record.tax_excluded_price) }}
          </template>
          <template v-else-if="column.key === 'tax_included_amount'">
            {{ formatMoney(record.tax_included_amount) }}
          </template>
          <template v-else-if="column.key === 'tax_excluded_amount'">
            {{ formatMoney(record.tax_excluded_amount) }}
          </template>
        </template>
      </a-table>
    </a-card>

    <InventoryReportPrint
      v-model:visible="printVisible"
      :data="reportData"
      :search-params="searchParams"
      :visible-columns="visibleColumnKeys"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, PrinterOutlined, SettingOutlined } from '@ant-design/icons-vue'
import { inventoryReportApi } from '@/api/inventoryReport'
import InventoryReportPrint from '@/components/InventoryReportPrint.vue'
import type { InventoryReportItem } from '@/types'

const loading = ref(false)
const reportData = ref<InventoryReportItem[]>([])
const printVisible = ref(false)

// 列配置
const allColumns = [
  { title: '产品名称', dataIndex: 'product_name', key: 'product_name', width: 150, fixed: 'left' as const },
  { title: '产品代码', dataIndex: 'product_code', key: 'product_code', width: 120, fixed: 'left' as const },
  { title: '规格型号', dataIndex: 'model', key: 'model', width: 120 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 60, align: 'center' as const },
  { title: '期初库存', dataIndex: 'opening_stock', key: 'opening_stock', width: 100, align: 'right' as const },
  { title: '本期入库', dataIndex: 'inbound_quantity', key: 'inbound_quantity', width: 100, align: 'right' as const },
  { title: '本期出库', dataIndex: 'outbound_quantity', key: 'outbound_quantity', width: 100, align: 'right' as const },
  { title: '期末库存', dataIndex: 'closing_stock', key: 'closing_stock', width: 100, align: 'right' as const },
  { title: '含税单价', dataIndex: 'tax_included_price', key: 'tax_included_price', width: 100, align: 'right' as const },
  { title: '未税单价', dataIndex: 'tax_excluded_price', key: 'tax_excluded_price', width: 100, align: 'right' as const },
  { title: '期末金额(含税)', dataIndex: 'tax_included_amount', key: 'tax_included_amount', width: 130, align: 'right' as const },
  { title: '期末金额(未税)', dataIndex: 'tax_excluded_amount', key: 'tax_excluded_amount', width: 130, align: 'right' as const },
]

const visibleColumnKeys = ref<string[]>(allColumns.map(col => col.key))

const filteredColumns = computed(() => {
  return allColumns.filter(col => visibleColumnKeys.value.includes(col.key))
})

const handleColumnChange = (key: string, checked: boolean) => {
  if (checked) {
    if (!visibleColumnKeys.value.includes(key)) {
      visibleColumnKeys.value.push(key)
    }
  } else {
    visibleColumnKeys.value = visibleColumnKeys.value.filter(k => k !== key)
  }
}

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

const searchParams = reactive({
  year: currentYear,
  month: undefined as number | undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
  pageSizeOptions: ['10', '20', '50', '100'],
})

const formatNumber = (value: number) => {
  return value != null ? value.toLocaleString('zh-CN', { maximumFractionDigits: 4 }) : '0'
}

const formatMoney = (value: number) => {
  return value != null ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
}

const fetchReport = async () => {
  loading.value = true
  try {
    const params: { year: number; month?: number } = { year: searchParams.year }
    if (searchParams.month) {
      params.month = searchParams.month
    }
    const response = await inventoryReportApi.getReport(params)
    reportData.value = response || []
    pagination.total = reportData.value.length
  } catch (error) {
    message.error('获取报表数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  fetchReport()
}

const handleReset = () => {
  searchParams.year = currentYear
  searchParams.month = undefined
  pagination.current = 1
  fetchReport()
}

const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
}

const handlePrint = () => {
  printVisible.value = true
}

onMounted(() => {
  fetchReport()
})
</script>

<style scoped>
.inventory-report-container {
  padding: 0;
}

.header {
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.search-bar {
  margin-bottom: 16px;
}

.column-settings {
  max-height: 300px;
  overflow-y: auto;
}

.column-item {
  padding: 4px 0;
}
</style>
