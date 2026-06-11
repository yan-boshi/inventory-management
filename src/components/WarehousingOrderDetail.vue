<template>
  <a-modal
    title="入库单详情"
    width="90%"
    :visible="visible"
    @ok="handleOk"
    @cancel="handleCancel"
    :footer="null"
    :destroy-on-close="true"
  >
    <div class="warehousing-order-detail">
      <!-- 入库单头部信息 -->
      <div class="detail-section">
        <h3>基本信息</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <label class="detail-label">入库单编号：</label>
            <span class="detail-value">{{ order.order_number }}</span>
          </div>
          <div class="detail-item">
            <label class="detail-label">采购订单编号：</label>
            <span class="detail-value">{{ order.purchase_order_number || '-' }}</span>
          </div>
          <div class="detail-item">
            <label class="detail-label">客户名称：</label>
            <span class="detail-value">{{ order.customer_name || '-' }}</span>
          </div>
          <div class="detail-item">
            <label class="detail-label">客户地址：</label>
            <span class="detail-value">{{ order.customer_address || '-' }}</span>
          </div>
          <div class="detail-item">
            <label class="detail-label">入库时间：</label>
            <span class="detail-value">{{ formatDateTime(order.warehousing_time) }}</span>
          </div>
          <div class="detail-item">
            <label class="detail-label">总计：</label>
            <span class="detail-value amount">{{ order.total_amount }}</span>
          </div>
          <div class="detail-item">
            <label class="detail-label">币种：</label>
            <span class="detail-value">{{ order.currency }}</span>
          </div>
          <div class="detail-item">
            <label class="detail-label">入库人：</label>
            <span class="detail-value">{{ order.warehousing_person || '-' }}</span>
          </div>
          <div class="detail-item">
            <label class="detail-label">联系电话：</label>
            <span class="detail-value">{{ order.contact_phone || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 入库费用信息 -->
      <div class="detail-section">
        <h3>入库费用</h3>
        <div class="expenses-tags">
          <a-tag
            v-for="item in getValidExpenses(order.expenses)"
            :key="item.key"
            color="blue"
          >
            {{ item.label }}: {{ item.value.toFixed(2) }}
          </a-tag>
        </div>
      </div>

      <!-- 入库商品详情 -->
      <div class="detail-section">
        <h3>入库商品</h3>
        <a-table
          :columns="itemColumns"
          :data-source="getParsedWarehousingItems()"
          :pagination="false"
          bordered
          size="small"
        />
      </div>

      <!-- 备注 -->
      <div class="detail-section">
        <h3>备注</h3>
        <div class="remarks-content">
          {{ order.remarks || '-' }}
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { getValidExpenses } from '@/utils/expense'

dayjs.locale('zh-cn')

const props = defineProps<{
  visible: boolean
  order: any
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const itemColumns = [
  { title: '序号', key: 'no', width: '5%', align: 'center' },
  { title: '产品代码', key: 'product_code', width: '12%' },
  { title: '产品名称', key: 'product_name', width: '15%' },
  { title: '规格描述', key: 'description', width: '12%' },
  { title: '单位', key: 'unit', width: '6%' },
  { title: '数量', key: 'quantity', width: '8%', align: 'right' },
  { title: '含税单价', key: 'tax_included_price', width: '10%', align: 'right' },
  { title: '税率(%)', key: 'tax_rate', width: '8%', align: 'right' },
  { title: '备注', key: 'remarks', width: '14%' },
]

const formatDateTime = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm')
}

const formatCurrency = (value: number) => {
  return value ? value.toFixed(2) : '0.00'
}

const getParsedWarehousingItems = () => {
  try {
    return JSON.parse(props.order.warehousing_items || '[]')
  } catch {
    return []
  }
}

const handleOk = () => {
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.warehousing-order-detail {
  padding: 20px;

  .detail-section {
    margin-bottom: 24px;

    h3 {
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 500;
      color: #333;
      border-bottom: 1px solid #e8e8e8;
      padding-bottom: 8px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      .detail-item {
        display: flex;
        align-items: center;

        .detail-label {
          white-space: nowrap;
          margin-right: 8px;
          min-width: 100px;
          font-size: 14px;
          color: #666;
        }

        .detail-value {
          font-size: 14px;

          &.amount {
            color: #f5222d;
            font-weight: 500;
          }
        }
      }
    }

    .expenses-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .remarks-content {
      padding: 12px;
      background: #fafafa;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      min-height: 40px;
      line-height: 1.5;
      color: #666;
    }
  }
}

:deep(.ant-table) {
  .ant-table-tbody > tr > td {
    padding: 8px 16px;
  }
}
</style>