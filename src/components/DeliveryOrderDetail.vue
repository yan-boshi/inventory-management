<template>
  <a-modal
    title="出库单详情"
    width="90%"
    :visible="open"
    @cancel="handleClose"
    :footer="null"
    :destroyOnClose="true"
  >
    <div v-if="deliveryOrder" class="delivery-order-detail">
      <!-- 出库单头部 -->
      <div class="detail-header">
        <div class="header-row">
          <div class="header-item">
            <span class="label">出库单编号：</span>
            <span class="value">{{ deliveryOrder.order_number }}</span>
          </div>
          <div class="header-item">
            <span class="label">销售订单编号：</span>
            <span class="value">{{ deliveryOrder.sales_order_number || '-' }}</span>
          </div>
        </div>

        <div class="header-row">
          <div class="header-item">
            <span class="label">客户名称：</span>
            <span class="value">{{ deliveryOrder.customer_name }}</span>
          </div>
          <div class="header-item">
            <span class="label">客户地址：</span>
            <span class="value">{{ deliveryOrder.customer_address || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 出库商品列表 -->
      <div class="detail-table">
        <a-table
          :columns="itemColumns"
          :data-source="deliveryItems"
          :pagination="false"
          bordered
          size="small"
          row-key="no"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'amount'">
              {{ (record.quantity * (record.tax_included_price || 0)).toFixed(2) }}
            </template>
          </template>
        </a-table>
      </div>

      <!-- 出库单底部信息 -->
      <div class="detail-footer">
        <div class="footer-row">
          <div class="footer-item">
            <span class="label">总计：</span>
            <span class="value amount">{{ deliveryOrder.total_amount?.toFixed(2) }}</span>
          </div>
          <div class="footer-item">
            <span class="label">币种：</span>
            <span class="value">{{ getCurrencyName(deliveryOrder.currency) }}</span>
          </div>
        </div>

        <div class="footer-row">
          <div class="footer-item">
            <span class="label">出库时间：</span>
            <span class="value">{{ deliveryOrder.delivery_time }}</span>
          </div>
          <div class="footer-item">
            <span class="label">送货日期：</span>
            <span class="value">{{ deliveryOrder.delivery_date || '-' }}</span>
          </div>
        </div>

        <div class="footer-row">
          <div class="footer-item">
            <span class="label">发货人：</span>
            <span class="value">{{ deliveryOrder.delivery_person || '-' }}</span>
          </div>
          <div class="footer-item">
            <span class="label">联系电话：</span>
            <span class="value">{{ deliveryOrder.contact_phone || '-' }}</span>
          </div>
        </div>

        <div class="footer-row" v-if="getValidExpenses(deliveryOrder.expenses).length > 0">
          <div class="footer-item full-width">
            <span class="label">出库费用：</span>
            <div class="expenses-info">
              <a-tag v-for="item in getValidExpenses(deliveryOrder.expenses)" :key="item.key" color="blue">
                {{ item.label }}: {{ item.value.toFixed(2) }}
              </a-tag>
            </div>
          </div>
        </div>

        <div class="footer-row" v-if="deliveryOrder.remarks">
          <div class="footer-item full-width">
            <span class="label">备注：</span>
            <span class="value">{{ deliveryOrder.remarks }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="detail-actions">
        <a-space>
          <a-button @click="handleClose">关闭</a-button>
          <a-button type="primary" @click="handlePrint">打印</a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getValidExpenses } from '@/utils/expense'
import type { DeliveryOrder, DeliveryItem } from '@/types'

const props = defineProps<{
  open: boolean
  deliveryOrder: DeliveryOrder | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'print', data: DeliveryOrder): void
}>()

const itemColumns = [
  { title: '序号', key: 'no', width: '5%', align: 'center' },
  { title: '产品代码', key: 'product_code', width: '10%' },
  { title: '产品名称', key: 'product_name', width: '13%' },
  { title: '规格描述', key: 'specification', width: '10%' },
  { title: '单位', key: 'unit', width: '6%' },
  { title: '数量', key: 'quantity', width: '7%', align: 'right' },
  { title: '含税单价', key: 'tax_included_price', width: '9%', align: 'right' },
  { title: '税率(%)', key: 'tax_rate', width: '7%', align: 'right' },
  { title: '合计金额', key: 'amount', width: '9%', align: 'right' },
  { title: '备注', key: 'remarks', width: '10%' },
]

const deliveryItems = computed<DeliveryItem[]>(() => {
  if (!props.deliveryOrder?.delivery_items) return []
  try {
    return typeof props.deliveryOrder.delivery_items === 'string'
      ? JSON.parse(props.deliveryOrder.delivery_items)
      : props.deliveryOrder.delivery_items
  } catch {
    return []
  }
})

const getCurrencyName = (currency: string) => {
  const currencyMap: Record<string, string> = {
    CNY: '人民币',
    USD: '美元',
    EUR: '欧元',
  }
  return currencyMap[currency] || currency
}

const handleClose = () => {
  emit('update:open', false)
}

const handlePrint = () => {
  if (props.deliveryOrder) {
    emit('print', props.deliveryOrder)
  }
}
</script>

<style scoped lang="scss">
.delivery-order-detail {
  padding: 20px;
}

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

.detail-table {
  margin-bottom: 20px;
}

.detail-footer {
  padding: 16px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;

  .footer-row {
    display: flex;
    gap: 20px;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .footer-item {
      flex: 1;

      &.full-width {
        flex: 1;
      }

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

      .expenses-info {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;

        span {
          color: #333;
        }
      }
    }
  }
}

.detail-actions {
  text-align: right;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  margin-top: 16px;
}
</style>
