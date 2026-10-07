<template>
  <a-modal
    :title="modalTitle"
    width="90%"
    :visible="visible"
    @cancel="handleClose"
    :footer="null"
    :destroyOnClose="true"
  >
    <a-spin :spinning="loading">
      <div v-if="billData" class="bill-detail">
        <!-- 出库单详情 -->
        <template v-if="billType === 'delivery'">
          <div class="detail-header">
            <div class="header-row">
              <div class="header-item">
                <span class="label">出库单编号：</span>
                <span class="value">{{ billData.order_number }}</span>
              </div>
              <div class="header-item">
                <span class="label">销售合同编号：</span>
                <span class="value">{{ billData.contract_number || '-' }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">客户名称：</span>
                <span class="value">{{ billData.customer_name }}</span>
              </div>
              <div class="header-item">
                <span class="label">币种：</span>
                <span class="value">{{ getCurrencyName(billData.currency) }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">出库时间：</span>
                <span class="value">{{ billData.entry_date || billData.delivery_date || '-' }}</span>
              </div>
              <div class="header-item" v-if="billData.remarks">
                <span class="label">备注：</span>
                <span class="value">{{ billData.remarks }}</span>
              </div>
            </div>
          </div>
          <a-table
            :columns="deliveryColumns"
            :data-source="parseItems(billData.delivery_items)"
            :pagination="false"
            bordered
            size="small"
            row-key="no"
            :scroll="{ y: 400 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'">
                {{ ((record.quantity || 0) * (record.tax_included_price || 0)).toFixed(2) }}
              </template>
            </template>
          </a-table>
          <div class="detail-footer">
            <div class="footer-row">
              <div class="footer-item">
                <span class="label">总计：</span>
                <span class="value amount">{{ formatMoney(billData.total_amount) }}</span>
              </div>
              <div class="footer-item" v-if="billData.remarks">
                <span class="label">备注：</span>
                <span class="value">{{ billData.remarks }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 入库单详情 -->
        <template v-if="billType === 'warehousing'">
          <div class="detail-header">
            <div class="header-row">
              <div class="header-item">
                <span class="label">入库单编号：</span>
                <span class="value">{{ billData.order_number }}</span>
              </div>
              <div class="header-item">
                <span class="label">采购合同编号：</span>
                <span class="value">{{ billData.contract_number || '-' }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">供应商名称：</span>
                <span class="value">{{ billData.customer_name || '-' }}</span>
              </div>
              <div class="header-item">
                <span class="label">币种：</span>
                <span class="value">{{ billData.currency || '-' }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">入库时间：</span>
                <span class="value">{{ billData.entry_date || '-' }}</span>
              </div>
              <div class="header-item">
                <span class="label">入库人：</span>
                <span class="value">{{ billData.warehousing_person || '-' }}</span>
              </div>
            </div>
            <div class="header-row" v-if="billData.remarks">
              <div class="header-item">
                <span class="label">备注：</span>
                <span class="value">{{ billData.remarks }}</span>
              </div>
            </div>
          </div>
          <a-table
            :columns="warehousingColumns"
            :data-source="parseItems(billData.warehousing_items)"
            :pagination="false"
            bordered
            size="small"
            row-key="no"
            :scroll="{ y: 400 }"
          />
          <div class="detail-footer">
            <div class="footer-row">
              <div class="footer-item">
                <span class="label">总计：</span>
                <span class="value amount">{{ formatMoney(billData.total_amount) }}</span>
              </div>
              <div class="footer-item" v-if="billData.remarks">
                <span class="label">备注：</span>
                <span class="value">{{ billData.remarks }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 出库退货单详情 -->
        <template v-if="billType === 'outbound_return'">
          <div class="detail-header">
            <div class="header-row">
              <div class="header-item">
                <span class="label">退货单编号：</span>
                <span class="value">{{ billData.order_number }}</span>
              </div>
              <div class="header-item">
                <span class="label">原出库单号：</span>
                <span class="value">{{ billData.source_order_number || '-' }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">客户名称：</span>
                <span class="value">{{ billData.customer_name || '-' }}</span>
              </div>
              <div class="header-item">
                <span class="label">合同编号：</span>
                <span class="value">{{ billData.contract_number || '-' }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">退货日期：</span>
                <span class="value">{{ billData.return_time || '-' }}</span>
              </div>
              <div class="header-item">
                <span class="label">退货人：</span>
                <span class="value">{{ billData.return_person || '-' }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">退货原因：</span>
                <span class="value">{{ billData.reason || '-' }}</span>
              </div>
              <div class="header-item">
                <span class="label">币种：</span>
                <span class="value">{{ billData.currency || '-' }}</span>
              </div>
            </div>
          </div>
          <a-table
            :columns="returnItemColumns"
            :data-source="parseItems(billData.return_items)"
            :pagination="false"
            bordered
            size="small"
            row-key="no"
            :scroll="{ y: 400 }"
          />
          <div class="detail-footer">
            <div class="footer-row">
              <div class="footer-item">
                <span class="label">总计：</span>
                <span class="value amount">{{ formatMoney(billData.total_amount) }}</span>
              </div>
              <div class="footer-item" v-if="billData.remarks">
                <span class="label">备注：</span>
                <span class="value">{{ billData.remarks }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 入库退货单详情 -->
        <template v-if="billType === 'inbound_return'">
          <div class="detail-header">
            <div class="header-row">
              <div class="header-item">
                <span class="label">退货单编号：</span>
                <span class="value">{{ billData.order_number }}</span>
              </div>
              <div class="header-item">
                <span class="label">原入库单号：</span>
                <span class="value">{{ billData.source_order_number || '-' }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">供应商名称：</span>
                <span class="value">{{ billData.supplier_name || '-' }}</span>
              </div>
              <div class="header-item">
                <span class="label">合同编号：</span>
                <span class="value">{{ billData.contract_number || '-' }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">退货日期：</span>
                <span class="value">{{ billData.return_time || '-' }}</span>
              </div>
              <div class="header-item">
                <span class="label">退货人：</span>
                <span class="value">{{ billData.return_person || '-' }}</span>
              </div>
            </div>
            <div class="header-row">
              <div class="header-item">
                <span class="label">退货原因：</span>
                <span class="value">{{ billData.reason || '-' }}</span>
              </div>
              <div class="header-item">
                <span class="label">币种：</span>
                <span class="value">{{ billData.currency || '-' }}</span>
              </div>
            </div>
          </div>
          <a-table
            :columns="returnItemColumns"
            :data-source="parseItems(billData.return_items)"
            :pagination="false"
            bordered
            size="small"
            row-key="no"
            :scroll="{ y: 400 }"
          />
          <div class="detail-footer">
            <div class="footer-row">
              <div class="footer-item">
                <span class="label">总计：</span>
                <span class="value amount">{{ formatMoney(billData.total_amount) }}</span>
              </div>
              <div class="footer-item" v-if="billData.remarks">
                <span class="label">备注：</span>
                <span class="value">{{ billData.remarks }}</span>
              </div>
            </div>
          </div>
        </template>

        <div v-if="!billData" class="empty-state">
          <a-empty description="未找到单据信息" />
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { deliveryOrdersApi } from '@/api/deliveryOrders'
import { warehousingOrdersApi } from '@/api/warehousingOrders'
import { outboundReturnsApi } from '@/api/outboundReturns'
import { inboundReturnsApi } from '@/api/inboundReturns'

type BillType = 'delivery' | 'warehousing' | 'outbound_return' | 'inbound_return'

const props = defineProps<{
  visible: boolean
  billType: BillType
  orderNumber: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const loading = ref(false)
const billData = ref<any>(null)

const modalTitle = computed(() => {
  const titles: Record<BillType, string> = {
    delivery: '出库单详情',
    warehousing: '入库单详情',
    outbound_return: '出库退货单详情',
    inbound_return: '入库退货单详情',
  }
  return titles[props.billType] || '单据详情'
})

const fetchBillData = async () => {
  if (!props.orderNumber) return
  loading.value = true
  try {
    let res: any
    switch (props.billType) {
      case 'delivery':
        res = await deliveryOrdersApi.getAll({ orderNumber: props.orderNumber, pageSize: 1 })
        billData.value = res.data?.[0] || null
        break
      case 'warehousing':
        res = await warehousingOrdersApi.getAll({ orderNumber: props.orderNumber, pageSize: 1 })
        billData.value = res.data?.[0] || null
        break
      case 'outbound_return':
        res = await outboundReturnsApi.getAll({ orderNumber: props.orderNumber, pageSize: 1 })
        billData.value = res.data?.[0] || null
        break
      case 'inbound_return':
        res = await inboundReturnsApi.getAll({ orderNumber: props.orderNumber, pageSize: 1 })
        billData.value = res.data?.[0] || null
        break
    }
    if (!billData.value) {
      message.warning('未找到该单据信息')
    }
  } catch (error: any) {
    message.error(error.message || '获取单据详情失败')
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (val) => {
  if (val && props.orderNumber) {
    fetchBillData()
  } else {
    billData.value = null
  }
})

const parseItems = (items: string | any[] | undefined) => {
  if (!items) return []
  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items
    return parsed.map((item: any, index: number) => ({ ...item, no: index + 1 }))
  } catch {
    return []
  }
}

const formatMoney = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-'
  return Number(value).toFixed(2)
}

const getCurrencyName = (currency: string) => {
  const map: Record<string, string> = { CNY: '人民币', USD: '美元', EUR: '欧元' }
  return map[currency] || currency || '-'
}

const handleClose = () => {
  emit('update:visible', false)
}

// 出库单商品列
const deliveryColumns = [
  { title: '序号', key: 'no', width: 50, align: 'center' as const },
  { title: '产品代码', dataIndex: 'product_code', key: 'product_code', width: 120 },
  { title: '产品名称', dataIndex: 'product_name', key: 'product_name', width: 150 },
  { title: '规格描述', dataIndex: 'specification', key: 'specification', width: 120 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 60, align: 'center' as const },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' as const },
  { title: '含税单价', dataIndex: 'tax_included_price', key: 'tax_included_price', width: 100, align: 'right' as const },
  { title: '税率(%)', dataIndex: 'tax_rate', key: 'tax_rate', width: 80, align: 'right' as const },
  { title: '合计金额', key: 'amount', width: 100, align: 'right' as const },
  { title: '备注', dataIndex: 'remarks', key: 'remarks', width: 120 },
]

// 入库单商品列
const warehousingColumns = [
  { title: '序号', key: 'no', width: 50, align: 'center' as const },
  { title: '产品代码', dataIndex: 'product_code', key: 'product_code', width: 120 },
  { title: '产品名称', dataIndex: 'product_name', key: 'product_name', width: 150 },
  { title: '规格描述', dataIndex: 'description', key: 'description', width: 120 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 60, align: 'center' as const },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' as const },
  { title: '含税单价', dataIndex: 'tax_included_price', key: 'tax_included_price', width: 100, align: 'right' as const },
  { title: '税率(%)', dataIndex: 'tax_rate', key: 'tax_rate', width: 80, align: 'right' as const },
  { title: '备注', dataIndex: 'remarks', key: 'remarks', width: 120 },
]

// 退货单商品列
const returnItemColumns = [
  { title: '序号', key: 'no', width: 50, align: 'center' as const },
  { title: '产品代码', dataIndex: 'product_code', key: 'product_code', width: 120 },
  { title: '产品名称', dataIndex: 'product_name', key: 'product_name', width: 150 },
  { title: '规格型号', dataIndex: 'specifications', key: 'specifications', width: 120 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 60, align: 'center' as const },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' as const },
  { title: '含税单价', dataIndex: 'unit_price', key: 'unit_price', width: 100, align: 'right' as const },
  { title: '金额', dataIndex: 'amount_with_tax', key: 'amount_with_tax', width: 100, align: 'right' as const },
]
</script>

<style scoped lang="scss">
.bill-detail {
  .detail-header {
    margin-bottom: 20px;
    padding: 16px;
    background: #fafafa;
    border: 1px solid #e8e8e8;
    border-radius: 4px;

    .header-row {
      display: flex;
      gap: 20px;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      .header-item {
        flex: 1;

        .label {
          font-weight: 500;
          color: #666;
          margin-right: 8px;
        }

        .value {
          color: #333;
        }
      }
    }
  }

  .detail-footer {
    margin-top: 20px;
    padding: 16px;
    background: #fafafa;
    border: 1px solid #e8e8e8;
    border-radius: 4px;

    .footer-row {
      display: flex;
      gap: 20px;

      .footer-item {
        flex: 1;

        .label {
          font-weight: 500;
          color: #666;
          margin-right: 8px;
        }

        .value {
          color: #333;

          &.amount {
            font-size: 16px;
            font-weight: 600;
            color: #1890ff;
          }
        }
      }
    }
  }

  .empty-state {
    padding: 40px 0;
    text-align: center;
  }
}
</style>
