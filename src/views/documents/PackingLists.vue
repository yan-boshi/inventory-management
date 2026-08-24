<template>
  <div class="packing-lists-container">
    <div class="page-header">
      <h1>装箱单查询</h1>
      <a-button type="primary" @click="handleCreateNew">
        <PlusOutlined />
        新建装箱单
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="装箱单号">
            <a-input
              v-model:value="searchParams.packingNo"
              placeholder="请输入装箱单号"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="装箱日期">
            <a-range-picker v-model:value="dateRange" @change="handleDateRangeChange" />
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
        :data-source="packingLists"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        rowKey="packing_list_id"
        :scroll="{ x: 1500 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'packing_no'">
            <a @click="handleViewDetail(record)">{{ record.packing_no }}</a>
          </template>

          <template v-else-if="column.key === 'packing_date'">
            {{ formatDate(record.packing_date) }}
          </template>

          <template v-else-if="column.key === 'packing_items'">
            {{ getItemCount(record.packing_items) }} 项
          </template>

          <template v-else-if="column.key === 'created_at'">
            {{ formatDateTime(record.created_at) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleViewDetail(record)"> 查看 </a-button>
              <a-popconfirm
                title="确定要删除这个装箱单吗？"
                @confirm="handleDelete(record)"
                okText="确定"
                cancelText="取消"
              >
                <a-button type="link" size="small" danger> 删除 </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 装箱单详情弹窗 -->
    <a-modal v-model:open="detailVisible" title="装箱单详情" width="900px" :footer="null">
      <div v-if="currentRecord" class="packing-list-detail">
        <div class="detail-header">
          <h2>{{ currentRecord.title_en || 'Packing List' }}</h2>
          <h3>{{ currentRecord.title_zh || '装箱单' }}</h3>
        </div>

        <div class="detail-info">
          <div class="info-row">
            <span class="label">Packing No.:</span>
            <span class="value">{{ currentRecord.packing_no }}</span>
          </div>
          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value">{{ formatDate(currentRecord.packing_date) }}</span>
          </div>
          <div class="info-row">
            <span class="label">PO.:</span>
            <span class="value">{{ currentRecord.po_number || '-' }}</span>
          </div>
        </div>

        <a-divider />

        <div class="detail-parties">
          <div class="party-section">
            <h4>卖方信息</h4>
            <p><strong>公司:</strong> {{ currentRecord.seller_name || '-' }}</p>
            <p><strong>联系人:</strong> {{ currentRecord.seller_contact || '-' }}</p>
            <p><strong>地址:</strong> {{ currentRecord.seller_address || '-' }}</p>
            <p><strong>电话:</strong> {{ currentRecord.seller_phone || '-' }}</p>
          </div>
          <div class="party-section">
            <h4>买方信息</h4>
            <p><strong>公司:</strong> {{ currentRecord.buyer_name || '-' }}</p>
            <p><strong>联系人:</strong> {{ currentRecord.buyer_contact || '-' }}</p>
            <p><strong>地址:</strong> {{ currentRecord.buyer_address || '-' }}</p>
            <p><strong>电话:</strong> {{ currentRecord.buyer_phone || '-' }}</p>
          </div>
        </div>

        <a-divider />

        <div class="detail-items">
          <h4>商品明细</h4>
          <a-table
            :columns="itemColumns"
            :data-source="parseItems(currentRecord.packing_items)"
            :pagination="false"
            size="small"
          />
        </div>

        <a-divider />

        <div class="detail-footer">
          <p><strong>总箱数:</strong> {{ currentRecord.total_packages || '-' }}</p>
          <p><strong>成交方式:</strong> {{ currentRecord.trade_terms || '-' }}</p>
          <p><strong>原产国:</strong> {{ currentRecord.country_of_origin || '-' }}</p>
        </div>
      </div>
    </a-modal>

    <!-- 新建装箱单弹窗 -->
    <PackingListForm v-model:visible="packingListFormVisible" @success="handleCreateSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { packingListsApi } from '@/api/packingLists'
import PackingListForm from '@/components/PackingListForm.vue'
import dayjs from 'dayjs'

const packingLists = ref<any[]>([])
const loading = ref(false)
const detailVisible = ref(false)
const currentRecord = ref<any>(null)
const dateRange = ref<[any, any] | undefined>(undefined)
const packingListFormVisible = ref(false)

const searchParams = reactive({
  packingNo: '',
  startDate: '',
  endDate: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

const columns = [
  {
    title: '装箱单号',
    dataIndex: 'packing_no',
    key: 'packing_no',
    width: 150,
  },
  {
    title: '装箱日期',
    dataIndex: 'packing_date',
    key: 'packing_date',
    width: 120,
  },
  {
    title: '采购订单号',
    dataIndex: 'po_number',
    key: 'po_number',
    width: 150,
  },
  {
    title: '卖方公司',
    dataIndex: 'seller_name',
    key: 'seller_name',
    width: 200,
    ellipsis: true,
  },
  {
    title: '买方公司',
    dataIndex: 'buyer_name',
    key: 'buyer_name',
    width: 200,
    ellipsis: true,
  },
  {
    title: '商品数量',
    key: 'packing_items',
    width: 100,
  },
  {
    title: '总箱数',
    dataIndex: 'total_packages',
    key: 'total_packages',
    width: 80,
  },
  {
    title: '成交方式',
    dataIndex: 'trade_terms',
    key: 'trade_terms',
    width: 100,
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
  },
]

const itemColumns = [
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
    title: 'Ref（合同号）',
    dataIndex: 'ref',
    key: 'ref',
    width: 140,
  },
  {
    title: '净重(KG)',
    dataIndex: 'netWeight',
    key: 'netWeight',
    width: 90,
  },
  {
    title: '毛重(KG)',
    dataIndex: 'grossWeight',
    key: 'grossWeight',
    width: 100,
  },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    width: 100,
  },
]

const formatDate = (date: string) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const formatDateTime = (date: string) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const getItemCount = (items: string) => {
  try {
    const parsed = JSON.parse(items || '[]')
    return parsed.length
  } catch {
    return 0
  }
}

const parseItems = (items: string) => {
  try {
    return JSON.parse(items || '[]')
  } catch {
    return []
  }
}

const loadPackingLists = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    }

    if (searchParams.packingNo) {
      params.packingNo = searchParams.packingNo
    }
    if (searchParams.startDate) {
      params.startDate = searchParams.startDate
    }
    if (searchParams.endDate) {
      params.endDate = searchParams.endDate
    }

    const response = await packingListsApi.getAll(params)
    packingLists.value = response.data || []
    pagination.total = response.total || 0
  } catch (error) {
    console.error('加载装箱单列表失败:', error)
    message.error('加载装箱单列表失败')
    packingLists.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  loadPackingLists()
}

