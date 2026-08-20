<template>
  <a-modal
    v-model:open="visible"
    title=""
    width="1000px"
    :footer="null"
    :closable="true"
    @cancel="handleCancel"
  >
    <div ref="printContent" class="print-content">
      <!-- 页面头 -->
      <div class="page-header">
        <h1 class="title-en">Commercial Invoice</h1>
        <h2 class="title-zh">商业发票</h2>
      </div>

      <!-- 中间信息区域 -->
      <div class="middle-info">
        <div class="middle-right">
          <div class="info-row">
            <span class="label">Invoice No.</span>
            <span class="value editable" @click="handleEdit('invoiceNumber')">
              {{ formData.invoiceNumber || '-' }}
            </span>
          </div>
          <div class="info-row" v-if="source === 'sales'">
            <span class="label">SO.:</span>
            <span class="value">{{ formData.soNumber || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value editable" @click="handleEdit('invoiceDate')">
              {{ formData.invoiceDate || '-' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 卖方买方信息容器 -->
      <div class="parties-container">
        <!-- 卖方信息 -->
        <div class="seller-section">
          <div class="info-item">
            <span class="label">Seller(卖方公司):</span>
            <span class="value">{{ formData.sellerName || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Contact person(联系人):</span>
            <span class="value editable" @click="handleEdit('sellerContact')">
              {{ formData.sellerContact || '-' }}
            </span>
          </div>
          <div class="info-item address">
            <span class="label">Address(地址):</span>
            <span class="value editable" @click="handleEdit('sellerAddress')">
              {{ formData.sellerAddress || '-' }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">Phone NO(电话):</span>
            <span class="value editable" @click="handleEdit('sellerPhone')">
              {{ formData.sellerPhone || '-' }}
            </span>
          </div>
        </div>

        <!-- 买方信息 -->
        <div class="buyer-section">
          <div class="info-item">
            <span class="label">Buyer(买方公司):</span>
            <a-select
              v-model:value="formData.buyerName"
              placeholder="选择买方公司"
              show-search
              allow-clear
              :options="customerOptions"
              style="width: 300px"
              @change="handleCustomerChange"
            />
          </div>
          <div class="info-item">
            <span class="label">Contact person(联系人):</span>
            <span class="value editable" @click="handleEdit('buyerContact')">
              {{ formData.buyerContact || '-' }}
            </span>
          </div>
          <div class="info-item address">
            <span class="label">Address(地址):</span>
            <span class="value editable" @click="handleEdit('buyerAddress')">
              {{ formData.buyerAddress || '-' }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">Phone NO(电话):</span>
            <span class="value editable" @click="handleEdit('buyerPhone')">
              {{ formData.buyerPhone || '-' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 产品表格 -->
      <div class="table-section">
        <div class="table-header">
          <a-button type="primary" size="small" @click="handleAddItem">
            <PlusOutlined /> 添加商品
          </a-button>
        </div>
        <table class="product-table">
          <thead>
            <tr>
              <th style="min-width: 140px">Name of goods<br/>（商品名称）</th>
              <th style="min-width: 160px">Description<br/>（产品描述）</th>
              <th style="width: 80px">Quantity<br/>（数量）</th>
              <th v-if="source !== 'sales'" style="width: 80px">Unit<br/>（单位）</th>
              <th style="width: 100px">Unit value</th>
              <th style="width: 120px">Total value</th>
              <th v-if="source !== 'sales'" style="min-width: 120px">Ref<br/>（合同号）</th>
              <th style="min-width: 100px">Remark<br/>（备注）</th>
              <th style="width: 60px" class="no-print">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in orderItems" :key="index">
              <td>
                <a-input v-model:value="item.product_name" size="small" placeholder="商品名称" />
              </td>
              <td>
                <a-input v-model:value="item.description" size="small" placeholder="产品描述" />
              </td>
              <td>
                <a-input-number
                  v-model:value="item.quantity"
                  size="small"
                  :min="0"
                  style="width: 100%"
                  @change="calculateItemTotal(index)"
                />
              </td>
              <td v-if="source !== 'sales'">
                <a-input v-model:value="item.unit" size="small" placeholder="单位" />
              </td>
              <td>
                <a-input-number
                  v-model:value="item.unit_value"
                  size="small"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  @change="calculateItemTotal(index)"
                />
              </td>
              <td>
                <span class="total-value">{{ item.total_value || 0 }}</span>
              </td>
              <td v-if="source !== 'sales'">
                <a-input v-model:value="item.contract_number" size="small" placeholder="合同号" />
              </td>
              <td>
                <a-input v-model:value="item.remark" size="small" placeholder="备注" />
              </td>
              <td class="no-print">
                <a-button type="link" size="small" danger @click="handleDeleteItem(index)">
                  删除
                </a-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 底部信息 -->
      <div class="bottom-section">
        <div class="info-item">
          <span class="label">Total value:</span>
          <span class="value" style="font-weight: bold;">{{ totalValue }}</span>
        </div>
        <div class="info-item">
          <span class="label">Trade terms成交方式：</span>
          <span class="value editable" @click="handleEdit('tradeTerms')">
            {{ formData.tradeTerms || '-' }}
          </span>
        </div>
      </div>

      <!-- 银行信息 -->
      <div class="bank-section">
        <div class="info-item">
          <span class="label highlight">Beneficiary Bank/Creditor Agent:</span>
          <span class="value editable" @click="handleEdit('bankName')">
            {{ formData.bankName || '-' }} {{ formData.bankAddress || '' }}
          </span>
        </div>
        <div class="info-item">
          <span class="label">SWIFT:</span>
          <span class="value editable" @click="handleEdit('swiftCode')">
            {{ formData.swiftCode || '-' }}
          </span>
        </div>
        <div class="info-item">
          <span class="label highlight">Beneficiary/Creditor:</span>
        </div>
        <div class="info-item">
          <span class="label">NAME:</span>
          <span class="value editable" @click="handleEdit('beneficiaryName')">
            {{ formData.beneficiaryName || '-' }}
          </span>
        </div>
        <div class="info-item">
          <span class="label">ADDRESS:</span>
          <span class="value editable" @click="handleEdit('beneficiaryAddress')">
            {{ formData.beneficiaryAddress || '-' }}
          </span>
        </div>
        <div class="info-item">
          <span class="label">ACCOUNT NO.:</span>
          <span class="value editable" @click="handleEdit('accountNumber')">
            {{ formData.accountNumber || '-' }}
          </span>
        </div>
      </div>

      <!-- 签章区域 -->
      <div class="signature-section">
        <div class="signature-box" @click="handleStampClick">
          <span class="signature-label">Seller's signature/chop</span>
          <img v-if="sellerStamp" :src="sellerStamp" class="stamp-image" alt="卖方签章" />
          <div v-else class="stamp-placeholder">
            <UploadOutlined />
            <span>点击盖章</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button @click="handleClearStamps" v-if="sellerStamp">清除印章</a-button>
        <a-button type="primary" @click="handleSaveAndPrint" :loading="loading">
          保存并打印
        </a-button>
      </a-space>
    </div>

    <!-- 印章选择弹窗 -->
    <a-modal
      v-model:open="stampModalVisible"
      title="选择电子印章"
      @cancel="stampModalVisible = false"
      :footer="null"
      width="400px"
    >
      <div class="stamp-selection">
        <div class="stamp-list">
          <div
            v-for="(stamp, index) in availableStamps"
            :key="index"
            class="stamp-item"
            @click="selectStamp(stamp)"
          >
            <img :src="stamp" :alt="'印章' + (index + 1)" />
          </div>
        </div>
        <div class="stamp-upload">
          <a-upload
            :before-upload="handleStampUpload"
            :show-upload-list="false"
            accept="image/*"
          >
            <a-button>
              <UploadOutlined />
              上传自定义印章
            </a-button>
          </a-upload>
        </div>
      </div>
    </a-modal>

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
import { UploadOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/stores/user'
import { invoicesApi } from '@/api/invoices'
import { customersApi } from '@/api/customers'

interface Props {
  visible: boolean
  source?: 'sales' | 'documents'
  salesOrderData?: any
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  source: 'documents',
  salesOrderData: null
})

const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const userStore = useUserStore()

const formData = reactive({
  invoiceNumber: '',
  soNumber: '',
  invoiceDate: dayjs().format('YYYY-MM-DD'),
  sellerName: 'Shenzhen SunStar Optical Electronics Company, LTD',
  sellerNameCn: '深圳市旭思达光电科技有限公司',
  sellerContact: '',
  sellerAddress: 'Room 602, Jingfeng Building, No. 42 Wuhedadao (South), Nankun Community, Bantian Subdistrict, Longgang District, Shenzhen, China',
  sellerPhone: '',
  buyerName: '',
  buyerContact: '',
  buyerAddress: '',
  buyerPhone: '',
  tradeTerms: 'FOB',
  bankName: 'CHINA MERCHANTS BANK, HEAD OFFICE,',
  bankAddress: 'SHENZHEN, P.R.CHINA',
  swiftCode: 'CMBCCNBSXXX',
  beneficiaryName: 'Shenzhen SunStar Optical Electronics Company, LTD',
  beneficiaryAddress: 'Room 602, Jingfeng Building, No. 42 Wuhedadao (South), Bantian Street, Shenzhen, China',
  accountNumber: '755984586699001',
})

const orderItems = ref<any[]>([])
const loading = ref(false)
const customerOptions = ref<{ label: string; value: string }[]>([])
const selectedCustomer = ref<any>(null)

const editModalVisible = ref(false)
const editField = ref('')
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// 印章相关
const stampModalVisible = ref(false)
const sellerStamp = ref<string>('')
const availableStamps = ref<string[]>([])

// 计算总金额
const totalValue = computed(() => {
  return orderItems.value.reduce((sum, item) => sum + (item.total_value || 0), 0)
})

const handleStampClick = () => {
  stampModalVisible.value = true
}

const selectStamp = (stamp: string) => {
  sellerStamp.value = stamp
  stampModalVisible.value = false
  saveStamps()
}

const handleStampUpload = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    sellerStamp.value = result
    stampModalVisible.value = false
    saveStamps()
    message.success('印章上传成功')
  }
  reader.readAsDataURL(file)
  return false
}

const handleClearStamps = () => {
  sellerStamp.value = ''
  saveStamps()
  message.success('印章已清除')
}

const saveStamps = () => {
  localStorage.setItem('invoice_stamps_new', JSON.stringify({
    seller: sellerStamp.value,
  }))
}

const loadStamps = () => {
  const saved = localStorage.getItem('invoice_stamps_new')
  if (saved) {
    try {
      const { seller } = JSON.parse(saved)
      sellerStamp.value = seller || ''
    } catch (e) {}
  }
}

const editFieldTitle = computed(() => {
  const titles: Record<string, string> = {
    invoiceNumber: '发票号',
    soNumber: 'SO.号',
    invoiceDate: '开票日期',
    sellerContact: '卖方联系人',
    sellerAddress: '卖方地址',
    sellerPhone: '卖方电话',
    buyerContact: '买方联系人',
    buyerAddress: '买方地址',
    buyerPhone: '买方电话',
    tradeTerms: '成交方式',
    bankName: '银行名称',
    bankAddress: '银行地址',
    swiftCode: 'SWIFT代码',
    beneficiaryName: '收款人名称',
    beneficiaryAddress: '收款人地址',
    accountNumber: '账号',
  }
  return titles[editField.value] || '编辑'
})

const initializeFormData = async () => {
  const user = userStore.user

  formData.invoiceNumber = ''
  formData.soNumber = ''
  formData.invoiceDate = dayjs().format('YYYY-MM-DD')
  formData.buyerName = ''
  formData.buyerContact = ''
  formData.buyerAddress = ''
  formData.buyerPhone = ''
  formData.tradeTerms = 'FOB'

  // 从登录用户获取联系人和电话
  formData.sellerContact = user?.username || ''
  formData.sellerPhone = user?.phone || ''

  // 如果是从销售订单进入，自动填充信息
  if (props.source === 'sales' && props.salesOrderData) {
    const order = props.salesOrderData
    formData.soNumber = order.contract_number || ''
    formData.tradeTerms = order.payment_method || 'FOB'

    // 获取客户信息
    if (order.customer_code) {
      try {
        const response = await customersApi.getAll({ code: order.customer_code })
        const customers = response?.data || []
        if (customers.length > 0) {
          const customer = customers[0]
          formData.buyerName = customer.customer_name || ''
          formData.buyerContact = customer.contact || ''
          formData.buyerAddress = customer.register_address || customer.receiver_address || ''
          formData.buyerPhone = customer.contact_phone || customer.customer_phone || ''
        }
      } catch (error) {
        console.error('获取客户信息失败:', error)
      }
    }

    // 解析销售订单商品列表
    try {
      const items = JSON.parse(order.sales_items || '[]')
      orderItems.value = items.map((item: any, index: number) => ({
        no: index + 1,
        product_name: item.product_name || '',
        description: item.description || item.model || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'PCS',
        unit_value: item.tax_excluded_price || 0,
        total_value: (item.quantity || 1) * (item.tax_excluded_price || 0),
        remark: '',
      }))
    } catch (error) {
      console.error('解析销售订单商品失败:', error)
      orderItems.value = []
    }
  } else {
    orderItems.value = []
  }
}

watch(
  () => props.visible,
  async newVal => {
    if (newVal) {
      await initializeFormData()
      loadStamps()
      fetchCustomers()
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

const fetchCustomers = async () => {
  try {
    const response = await customersApi.getAllList()
    const data = response?.data || []
    customerOptions.value = data.map((customer: any) => ({
      label: customer.customer_name,
      value: customer.customer_name
    }))
  } catch (error) {
    console.error('获取客户列表失败:', error)
    customerOptions.value = []
  }
}

const handleCustomerChange = async (customerName: string) => {
  if (!customerName) {
    selectedCustomer.value = null
    formData.buyerContact = ''
    formData.buyerAddress = ''
    formData.buyerPhone = ''
    return
  }

  try {
    const response = await customersApi.getAll({ name: customerName })
    const customers = response?.data || []
    const customer = customers.find((c: any) => c.customer_name === customerName)

    if (customer) {
      selectedCustomer.value = customer
      formData.buyerContact = customer.contact || ''
      formData.buyerAddress = customer.register_address || customer.receiver_address || ''
      formData.buyerPhone = customer.contact_phone || customer.customer_phone || ''
    }
  } catch (error) {
    console.error('获取客户信息失败:', error)
    message.error('获取客户信息失败')
  }
}

const calculateItemTotal = (index: number) => {
  const item = orderItems.value[index]
  item.total_value = (item.quantity || 0) * (item.unit_value || 0)
}

const handleAddItem = () => {
  orderItems.value.push({
    no: orderItems.value.length + 1,
    product_name: '',
    description: '',
    quantity: 1,
    unit: 'PCS',
    unit_value: 0,
    total_value: 0,
    remark: '',
  })
}

const handleDeleteItem = (index: number) => {
  orderItems.value.splice(index, 1)
  // 重新编号
  orderItems.value.forEach((item, idx) => {
    item.no = idx + 1
  })
}

const handleEdit = (field: string) => {
  editField.value = field
  editValue.value = (formData as any)[field] || ''
  editModalVisible.value = true
}

const handleEditConfirm = () => {
  (formData as any)[editField.value] = editValue.value
  editModalVisible.value = false
}

const handleCancel = () => {
  visible.value = false
}

const handleSaveAndPrint = async () => {
  if (!formData.invoiceNumber) {
    message.error('请填写Invoice No.')
    return
  }

  loading.value = true

  try {
    const saveData = {
      invoice_number: formData.invoiceNumber,
      so_number: formData.soNumber,
      invoice_date: formData.invoiceDate,
      seller_name: formData.sellerName,
      seller_contact: formData.sellerContact,
      seller_address: formData.sellerAddress,
      seller_phone: formData.sellerPhone,
      buyer_name: formData.buyerName,
      buyer_contact: formData.buyerContact,
      buyer_address: formData.buyerAddress,
      buyer_phone: formData.buyerPhone,
      trade_terms: formData.tradeTerms,
      currency: 'USD',
      invoice_items: orderItems.value,
      total_value: totalValue.value,
      bank_name: formData.bankName,
      bank_address: formData.bankAddress,
      swift_code: formData.swiftCode,
      beneficiary_name: formData.beneficiaryName,
      beneficiary_address: formData.beneficiaryAddress,
      account_number: formData.accountNumber,
      seller_stamp: sellerStamp.value,
      sales_order_id: props.salesOrderData?.sales_order_id || null,
      customer_code: selectedCustomer.value?.customer_code || props.salesOrderData?.customer_code || null,
    }

    await invoicesApi.create(saveData)
    message.success('发票保存成功')

    // Print after save
    const modalEl = document.querySelector('.ant-modal') as HTMLElement
    const originalWidth = modalEl?.style.width
    if (modalEl) {
      modalEl.style.width = '100%'
    }
    window.print()
    if (modalEl && originalWidth) {
      modalEl.style.width = originalWidth
    }

    emit('success')
  } catch (error: any) {
    console.error('保存发票失败:', error)
    if (error.response?.data?.message) {
      message.error(error.response.data.message)
    } else {
      message.error('保存发票失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.print-content {
  padding: 15px 20px;
  background: white;
  min-height: auto;
  position: relative;
}

.page-header {
  text-align: center;
  margin-bottom: 8px;

  .title-en {
    font-size: 22px;
    font-weight: bold;
    margin: 0 0 2px 0;
    color: #000;
    cursor: pointer;
    display: block;
    padding: 2px 8px;
    border-radius: 4px;

    &:hover {
      background-color: #e6f7ff;
    }

    &::after {
      content: ' ✎';
      font-size: 14px;
      opacity: 0.5;
    }
  }

  .title-zh {
    font-size: 18px;
    font-weight: bold;
    margin: 0;
    color: #000;
    cursor: pointer;
    display: block;
    padding: 2px 8px;
    border-radius: 4px;

    &:hover {
      background-color: #e6f7ff;
    }

    &::after {
      content: ' ✎';
      font-size: 12px;
      opacity: 0.5;
    }
  }
}

.middle-info {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  margin-bottom: 8px;
  padding-right: 10%;

  .middle-right {
    text-align: right;

    .info-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-bottom: 4px;
      font-size: 12px;

      .label {
        font-weight: bold;
        color: #000;
        min-width: 100px;
        text-align: right;
        padding-right: 8px;

        .required {
          color: #ff4d4f;
          margin-right: 4px;
        }
      }

      .value {
        color: #000;
        min-width: 120px;
        text-align: left;

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

.parties-container {
  margin-bottom: 8px;
  width: 100%;

  .seller-section,
  .buyer-section {
    padding: 10px;
    border: 1px solid #e8e8e8;
    background: #fafafa;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 4px;
      font-size: 12px;
      color: #000;

      &.address {
        .value {
          display: inline-block;
          max-width: 600px;
          white-space: pre-wrap;
        }
      }

      .label {
        color: #595959;
        min-width: 160px;
        text-align: right;
        padding-right: 12px;
        flex-shrink: 0;
      }

      .value {
        color: #000;
        flex: 1;

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

.table-section {
  margin-bottom: 8px;

  .table-header {
    margin-bottom: 6px;
    text-align: right;
  }

  .product-table {
    width: 100%;
    border-collapse: collapse;

    th {
      padding: 5px 4px;
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      font-weight: 500;
      font-size: 11px;
      color: #262626;
      text-align: center;
    }

    td {
      padding: 3px 4px;
      border: 1px solid #e8e8e8;
      text-align: center;
      font-size: 11px;
      color: #000;
      vertical-align: middle;
    }

    .total-value {
      font-weight: 500;
    }
  }
}

.bottom-section {
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid #e8e8e8;
  background: #fafafa;

  .info-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 4px;
    font-size: 12px;
    color: #000;

    .label {
      color: #595959;
      min-width: 160px;
      text-align: right;
      padding-right: 12px;
      flex-shrink: 0;
    }

    .value {
      color: #000;
      flex: 1;

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

.bank-section {
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid #e8e8e8;
  background: #fafafa;

  .info-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 4px;
    font-size: 12px;
    color: #000;

    .label {
      color: #595959;
      min-width: 160px;
      text-align: right;
      padding-right: 12px;
      flex-shrink: 0;
      font-weight: 500;

      &.highlight {
        color: #003366;
        font-weight: bold;
      }
    }

    .value {
      color: #000;
      flex: 1;

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

.signature-section {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;

  .signature-box {
    width: 200px;
    min-height: 80px;
    border: 1px dashed #d9d9d9;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;

    .signature-label {
      color: #595959;
      font-size: 12px;
    }

    .stamp-image {
      max-width: 180px;
      max-height: 70px;
      margin-top: 5px;
      object-fit: contain;
    }

    .stamp-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: 10px;
      color: #bfbfbf;
      font-size: 12px;

      .anticon {
        font-size: 24px;
        margin-bottom: 4px;
      }
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
  }
}

.stamp-selection {
  .stamp-list {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;

    .stamp-item {
      width: 120px;
      height: 120px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 8px;

      &:hover {
        border-color: #1890ff;
        background-color: #f0f5ff;
      }

      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    }
  }

  .stamp-upload {
    text-align: center;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }
}

.modal-footer {
  text-align: right;
  padding: 16px 0 0 0;
  border-top: 1px solid #f0f0f0;
}

@media print {
  @page {
    margin: 8mm;
    size: A4;
  }

  .print-content {
    padding: 0;
    min-height: auto;
  }

  .no-print {
    display: none !important;
  }

  .modal-footer {
    display: none !important;
  }

  .table-header {
    display: none !important;
  }

  // 隐藏标题后的编辑图标
  .title-en::after,
  .title-zh::after {
    display: none !important;
  }

  // 隐藏可编辑内容的蓝色下划线
  .editable {
    border-bottom: none !important;
    color: #000 !important;
  }

  // 隐藏输入框边框
  :deep(.ant-input),
  :deep(.ant-input-number),
  :deep(.ant-select) {
    border: none !important;
    box-shadow: none !important;
    background-color: transparent !important;
  }

  :deep(.ant-select-selector) {
    border: none !important;
    box-shadow: none !important;
    background-color: transparent !important;
    padding: 0 !important;
  }

  :deep(.ant-select-arrow),
  :deep(.ant-select-clear) {
    display: none !important;
  }

  .product-table {
    :deep(.ant-input),
    :deep(.ant-input-number) {
      border: none !important;
      background-color: transparent !important;
    }

    td {
      border: 1px solid #d9d9d9 !important;
    }
  }
}
</style>
