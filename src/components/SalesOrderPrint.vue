<template>
  <a-modal v-model:open="visible" title="" width="900px" :footer="null" :closable="false" @cancel="handleCancel">
    <div ref="printContent" class="print-content">
      <!-- 页面头 -->
      <div class="page-header">
        <h1 class="company-name">深圳市旭思达光电科技有限公司</h1>
        <h2 class="contract-title">销售合同</h2>
      </div>

      <!-- 页面上面部分 -->
      <div class="top-section">
        <div class="contract-number-row">
          <span class="label">合同编号：</span>
          <span class="value">{{ orderData?.contract_number || '-' }}</span>
        </div>
        <div class="parties-row">
          <!-- 甲方（需方） -->
          <div class="party-info">
            <div class="info-item">
              <span class="label">甲方：</span>
              <span class="value">{{ customerData?.customer_name || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">信用代码：</span>
              <span class="value">{{ customerData?.customer_tax_number || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">注册地址：</span>
              <span class="value">{{ customerData?.register_address || '-' }}</span> 
            </div>
          </div>
          <!-- 乙方（供方） -->
          <div class="party-info">
            <div class="info-item">
              <span class="label">乙方：</span>
              <span class="value">深圳市旭思达光电科技有限公司</span>
            </div>
            <div class="info-item">
              <span class="label">信用代码：</span>
              <span class="value" @click="handleEdit('sellerCreditCode')">91440300MAKBFMJ49M</span>
            </div>
            <div class="info-item">
              <span class="label">注册地址：</span>
              <span class="value">深圳市龙岗区坂田街道五和大道（南）景丰大厦602室</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 页面中间部分：表格 -->
      <div class="middle-section">
        <div class="intro-text">一、经甲（需方）、乙（供方）双方友好协商，乙方出售以下货物给甲方：</div>
        <table class="product-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>产品名称</th>
              <th>产品代码</th>
              <th>规格型号</th>
              <th>规格描述</th>
              <th>数量</th>
              <th>单位</th>
              <th>含税单价</th>
              <th>税额</th>
              <th>含税金额</th>
              <th>发货日期</th>
              <th style="width: 100px">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in orderItems" :key="item.no">
              <td>{{ item.no }}</td>
              <td>{{ item.product_name || '-' }}</td>
              <td>{{ item.product_code || '-' }}</td>
              <td>{{ item.model || '-' }}</td>
              <td>{{ item.description || '-' }}</td>
              <td>{{ item.quantity || '-' }}</td>
              <td>{{ item.unit || '-' }}</td>
              <td>{{ item.tax_included_price }}</td>
              <td>{{ item.tax_amount }}</td>
              <td>{{ item.tax_included_amount }}</td>
              <td>{{ formatDate(item.delivery_date) }}</td>
              <td>
                <span class="value editable" @click="handleEdit('remarks')">-</span>
              </td>
            </tr>
            <!-- 金额总计行 -->
            <tr class="total-row">
              <td colspan="10" class="total-label">税额（大写）：</td>
              <td colspan="2">{{ formData.taxAmountInWords }}</td>
            </tr>
            <tr class="total-row">
              <td colspan="10" class="total-label">税额：</td>
              <td colspan="2">{{ formatPrice(formData.taxTotal) }}</td>
            </tr>
            <tr class="total-row">
              <td colspan="10" class="total-label">含税金额总计（大写）：</td>
              <td colspan="2">{{ formData.amountInWords }}</td>
            </tr>
            <tr class="total-row">
              <td colspan="10" class="total-label">含税金额总计：</td>
              <td colspan="2">{{ formatPrice(formData.total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 合同条款 -->
      <div class="terms-section">
        <div class="term-item">二、付款方式：验收合格后</div>
        <div class="term-item">三、发票：验收合格后，乙方提供合法正规发票，甲方收到发票后3个工作日内支付货款。</div>
        <div class="term-item indent">交货方式：乙方负责将货物运送至甲方指定地址，货物在交货运输前造成的损失和意外均由乙方负责。</div>
        <div class="term-item">四、交货周期：合同生效后30日</div>
        <div class="term-item">五、验收标准：甲方收到货物3个工作日内（节假日顺延）以书面方式或者邮件的形式告知乙方开箱验收情况，超过3个工作日，则默认为甲方验收合格。乙方提供的产品必须符合国家标准，以及双方确认的图纸要求的标准（附件一），乙方产品经甲方入库后，如果在生产中发现不良品情况，乙方必须无条件退货或者返修，并按照甲方要求将合格产品送达甲方指定的收货地址。</div>
        <div class="term-item">六、保修和售后服务：乙方保证所提供的货物为原厂出品，符合附件一所要求的标准，从甲方收到货物后开始计算，免费保修期为壹年（不含人为因素，消耗品易损件除外），如果产品故障是由于需方选型不当、意外事故、错误使用或没有按技术要求正常使用所引起，供方不承担质保责任。</div>
        <div class="term-item">七、有限责任：任何情况下，供方在本合同任何条款下所承担的全部责任，以需方产品实际已支付的价款为限。</div>
        <div class="term-item">八、违约情况：本合同如发生纠纷，供需双方应协商解决，协商不成的，向供货方所在地人民法院起诉。本合同因不可抗力而无法履行的，双方均不需承担责任。</div>
        <div class="term-item">九、保密协议：未经双方许可，甲乙双方不得向第三方泄露本合同有关内容，更不得向第三方泄露图纸，文件，检验标准以及方案内容，如有泄露在签订和履行本合同的过程中所获得的对方任何商业机密的情况，由此产生的后果由泄露方承担。</div>
        <div class="term-item">十、合同生效：本合同经双方签字盖章后生效，扫描件也具有同等效力；本合同一式两份，双方各执一份。</div>
      </div>

      <!-- 页面底部部分 -->
      <div class="footer-section">
        <div class="footer-left">
          <div class="footer-title">甲方</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">联系人：</span>
              <span :class="['footer-value', { editable: !formData.buyerContact }]" @click="handleEdit('buyerContact')">{{ formData.buyerContact || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">联系电话：</span>
              <span :class="['footer-value', { editable: !formData.buyerPhone }]" @click="handleEdit('buyerPhone')">{{ formData.buyerPhone || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">邮箱：</span>
              <span :class="['footer-value', { editable: !formData.buyerEmail }]" @click="handleEdit('buyerEmail')">{{ formData.buyerEmail || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">日期：</span>
              <span class="footer-value">{{ formatDate(orderData?.entry_date) }}</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">签字盖章：</span>
          </div>
        </div>
        <div class="footer-right">
          <div class="footer-title">乙方</div>
          <div class="footer-content">
            <div class="footer-item">
              <span class="footer-label">联系人：</span>
              <span :class="['footer-value', { editable: !formData.sellerContact }]" @click="handleEdit('sellerContact')">{{ formData.sellerContact || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">联系电话：</span>
              <span :class="['footer-value', { editable: !formData.sellerPhone }]" @click="handleEdit('sellerPhone')">{{ formData.sellerPhone || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">邮箱：</span>
              <span :class="['footer-value', { editable: !formData.sellerEmail }]" @click="handleEdit('sellerEmail')">{{ formData.sellerEmail || '-' }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">日期：</span>
              <span class="footer-value">{{ formatDate(orderData?.entry_date) }}</span>
            </div>
          </div>
          <div class="sign-box">
            <span class="sign-label">签字盖章：</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handlePrint">打印</a-button>
      </a-space>
    </div>

    <!-- 编辑弹窗 -->
    <a-modal
      v-model:open="editModalVisible"
      :title="editFieldTitle"
      @ok="handleEditConfirm"
      @cancel="editModalVisible = false"
    >
      <a-input ref="editInputRef" v-model:value="editValue" />
    </a-modal>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, nextTick } from 'vue'
import dayjs from 'dayjs'
import type { SalesOrder } from '@/types'
import { useUserStore } from '@/stores/user'
import { customersApi } from '@/api/customers'

interface Props {
  visible: boolean
  order: SalesOrder | undefined
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const orderData = computed(() => props.order)
const orderItems = computed(() => JSON.parse(props.order?.sales_items || '[]'))
const customerData = ref<any>(null)
const userStore = useUserStore()

const formData = reactive({
  salesDate: '',
  taxRate: 0,
  remarks: '',
  total: 0,
  amountInWords: '',
  taxTotal: 0,
  taxAmountInWords: '',
  sellerContact: '',
  sellerPhone: '',
  sellerEmail: '',
  sellerCreditCode: '',
  buyerContact: '',
  buyerPhone: '',
  buyerEmail: '',
})

const editModalVisible = ref(false)
const editField = ref('')
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

const editFieldTitle = computed(() => {
  const titles: Record<string, string> = {
    salesDate: '销售日期',
    taxRate: '税率',
    remarks: '备注',
    sellerContact: '联系人',
    sellerPhone: '联系电话',
    sellerEmail: '邮箱',
    sellerCreditCode: '信用代码',
    buyerContact: '甲方联系人',
    buyerPhone: '甲方联系电话',
    buyerEmail: '甲方邮箱',
  }
  return titles[editField.value] || '编辑'
})

const numberToChinese = (num: number): string => {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟', '万', '亿']
  let str = ''
  let unitIndex = 0
  // @ts-expect-error - zeroFlag is used in logic
  let zeroFlag = false

  if (num === 0) {
    return '零元整'
  }

  const numStr = Math.floor(num).toString()

  for (let i = 0; i < numStr.length; i++) {
    const digit = parseInt(numStr[i])
    if (digit === 0) {
      zeroFlag = true
    } else {
      zeroFlag = false
      const currentDigit = digits[digit] || ''
      if (unitIndex > 0) {
        str += units[unitIndex]
      }
      str += currentDigit
      unitIndex++
    }
  }

  str += '元'
  if (numStr.includes('.')) {
    const decimal = numStr.split('.')[1]
    if (decimal) {
      str += digits[parseInt(decimal[0])] + '角'
      if (decimal.length > 1) {
        str += digits[parseInt(decimal[1])] + '分'
      }
    }
  }

  return str + '整'
}

const initializeFormData = () => {
  if (!orderData.value) return
  const user = userStore.user
  const order = orderData.value

  formData.salesDate = order.sales_date || new Date().toISOString()
  formData.taxRate = 0
  formData.remarks = ''
  formData.total = order.tax_included_amount || 0
  formData.amountInWords = numberToChinese(order.tax_included_amount || 0)

  // 计算税额总计
  const items = orderItems.value || []
  const taxTotal = items.reduce((sum: number, item: any) => {
    return sum + (parseFloat(item.tax_amount) || 0)
  }, 0)
  formData.taxTotal = Math.round(taxTotal * 100) / 100
  formData.taxAmountInWords = numberToChinese(formData.taxTotal)

  formData.sellerContact = user?.username || ''
  formData.sellerPhone = user?.phone || ''
  formData.sellerEmail = user?.email || ''
  formData.sellerCreditCode = ''
  // 甲方字段初始为空，等待客户数据加载后更新
  formData.buyerContact = ''
  formData.buyerPhone = ''
  formData.buyerEmail = ''
}

watch(
  () => props.visible,
  async newVal => {
    if (newVal) {
      initializeFormData()
      // 页面打开时获取客户信息
      const customerCode = orderData.value?.customer_code
      if (customerCode) {
        try {
          const response = await customersApi.getAll({ code: customerCode })
          if (response.data && response.data.length > 0) {
            customerData.value = response.data[0]
            // 更新甲方字段
            formData.buyerContact = customerData.value?.contact || ''
            formData.buyerPhone = customerData.value?.contact_phone || ''
            formData.buyerEmail = customerData.value?.customer_email || ''
          }
        } catch (error) {
          console.error('获取客户信息失败:', error)
        }
      }
    }
  }
)

watch(editModalVisible, newVal => {
  if (newVal) {
    nextTick(() => {
      editInputRef.value?.focus()
    })
  }
})

const formatDate = (date: string | undefined) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const formatPrice = (price: number | string | undefined) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price || 0
  return `￥${numPrice.toFixed(2)}`
}

const handleEdit = (field: string) => {
  editField.value = field
  switch (field) {
    case 'salesDate':
      editValue.value = dayjs(formData.salesDate).format('YYYY-MM-DD')
      break
    case 'taxRate':
      editValue.value = String(formData.taxRate)
      break
    case 'remarks':
      editValue.value = formData.remarks
      break
    case 'sellerContact':
      editValue.value = formData.sellerContact
      break
    case 'sellerPhone':
      editValue.value = formData.sellerPhone
      break
    case 'sellerEmail':
      editValue.value = formData.sellerEmail
      break
    case 'sellerCreditCode':
      editValue.value = formData.sellerCreditCode
      break
    case 'buyerContact':
      editValue.value = formData.buyerContact
      break
    case 'buyerPhone':
      editValue.value = formData.buyerPhone
      break
    case 'buyerEmail':
      editValue.value = formData.buyerEmail
      break
  }
  editModalVisible.value = true
}

const handleEditConfirm = () => {
  switch (editField.value) {
    case 'salesDate':
      formData.salesDate = dayjs(editValue.value).toISOString()
      break
    case 'taxRate':
      formData.taxRate = parseFloat(editValue.value) || 0
      break
    case 'remarks':
      formData.remarks = editValue.value
      break
    case 'sellerContact':
      formData.sellerContact = editValue.value
      break
    case 'sellerPhone':
      formData.sellerPhone = editValue.value
      break
    case 'sellerEmail':
      formData.sellerEmail = editValue.value
      break
    case 'sellerCreditCode':
      formData.sellerCreditCode = editValue.value
      break
    case 'buyerContact':
      formData.buyerContact = editValue.value
      break
    case 'buyerPhone':
      formData.buyerPhone = editValue.value
      break
    case 'buyerEmail':
      formData.buyerEmail = editValue.value
      break
  }
  editModalVisible.value = false
}

const handleCancel = () => {
  visible.value = false
}

const handlePrint = () => {
  // 移除模态框的 inline width，避免覆盖打印样式的 width: 100%
  const modalEl = document.querySelector('.ant-modal') as HTMLElement
  const originalWidth = modalEl?.style.width
  if (modalEl) {
    modalEl.style.width = '100%'
  }
  window.print()
  // 打印后恢复
  if (modalEl && originalWidth) {
    modalEl.style.width = originalWidth
  }
}
</script>

<style scoped lang="scss">
.print-content {
  padding: 40px 20px;
  background: white;
  min-height: 800px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;

  .company-name {
    font-size: 28px;
    font-weight: bold;
    margin: 0 0 10px 0;
    color: #000;
  }

  .contract-title {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
    color: #000;
  }
}

.top-section {
  margin-bottom: 30px;

  .contract-number-row {
    margin-bottom: 20px;
    font-size: 16px;

    .label {
      font-weight: bold;
      color: #000;
    }

    .value {
      color: #000;
    }
  }

  .parties-row {
    display: flex;
    gap: 20px;
  }

  .party-info {
    flex: 1;
    border: 1px solid #e8e8e8;
    padding: 16px;
    background: #fafafa;

    .party-title {
      font-size: 16px;
      font-weight: bold;
      color: #262626;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #d9d9d9;
    }

    .info-item {
      margin-bottom: 10px;
      font-size: 14px;
      color: #000;

      .label {
        color: #595959;
        margin-right: 8px;
      }

      .value {
        color: #000;

        &.editable {
          cursor: pointer;
          color: #1890ff;
          border-bottom: 1px dashed #1890ff;
          padding-bottom: 1px;

          &:hover {
            background: #e6f7ff;
          }
        }
      }
    }
  }
}

.middle-section {
  margin-bottom: 30px;

  .intro-text {
    font-size: 14px;
    color: #000;
    margin-bottom: 16px;
  }

  .product-table {
    width: 100%;
    border-collapse: collapse;

    th {
      padding: 10px 8px;
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      font-weight: 500;
      font-size: 13px;
      color: #262626;
      text-align: center;
    }

    td {
      padding: 10px 8px;
      border: 1px solid #e8e8e8;
      text-align: center;
      font-size: 13px;
      color: #000;
      vertical-align: middle;
    }

    .total-row {
      td {
        font-weight: bold;
        background: #fafafa;

        &.total-label {
          text-align: right;
          padding-right: 20px;
        }
      }
    }
  }
}

.terms-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #fafafa;
  border: 1px solid #e8e8e8;

  .term-item {
    font-size: 13px;
    line-height: 1.8;
    color: #000;
    margin-bottom: 8px;

    &.indent {
      padding-left: 24px;
    }
  }
}

.footer-section {
  display: flex;
  margin-top: 40px;
  gap: 40px;
  align-items: stretch;

  .footer-left,
  .footer-right {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .footer-title {
    font-size: 16px;
    font-weight: 500;
    color: #262626;
    margin-bottom: 16px;
  }

  .footer-content {
    border: 1px solid #e8e8e8;
    padding: 16px;
    background: #fafafa;
    margin-bottom: auto;
  }

  .footer-item {
    margin-bottom: 12px;
    font-size: 14px;
    color: #000;
    display: flex;
    align-items: center;

    .footer-label {
      color: #595959;
      min-width: 80px;
    }

    .footer-value {
      flex: 1;
      color: #000;

      &.editable {
        cursor: pointer;
        color: #1890ff;
        border-bottom: 1px dashed #1890ff;
        padding-bottom: 1px;

        &:hover {
          background: #e6f7ff;
        }
      }
    }
  }

  .sign-box {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed #d9d9d9;

    .sign-label {
      color: #595959;
      font-size: 14px;
    }
  }
}

.modal-footer {
  text-align: right;
  padding: 16px 0 0 0;
  border-top: 1px solid #f0f0f0;
}

</style>

<style lang="scss">
@media print {
  @page {
    size: portrait;
    margin: 5mm;
  }

  body {
    margin: 0;
    padding: 0;
    overflow: visible;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body > #app {
    display: none !important;
  }

  .ant-modal-mask {
    display: none !important;
  }

  .ant-modal-wrap {
    position: static !important;
    overflow: visible !important;
  }

  .ant-modal {
    position: static !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
  }

  .ant-modal-content {
    box-shadow: none !important;
    border: none !important;
  }

  .ant-modal-close,
  .ant-modal-header {
    display: none !important;
  }

  .ant-modal-body {
    padding: 0 !important;
    overflow: visible !important;
    max-height: none !important;
  }

  .modal-footer {
    display: none !important;
  }

  .print-content {
    padding: 0 !important;
    min-height: auto !important;
    overflow: visible !important;
    page-break-inside: auto;
    font-size: 11px !important;
    box-shadow: none !important;
  }

  // 页面标题
  .page-header {
    margin-bottom: 8px !important;

    .company-name {
      font-size: 20px !important;
    }

    .contract-title {
      font-size: 16px !important;
    }
  }

  // 顶部信息区域
  .top-section {
    margin-bottom: 8px !important;

    .contract-number-row {
      margin-bottom: 6px !important;
      font-size: 11px !important;
    }

    .parties-row {
      gap: 10px !important;
    }

    .party-info {
      padding: 6px 8px !important;
      box-shadow: none !important;

      .party-title {
        font-size: 11px !important;
        margin-bottom: 4px !important;
        padding-bottom: 3px !important;
      }

      .info-item {
        margin-bottom: 3px !important;
        font-size: 10px !important;
      }
    }
  }

  // 中间区域
  .middle-section {
    margin-bottom: 8px !important;

    .intro-text {
      font-size: 11px !important;
      margin-bottom: 6px !important;
    }

    .product-table {
      th {
        padding: 3px 4px !important;
        font-size: 10px !important;
      }

      td {
        padding: 3px 4px !important;
        font-size: 10px !important;
      }
    }
  }

  // 合同条款
  .terms-section {
    margin-bottom: 8px !important;
    padding: 6px 8px !important;
    box-shadow: none !important;

    .term-item {
      font-size: 9px !important;
      line-height: 1.4 !important;
      margin-bottom: 2px !important;
    }
  }

  // 底部信息
  .footer-section {
    margin-top: 8px !important;
    gap: 15px !important;

    .footer-title {
      font-size: 11px !important;
      margin-bottom: 6px !important;
    }

    .footer-content {
      padding: 6px 8px !important;
      box-shadow: none !important;
    }

    .footer-item {
      margin-bottom: 4px !important;
      font-size: 10px !important;

      .footer-label {
        min-width: 50px !important;
      }
    }

    .sign-box {
      margin-top: 6px !important;
      padding-top: 6px !important;

      .sign-label {
        font-size: 10px !important;
      }
    }
  }
}
</style>