const handleReset = () => {
  searchParams.packingNo = ''
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
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadPackingLists()
}

const handleViewDetail = (record: any) => {
  currentRecord.value = record
  detailVisible.value = true
}

const handlePrint = (record: any) => {
  // TODO: 实现打印功能
  message.info('打印功能开发中')
}

const handleDelete = async (record: any) => {
  try {
    await packingListsApi.delete(record.packing_list_id)
    message.success('删除成功')
    loadPackingLists()
  } catch (error) {
    console.error('删除装箱单失败:', error)
    message.error('删除装箱单失败')
  }
}

const handleCreateNew = () => {
  packingListFormVisible.value = true
}

const handleCreateSuccess = () => {
  packingListFormVisible.value = false
  loadPackingLists()
}

onMounted(() => {
  loadPackingLists()
})
</script>

<style scoped lang="scss">
.packing-lists-container {
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
  }
}

.packing-list-detail {
  .detail-header {
    text-align: center;
    margin-bottom: 20px;

    h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
    }

    h3 {
      margin: 0;
      font-size: 20px;
    }
  }

  .detail-info {
    display: flex;
    justify-content: flex-end;
    gap: 24px;
    margin-bottom: 16px;

    .info-row {
      .label {
        font-weight: bold;
        margin-right: 8px;
      }
    }
  }

  .detail-parties {
    display: flex;
    gap: 24px;

    .party-section {
      flex: 1;
      padding: 16px;
      background: #fafafa;
      border: 1px solid #e8e8e8;
      border-radius: 4px;

      h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
      }

      p {
        margin: 8px 0;
      }
    }
  }

  .detail-items {
    h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
    }
  }

  .detail-footer {
    display: flex;
    gap: 24px;

    p {
      margin: 0;
    }
  }
}
</style>