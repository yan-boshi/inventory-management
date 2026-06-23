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
                    <div class="column-group">
                      <div class="group-title">基础信息</div>
                      <div v-for="col in basicColumns" :key="col.key" class="column-item">
                        <a-checkbox :checked="visibleColumnKeys.includes(col.key)" @change="(e: any) => handleColumnChange(col.key, e.target.checked)">
                          {{ col.title }}
                        </a-checkbox>
                      </div>
                    </div>
                    <div class="column-group">
                      <div class="group-title">期初</div>
                      <div v-for="col in openingColumns" :key="col.key" class="column-item">
                        <a-checkbox :checked="visibleColumnKeys.includes(col.key)" @change="(e: any) => handleColumnChange(col.key, e.target.checked)">
                          {{ col.title }}
                        </a-checkbox>
                      </div>
                    </div>
                    <div class="column-group">
                      <div class="group-title">本期入库</div>
                      <div v-for="col in inboundColumns" :key="col.key" class="column-item">
                        <a-checkbox :checked="visibleColumnKeys.includes(col.key)" @change="(e: any) => handleColumnChange(col.key, e.target.checked)">
                          {{ col.title }}
                        </a-checkbox>
                      </div>
                    </div>
                    <div class="column-group">
                      <div class="group-title">本期出库</div>
                      <div v-for="col in outboundColumns" :key="col.key" class="column-item">
                        <a-checkbox :checked="visibleColumnKeys.includes(col.key)" @change="(e: any) => handleColumnChange(col.key, e.target.checked)">
                          {{ col.title }}
                        </a-checkbox>
                      </div>
                    </div>
                    <div class="column-group">
                      <div class="group-title">结余</div>
                      <div v-for="col in closingColumns" :key="col.key" class="column-item">
                        <a-checkbox :checked="visibleColumnKeys.includes(col.key)" @change="(e: any) => handleColumnChange(col.key, e.target.checked)">
                          {{ col.title }}
                        </a-checkbox>
                      </div>
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
        :scroll="{ x: 2800 }"
      >
        <template #bodyCell="{ column, record }">
          <!-- 数量列 -->
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
          <!-- 单价列 -->
          <template v-else-if="column.key.includes('_price')">
            {{ formatMoney(record[column.key]) }}
          </template>
          <!-- 金额列 -->
          <template v-else-if="column.key.includes('_amount')">
            {{ formatMoney(record[column.key]) }}
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
  { title: '产品名称', dataIndex: 'product_name', key: 'product_name', width: 120, fixed: 'left' as const },
  { title: '产品代码', dataIndex: 'product_code', key: 'product_code', width: 100, fixed: 'left' as const },
  { title: '规格型号', dataIndex: 'model', key: 'model', width: 100 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 50, align: 'center' as const },
  // 期初
  { title: '期初数量', dataIndex: 'opening_stock', key: 'opening_stock', width: 80, align: 'right' as const },
  { title: '期初含税单价', dataIndex: 'opening_stock_included_price', key: 'opening_stock_included_price', width: 100, align: 'right' as const },
  { title: '期初未税单价', dataIndex: 'opening_stock_excluded_price', key: 'opening_stock_excluded_price', width: 100, align: 'right' as const },
  { title: '期初含税金额', dataIndex: 'opening_stock_included_amount', key: 'opening_stock_included_amount', width: 100, align: 'right' as const },
  { title: '期初未税金额', dataIndex: 'opening_stock_excluded_amount', key: 'opening_stock_excluded_amount', width: 100, align: 'right' as const },
  // 本期入库
  { title: '入库数量', dataIndex: 'inbound_quantity', key: 'inbound_quantity', width: 80, align: 'right' as const },
  { title: '入库含税单价', dataIndex: 'inbound_included_price', key: 'inbound_included_price', width: 100, align: 'right' as const },
  { title: '入库未税单价', dataIndex: 'inbound_excluded_price', key: 'inbound_excluded_price', width: 100, align: 'right' as const },
  { title: '入库含税金额', dataIndex: 'inbound_included_amount', key: 'inbound_included_amount', width: 100, align: 'right' as const },
  { title: '入库未税金额', dataIndex: 'inbound_excluded_amount', key: 'inbound_excluded_amount', width: 100, align: 'right' as const },
  // 本期出库
  { title: '出库数量', dataIndex: 'outbound_quantity', key: 'outbound_quantity', width: 80, align: 'right' as const },
  { title: '出库含税单价', dataIndex: 'outbound_included_price', key: 'outbound_included_price', width: 100, align: 'right' as const },
  { title: '出库未税单价', dataIndex: 'outbound_excluded_price', key: 'outbound_excluded_price', width: 100, align: 'right' as const },
  { title: '出库含税金额', dataIndex: 'outbound_included_amount', key: 'outbound_included_amount', width: 100, align: 'right' as const },
  { title: '出库未税金额', dataIndex: 'outbound_excluded_amount', key: 'outbound_excluded_amount', width: 100, align: 'right' as const },
  // 结余
  { title: '结余数量', dataIndex: 'closing_stock', key: 'closing_stock', width: 80, align: 'right' as const },
  { title: '结余含税单价', dataIndex: 'closing_stock_included_price', key: 'closing_stock_included_price', width: 100, align: 'right' as const },
  { title: '结余未税单价', dataIndex: 'closing_stock_excluded_price', key: 'closing_stock_excluded_price', width: 100, align: 'right' as const },
  { title: '结余含税金额', dataIndex: 'closing_stock_included_amount', key: 'closing_stock_included_amount', width: 100, align: 'right' as const },
  { title: '结余未税金额', dataIndex: 'closing_stock_excluded_amount', key: 'closing_stock_excluded_amount', width: 100, align: 'right' as const },
]

const visibleColumnKeys = ref<string[]>(
  allColumns
    .filter(col => !col.key.includes('_excluded_'))
    .map(col => col.key)
)

// 分组列配置
const basicColumns = allColumns.filter(col => ['product_name', 'product_code', 'model', 'unit'].includes(col.key))
const openingColumns = allColumns.filter(col => col.key.startsWith('opening_'))
const inboundColumns = allColumns.filter(col => col.key.startsWith('inbound_'))
const outboundColumns = allColumns.filter(col => col.key.startsWith('outbound_'))
const closingColumns = allColumns.filter(col => col.key.startsWith('closing_'))

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
    reportData.value = response.data || []
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
  max-height: 400px;
  overflow-y: auto;
  min-width: 200px;
}

.column-group {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  .group-title {
    font-weight: bold;
    color: #1890ff;
    margin-bottom: 4px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e8e8e8;
  }
}

.column-item {
  padding: 2px 0;
}
</style>
