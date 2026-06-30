<template>
  <div class="purchase-orders-container">
    <div class="header">
      <h1>采购订单</h1>
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增采购订单
      </a-button>
    </div>

    <a-card>
      <div class="search-bar">
        <a-form layout="inline">
          <a-form-item label="订单号">
            <a-input
              v-model:value="searchParams.orderNumber"
              placeholder="请输入订单号"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="供应商名称">
            <a-input
              v-model:value="searchParams.supplierName"
              placeholder="请输入供应商名称"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="供应商代码">
            <a-input
              v-model:value="searchParams.supplierCode"
              placeholder="请输入供应商代码"
              allow-clear
              style="width: 200px"
            />
          </a-form-item>

          <a-form-item label="采购日期">
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
              <ColumnConfig v-model:columns="allColumns" />
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <a-table
        :columns="visibleColumns"
        :data-source="expandedOrders"
        :loading="loading"
        :pagination="pagination"
        rowKey="row_key"
        @change="handleTableChange"
        :scroll="{ x: 1800 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <a v-if="record._isFirstRow" @click="handleViewDetail(record)">{{ record.order_number || '-' }}</a>
          </template>

          <template v-else-if="column.key === 'contract_number'">
            <span v-if="record._isFirstRow">{{ record.contract_number || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'supplier_name'">
            <span v-if="record._isFirstRow">{{ record.supplier_name || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'supplier_code'">
            <span v-if="record._isFirstRow">{{ record.supplier_code || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'total_amount'">
            <span v-if="record._isFirstRow" style="color: #f5222d; font-weight: 500">
              {{ getTotalAmount(record) }}
            </span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag v-if="record._isFirstRow" :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'entry_date'">
            <span v-if="record._isFirstRow">{{ formatDate(record.entry_date) }}</span>
          </template>

          <template v-else-if="column.key === 'purchase_person'">
            <span v-if="record._isFirstRow">{{ record.purchase_person || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space v-if="record._isFirstRow">
              <a-button type="link" size="small" @click="handleEdit(record)"> 编辑 </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
              <a-button type="link" size="small" @click="({ key }) => handlePrint(record, key)"> 打印 <DownOutlined /> </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <PurchaseOrderForm
      v-model:visible="formVisible"
      :isEdit="isEdit"
      :purchaseOrderData="currentOrder"
      @success="handleSuccess"
    />

    <PurchaseOrderDetail v-model:visible="detailVisible" :order="currentOrder" />

    <PurchaseOrderPrint v-model:visible="printVisible" :order="currentOrder" />
    <PurchaseOrderPrintEn v-model:visible="printEnVisible" :order="currentOrder" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons-vue'
import { purchaseOrdersApi } from '@/api/purchaseOrders'
import { suppliersApi } from '@/api/suppliers'
import type { PurchaseOrder, PurchaseOrderQueryParams } from '@/types'
import PurchaseOrderForm from '@/components/PurchaseOrderForm.vue'
import PurchaseOrderDetail from '@/components/PurchaseOrderDetail.vue'
import PurchaseOrderPrint from '@/components/PurchaseOrderPrint.vue'
import PurchaseOrderPrintEn from '@/components/PurchaseOrderPrintEn.vue'
import ColumnConfig from '@/components/ColumnConfig.vue'
import dayjs from 'dayjs'

const orders = ref<PurchaseOrder[]>([])
const loading = ref(false)
const formVisible = ref(false)
const detailVisible = ref(false)
const printVisible = ref(false)
const printEnVisible = ref(false)
const isEdit = ref(false)
const currentOrder = ref<PurchaseOrder | undefined>(undefined)
const dateRange = ref<[any, any] | undefined>(undefined)

// 展开订单数据，每个商品一行
const expandedOrders = computed(() => {
  const result: any[] = []
  orders.value.forEach((order, orderIndex) => {
    const items = getParsedPurchaseItems(order)
    if (items.length === 0) {
      result.push({
        ...order,
        row_key: order.purchase_order_id,
        product_code: '-',
        product_name: '-',
        model: '-',
        description: '-',
        quantity: '-',
        unit: '-',
        amount: 0,
        _isFirstRow: true,
        _rowCount: 1,
        _orderIndex: orderIndex,
      })
    } else {
      items.forEach((item: any, index: number) => {
        result.push({
          ...order,
          row_key: `${order.purchase_order_id}_${index}`,
          product_code: item.product_code || '-',
          product_name: item.product_name || '-',
          model: item.model || '-',
          description: item.description || '-',
          quantity: item.quantity || '-',
          unit: item.unit || '-',
          amount: item.tax_included_amount || 0,
          _isFirstRow: index === 0,
          _rowCount: items.length,
          _orderIndex: orderIndex,
        })
      })
    }
  })
  return result
})

const searchParams = reactive<PurchaseOrderQueryParams>({
  page: 1,
  pageSize: 10,
  orderNumber: '',
  supplierName: '',
  supplierCode: '',
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

const allColumns = ref([
  {
    title: '序号',
    key: 'index',
    width: 60,
    align: 'center',
    fixed: 'left',
    customRender: ({ record }: { record: any }) => {
      if (record._isFirstRow) {
        return (pagination.current - 1) * pagination.pageSize + record._orderIndex + 1
      }
      return ''
    },
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '默认单据编号',
    dataIndex: 'order_number',
    key: 'order_number',
    width: 150,
    fixed: 'left',
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '合同编号',
    dataIndex: 'contract_number',
    key: 'contract_number',
    width: 150,
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '供应商名称',
    dataIndex: 'supplier_name',
    key: 'supplier_name',
    width: 200,
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '供应商代码',
    dataIndex: 'supplier_code',
    key: 'supplier_code',
    width: 120,
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '产品代码',
    dataIndex: 'product_code',
    key: 'product_code',
    width: 120,
  },
  {
    title: '产品名称',
    dataIndex: 'product_name',
    key: 'product_name',
    width: 150,
  },
  {
    title: '产品型号',
    dataIndex: 'model',
    key: 'model',
    width: 120,
  },
  {
    title: '产品描述',
    dataIndex: 'description',
    key: 'description',
    width: 150,
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
    align: 'right',
  },
  {
    title: '单位',
    dataIndex: 'unit',
    key: 'unit',
    width: 60,
    align: 'center',
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    align: 'right',
  },
  {
    title: '含税总价',
    key: 'total_amount',
    width: 120,
    align: 'right',
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    align: 'center',
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '录入日期',
    dataIndex: 'entry_date',
    key: 'entry_date',
    width: 120,
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '采购人',
    dataIndex: 'purchase_person',
    key: 'purchase_person',
    width: 80,
    align: 'center',
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right',
    customCell: (record: any) => {
      if (record._isFirstRow && record._rowCount > 1) {
        return { rowSpan: record._rowCount }
      }
      if (!record._isFirstRow) {
        return { rowSpan: 0 }
      }
      return {}
    },
  },
])

const visibleColumns = computed(() => {
  return allColumns.value.filter(col => col.visible !== false)
})

const loadOrders = async () => {
  loading.value = true
  try {
    const response = await purchaseOrdersApi.getAll(searchParams)
    orders.value = response.data || []
    pagination.total = response.data.pagination?.total || 0
    pagination.current = response.data.pagination?.page || 1
    pagination.pageSize = response.data.pagination?.pageSize || 10
  } catch (error) {
    console.error('加载采购订单失败:', error)
    message.error('加载采购订单失败')
    orders.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.page = 1
  loadOrders()
}

const handleReset = () => {
  searchParams.orderNumber = ''
  searchParams.supplierName = ''
  searchParams.supplierCode = ''
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
  loadOrders()
}

const handleAdd = () => {
  isEdit.value = false
  currentOrder.value = undefined
  formVisible.value = true
}

const handleEdit = (order: PurchaseOrder) => {
  isEdit.value = true
  currentOrder.value = order
  formVisible.value = true
}

const handleViewDetail = (order: PurchaseOrder) => {
  currentOrder.value = order
  detailVisible.value = true
}

const handleDelete = (order: PurchaseOrder) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除采购订单 ${order.order_number} 吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await purchaseOrdersApi.delete(order.purchase_order_id)
        message.success('删除成功')
        loadOrders()
      } catch (error) {
        message.error('删除失败')
      }
    },
  })
}

const handleStatusChange = (order: PurchaseOrder, status: string) => {
  Modal.confirm({
    title: '确认更新状态',
    content: `确定要将采购订单 ${order.order_number} 的状态更新为 ${getStatusText(parseInt(status))}吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await purchaseOrdersApi.updateStatus(order.purchase_order_id, parseInt(status) as 1 | 2 | 3 | 4)
        message.success('状态更新成功')
        loadOrders()
      } catch (error) {
        message.error('状态更新失败')
      }
    },
  })
}

const getParsedPurchaseItems = (order: PurchaseOrder) => {
  try {
    return JSON.parse(order.purchase_items || '[]')
  } catch {
    return []
  }
}

const getTotalAmount = (order: PurchaseOrder) => {
  const items = getParsedPurchaseItems(order)
  return items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
}

const handleSuccess = () => {
  loadOrders()
}

const handlePrint = (order: PurchaseOrder, lang: 'zh' | 'en' = 'zh') => {
  console.log('打印采购订单:', order, 'language:', lang)

  currentOrder.value = order
  if (lang === 'en') {
    printEnVisible.value = true
  } else {
    printVisible.value = true
  }
}

const formatMoney = (amount: number | string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${(numAmount || 0).toFixed(2)}`
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return dayjs(dateString).format('YYYY-MM-DD')
}

const getStatusColor = (status: number) => {
  const colorMap: Record<number, string> = {
    1: 'blue',    // 未入库
    2: 'green',   // 已全部入库
    3: 'orange',  // 已部分入库
    4: 'red',     // 退货
  }
  return colorMap[status] || 'default'
}

const getStatusText = (status: number) => {
  const textMap: Record<number, string> = {
    1: '未入库',
    2: '已全部入库',
    3: '已部分入库',
    4: '退货',
  }
  return textMap[status] || '未知'
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped lang="scss">
.purchase-orders-container {
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
