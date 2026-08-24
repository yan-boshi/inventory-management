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
        <h1 class="title-en editable" @click="handleEdit('titleEn')">
          {{ formData.titleEn || 'Packing List' }}
        </h1>
        <h2 class="title-zh editable" @click="handleEdit('titleZh')">
          {{ formData.titleZh || '装箱单' }}
        </h2>
      </div>

      <!-- 中间信息区域 -->
      <div class="middle-info">
        <div class="middle-right">
          <div class="info-row">
            <span class="label"><span class="required">*</span> Packing No.</span>
            <span class="value editable" @click="handleEdit('packingNo')">
              {{ formData.packingNo || '-' }}
            </span>
          </div>
          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value editable" @click="handleEdit('packingDate')">
              {{ formData.packingDate || '-' }}
            </span>
          </div>
          <div class="info-row" v-if="source === 'sales'">
            <span class="label">PO.:</span>
            <span class="value">{{ poNumber || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 卖方买方信息容器 -->
      <div class="parties-container">
        <!-- 卖方信息 -->
        <div class="seller-section">
          <div class="info-item">
            <span class="label">Seller(卖方公司):</span>
            <span class="value editable" @click="handleEdit('sellerName')">
              {{ formData.sellerName || '-' }}
            </span>
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
              <th style="min-width: 140px">Name of goods<br />（商品名称）</th>
              <th style="min-width: 160px">Description<br />（产品描述）</th>
              <th style="width: 80px">Quantity<br />（数量）</th>
              <th style="width: 80px">Unit<br />（单位）</th>
              <th v-if="source === 'documents'" style="width: 140px">Ref<br />（合同号）</th>
              <th style="width: 90px">Net weight<br />(KG)</th>
              <th style="width: 100px">Gross weight<br />(KG)</th>
              <th style="min-width: 100px">Remark<br />（备注）</th>
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
                />
              </td>
              <td>
                <a-input v-model:value="item.unit" size="small" placeholder="单位" />
              </td>
              <td v-if="source === 'documents'">
                <a-select
                  v-model:value="item.ref"
                  size="small"
                  placeholder="选择合同号"
                  show-search
                  allow-clear
                  :options="contractNumbers.map(cn => ({ label: cn, value: cn }))"
                  style="width: 100%"
                  @change="(value: string) => handleContractNumberChange(value, index)"
                />
              </td>
              <td>
                <a-input-number
                  v-model:value="item.netWeight"
                  size="small"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                />
              </td>
              <td>
                <a-input-number
                  v-model:value="item.grossWeight"
                  size="small"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                />
              </td>
              <td>
                <a-input v-model:value="item.remark" size="small" />
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
          <span class="label">Total No of pkgs:</span>
          <span class="value editable" @click="handleEdit('totalPackages')">
            {{ formData.totalPackages || '-' }}
          </span>
        </div>
        <div class="info-item">
          <span class="label">Trade terms成交方式：</span>
          <span class="value editable" @click="handleEdit('tradeTerms')">
            {{ formData.tradeTerms || '-' }}
          </span>
        </div>
        <div class="info-item">
          <span class="label">Country of Origin(原产国）</span>
          <span class="value editable" @click="handleEdit('countryOfOrigin')">
            {{ formData.countryOfOrigin || '-' }}
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
          <a-upload :before-upload="handleStampUpload" :show-upload-list="false" accept="image/*">
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
import { packingListsApi } from '@/api/packingLists'
import { salesOrdersApi } from '@/api/salesOrders'
import { customersApi } from '@/api/customers'

interface SalesOrderData {
  sales_order_id: string
  order_number: string
  contract_number?: string
  customer_name: string
  customer_code: string
  sales_items: string
  [key: string]: any
}

interface Props {
  visible: boolean
  source?: 'sales' | 'documents'  // 来源：sales=销售订单，documents=单据中心
  poNumber?: string  // PO.号，从销售订单传入
  salesOrderData?: SalesOrderData | null  // 销售订单数据
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  source: 'documents',
  poNumber: '',
  salesOrderData: null
})
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const userStore = useUserStore()

const formData = reactive({
  titleEn: 'Packing List',
  titleZh: '装箱单',
  packingNo: '',
  packingDate: dayjs().format('YYYY-MM-DD'),
  sellerName: 'Shenzhen SunStar Optical Electronics Company, LTD',
  sellerContact: '',
  sellerAddress:
    'Room 602, Jingfeng Building, No. 42 Wuhedadao (South), Nankun Community, Bantian Subdistrict, Longgang District, Shenzhen, China',
  sellerPhone: '',
  buyerName: '',
  buyerContact: '',
  buyerAddress: '',
  buyerPhone: '',
  totalPackages: '1',
  tradeTerms: 'FOB',
  countryOfOrigin: 'CHINA',
})

const orderItems = ref<any[]>([])
const loading = ref(false)
const contractNumbers = ref<string[]>([])
const customerOptions = ref<{ label: string; value: string }[]>([])
const selectedCustomer = ref<any>(null)
const poNumber = ref('')

const editModalVisible = ref(false)
const editField = ref('')
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// 印章相关
const stampModalVisible = ref(false)
const sellerStamp = ref<string>('')

const availableStamps = ref<string[]>([])

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
  reader.onload = e => {
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
  localStorage.setItem(
    'packing_list_stamps_new',
    JSON.stringify({
      seller: sellerStamp.value,
    })
  )
}

const loadStamps = () => {
  const saved = localStorage.getItem('packing_list_stamps_new')
  if (saved) {
    try {
      const { seller } = JSON.parse(saved)
      sellerStamp.value = seller || ''
    } catch (e) {}
  }
}

const editFieldTitle = computed(() => {
  const titles: Record<string, string> = {
    titleEn: '英文标题',
    titleZh: '中文标题',
    packingNo: '装箱单号',
    packingDate: '装箱日期',
    sellerName: '卖方公司',
    sellerContact: '卖方联系人',
    sellerAddress: '卖方地址',
    sellerPhone: '卖方电话',
    buyerName: '买方公司',
    buyerContact: '买方联系人',
    buyerAddress: '买方地址',
    buyerPhone: '买方电话',
    totalPackages: '总箱数',
    tradeTerms: '成交方式',
    countryOfOrigin: '原产国',
  }
  return titles[editField.value] || '编辑'
})

const initializeFormData = async () => {
  const user = userStore.user

  formData.packingNo = ''
  formData.packingDate = dayjs().format('YYYY-MM-DD')
  formData.totalPackages = '1'
  formData.tradeTerms = 'FOB'
  formData.countryOfOrigin = 'CHINA'

  // 从登录用户获取联系人和电话
  formData.sellerContact = user?.username || ''
  formData.sellerPhone = user?.phone || ''

  // 设置 PO.号
  poNumber.value = props.poNumber || ''

  // 如果是从销售订单进入，自动填充买方信息和商品信息
  if (props.source === 'sales' && props.salesOrderData) {
    const order = props.salesOrderData

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
      orderItems.value = items.map((item: any) => ({
        product_name: item.product_name || '',
        description: item.description || item.model || '',
        ref: order.contract_number || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'PCS',
        netWeight: '',
        grossWeight: '',
        remark: '',
      }))
    } catch (error) {
      console.error('解析销售订单商品失败:', error)
      orderItems.value = []
    }
  } else {
    // 单据中心模式，初始化空列表
    formData.buyerName = ''
    formData.buyerContact = ''
    formData.buyerAddress = ''
    formData.buyerPhone = ''
    orderItems.value = []
  }

  contractNumbers.value = []
  selectedCustomer.value = null
}

watch(
  () => props.visible,
  newVal => {
    if (newVal) {
      initializeFormData()
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
      value: customer.customer_name,
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
    contractNumbers.value = []
    return
  }

  try {
    // 获取客户详情
    const response = await customersApi.getAll({ name: customerName })
    const customers = response?.data || []
    const customer = customers.find((c: any) => c.customer_name === customerName)

    if (customer) {
      selectedCustomer.value = customer
      formData.buyerContact = customer.contact || ''
      formData.buyerAddress = customer.register_address || customer.receiver_address || ''
      formData.buyerPhone = customer.contact_phone || customer.customer_phone || ''
    }

    // 获取该客户的未出库合同号
    await fetchContractNumbers(customerName)
  } catch (error) {
    console.error('获取客户信息失败:', error)
    message.error('获取客户信息失败')
  }
}

const fetchContractNumbers = async (customerName?: string) => {
  try {
    const response = await salesOrdersApi.getUndeliveredContractNumbers(customerName)
    contractNumbers.value = response.data || []
  } catch (error) {
    console.error('获取合同号列表失败:', error)
    contractNumbers.value = []
  }
}

const handleAddItem = () => {
  orderItems.value.push({
    product_name: '',
    description: '',
    ref: '',
    quantity: 1,
    unit: 'PCS',
    netWeight: 0,
    grossWeight: 0,
    remark: '',
  })
}

const handleDeleteItem = (index: number) => {
  orderItems.value.splice(index, 1)
}

const handleContractNumberChange = async (contractNumber: string, index: number) => {
  if (!contractNumber) {
    return
  }

  try {
    const response = await salesOrdersApi.getSalesItemsByContractNumber(contractNumber)
    // 由于响应拦截器返回的是 response.data，所以 response 结构是 {success: true, data: {...}}
    const data = response?.data

    if (data?.sales_items && data.sales_items.length > 0) {
      // 删除当前空行（如果存在）
      if (orderItems.value[index] && !orderItems.value[index].product_name) {
        orderItems.value.splice(index, 1)
      }

      // 将合同号下的所有商品添加到装箱单
      const newItems = data.sales_items.map((item: any) => ({
        product_name: item.product_name || '',
        description: item.description || item.model || '',
        ref: contractNumber,
        quantity: item.quantity || 1,
        unit: item.unit || 'PCS',
        netWeight: 0,
        grossWeight: 0,
        remark: '',
      }))

      // 在当前位置插入新商品
      orderItems.value.splice(index, 0, ...newItems)

      message.success(`已同步 ${newItems.length} 个商品`)
    }
  } catch (error) {
    console.error('获取合同产品信息失败:', error)
    message.error('获取合同产品信息失败')
  }
}

const handleEdit = (field: string) => {
  editField.value = field

  switch (field) {
    case 'titleEn':
      editValue.value = formData.titleEn
      break
    case 'titleZh':
      editValue.value = formData.titleZh
      break
    case 'packingNo':
      editValue.value = formData.packingNo
      break
    case 'packingDate':
      editValue.value = formData.packingDate
      break
    case 'sellerName':
      editValue.value = formData.sellerName
      break
    case 'sellerContact':
      editValue.value = formData.sellerContact
      break
    case 'sellerAddress':
      editValue.value = formData.sellerAddress
      break
    case 'sellerPhone':
      editValue.value = formData.sellerPhone
      break
    case 'buyerName':
      editValue.value = formData.buyerName
      break
    case 'buyerContact':
      editValue.value = formData.buyerContact
      break
    case 'buyerAddress':
      editValue.value = formData.buyerAddress
      break
    case 'buyerPhone':
      editValue.value = formData.buyerPhone
      break
    case 'totalPackages':
      editValue.value = formData.totalPackages
      break
    case 'tradeTerms':
      editValue.value = formData.tradeTerms
      break
    case 'countryOfOrigin':
      editValue.value = formData.countryOfOrigin
      break
  }
  editModalVisible.value = true
}

const handleEditConfirm = () => {
  switch (editField.value) {
    case 'titleEn':
      formData.titleEn = editValue.value
      break
    case 'titleZh':
      formData.titleZh = editValue.value
      break
    case 'packingNo':
      formData.packingNo = editValue.value
      break
    case 'packingDate':
      formData.packingDate = editValue.value
      break
    case 'sellerName':
      formData.sellerName = editValue.value
      break
    case 'sellerContact':
      formData.sellerContact = editValue.value
      break
    case 'sellerAddress':
      formData.sellerAddress = editValue.value
      break
    case 'sellerPhone':
      formData.sellerPhone = editValue.value
      break
    case 'buyerName':
      formData.buyerName = editValue.value
      break
    case 'buyerContact':
      formData.buyerContact = editValue.value
      break
    case 'buyerAddress':
      formData.buyerAddress = editValue.value
      break
    case 'buyerPhone':
      formData.buyerPhone = editValue.value
      break
    case 'totalPackages':
      formData.totalPackages = editValue.value
      break
    case 'tradeTerms':
      formData.tradeTerms = editValue.value
      break
    case 'countryOfOrigin':
      formData.countryOfOrigin = editValue.value
      break
  }
  editModalVisible.value = false
}

const handleCancel = () => {
  // 清空所有表单数据
  formData.titleEn = 'Packing List'
  formData.titleZh = '装箱单'
  formData.packingNo = ''
  formData.packingDate = dayjs().format('YYYY-MM-DD')
  formData.sellerName = 'Shenzhen SunStar Optical Electronics Company, LTD'
  formData.sellerContact = ''
  formData.sellerAddress =
    'Room 602, Jingfeng Building, No. 42 Wuhedadao (South), Nankun Community, Bantian Subdistrict, Longgang District, Shenzhen, China'
  formData.sellerPhone = ''
  formData.buyerName = ''
  formData.buyerContact = ''
  formData.buyerAddress = ''
  formData.buyerPhone = ''
  formData.totalPackages = '1'
  formData.tradeTerms = 'FOB'
  formData.countryOfOrigin = 'CHINA'
  orderItems.value = []
  contractNumbers.value = []
  selectedCustomer.value = null
  sellerStamp.value = ''
  visible.value = false
}

const handleSaveAndPrint = async () => {
  if (!formData.packingNo) {
    message.error('请填写Packing No.')
    return
  }

  loading.value = true

  try {
    const saveData = {
      packing_no: formData.packingNo,
      packing_date: formData.packingDate,
      po_number: '',
      sales_order_id: '',
      seller_name: formData.sellerName,
      seller_contact: formData.sellerContact,
      seller_address: formData.sellerAddress,
      seller_phone: formData.sellerPhone,
      buyer_name: formData.buyerName,
      buyer_contact: formData.buyerContact,
      buyer_address: formData.buyerAddress,
      buyer_phone: formData.buyerPhone,
      packing_items: orderItems.value,
      total_packages: formData.totalPackages,
      trade_terms: formData.tradeTerms,
      country_of_origin: formData.countryOfOrigin,
      title_en: formData.titleEn,
      title_zh: formData.titleZh,
      seller_stamp: sellerStamp.value,
    }

    await packingListsApi.create(saveData)
    message.success('装箱单保存成功')

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
    console.error('保存装箱单失败:', error)
    if (error.response?.data?.message) {
      message.error(error.response.data.message)
    } else {
      message.error('保存装箱单失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.print-content {
  padding: 35px 20px;
  background: white;
  min-height: 700px;
  position: relative;
}

.page-header {
  text-align: center;
  margin-bottom: 18px;

  .title-en {
    font-size: 26px;
    font-weight: bold;
    margin: 0 0 4px 0;
    color: #000;
    cursor: pointer;
    display: block;
    padding: 3px 6px;
    border-radius: 4px;

    &:hover {
      background-color: #e6f7ff;
    }

    &::after {
      content: ' ✎';
      font-size: 15px;
      opacity: 0.5;
    }
  }

  .title-zh {
    font-size: 22px;
    font-weight: bold;
    margin: 0;
    color: #000;
    cursor: pointer;
    display: block;
    padding: 3px 6px;
    border-radius: 4px;

    &:hover {
      background-color: #e6f7ff;
    }

    &::after {
      content: ' ✎';
      font-size: 13px;
      opacity: 0.5;
    }
  }
}

.middle-info {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  margin-bottom: 18px;
  padding-right: 10%;

  .middle-right {
    text-align: right;

    .info-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-bottom: 6px;
      font-size: 13px;

      .label {
        font-weight: bold;
        color: #000;
        min-width: 90px;
        text-align: right;
        padding-right: 7px;

        .required {
          color: #ff4d4f;
          margin-right: 3px;
        }
      }

      .value {
        color: #000;
        min-width: 110px;
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
  margin-bottom: 18px;
  width: 100%;

  .seller-section,
  .buyer-section {
    padding: 14px;
    border: 1px solid #e8e8e8;
    background: #fafafa;
    margin-bottom: 14px;

    &:last-child {
      margin-bottom: 0;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 8px;
      font-size: 13px;
      color: #000;

      &.address {
        .value {
          display: inline-block;
          max-width: 550px;
          white-space: pre-wrap;
        }
      }

      .label {
        color: #595959;
        min-width: 150px;
        text-align: right;
        padding-right: 11px;
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
  margin-bottom: 25px;

  .table-header {
    margin-bottom: 11px;
    text-align: right;
  }

  .product-table {
    width: 100%;
    border-collapse: collapse;

    th {
      padding: 9px 7px;
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      font-weight: 500;
      font-size: 12px;
      color: #262626;
      text-align: center;
    }

    td {
      padding: 7px 5px;
      border: 1px solid #e8e8e8;
      text-align: center;
      font-size: 12px;
      color: #000;
      vertical-align: middle;
    }
  }
}

.bottom-section {
  margin-bottom: 25px;
  padding: 14px;
  border: 1px solid #e8e8e8;
  background: #fafafa;

  .info-item {
    margin-bottom: 8px;
    font-size: 13px;
    color: #000;

    .label {
      color: #595959;
      margin-right: 7px;
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

.signature-section {
  margin-top: 35px;
  display: flex;
  justify-content: flex-end;

  .signature-box {
    width: 230px;
    min-height: 110px;
    border: 1px dashed #d9d9d9;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;

    .signature-label {
      color: #595959;
      font-size: 13px;
    }

    .stamp-image {
      max-width: 190px;
      max-height: 90px;
      margin-top: 9px;
      object-fit: contain;
    }

    .stamp-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: 9px;
      color: #bfbfbf;
      font-size: 12px;

      .anticon {
        font-size: 22px;
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
    size: A4 portrait;
    margin: 8mm;
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

  .no-print {
    display: none !important;
  }

  .table-header {
    display: none !important;
  }

  .print-content {
    padding: 0 !important;
    min-height: auto !important;
    overflow: visible !important;
    page-break-inside: avoid;
    font-size: 11px !important;
    box-shadow: none !important;
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

  // 页面标题
  .page-header {
    margin-bottom: 8px !important;

    .title-en {
      font-size: 18px !important;
      cursor: default !important;
      padding: 0 !important;
      margin: 0 !important;

      &:hover {
        background-color: transparent !important;
      }
    }

    .title-zh {
      font-size: 15px !important;
      cursor: default !important;
      padding: 0 !important;
      margin: 0 !important;

      &:hover {
        background-color: transparent !important;
      }
    }
  }

  // 中间信息
  .middle-info {
    margin-bottom: 8px !important;

    .middle-right {
      .info-row {
        margin-bottom: 3px !important;
        font-size: 11px !important;

        .label {
          min-width: 80px !important;
        }
      }
    }
  }

  // 卖方买方信息
  .parties-container {
    width: 100% !important;
    margin-bottom: 8px !important;

    .seller-section,
    .buyer-section {
      padding: 6px 8px !important;
      box-shadow: none !important;
      margin-bottom: 8px !important;

      &:last-child {
        margin-bottom: 0 !important;
      }

      .info-item {
        margin-bottom: 3px !important;
        font-size: 11px !important;
      }
    }
  }

  // 表格区域
  .table-section {
    margin-bottom: 8px !important;

    .product-table {
      border: 1px solid #000 !important;

      th {
        padding: 4px 5px !important;
        font-size: 10px !important;
        border: 1px solid #333 !important;
      }

      td {
        padding: 4px 5px !important;
        font-size: 10px !important;
        border: 1px solid #333 !important;
      }
    }
  }

  // 底部信息
  .bottom-section {
    margin-bottom: 8px !important;
    padding: 6px 8px !important;
    box-shadow: none !important;

    .info-item {
      margin-bottom: 3px !important;
      font-size: 11px !important;
    }
  }

  // 签章区域
  .signature-section {
    margin-top: 15px !important;

    .signature-box {
      min-height: 70px !important;
      border: none !important;

      .signature-label {
        font-size: 11px !important;
      }

      .stamp-image {
        max-width: 160px !important;
        max-height: 70px !important;
      }

      .stamp-placeholder {
        display: none !important;
      }
    }
  }

  // 隐藏输入框边框，使其看起来像普通文本
  :deep(.ant-input),
  :deep(.ant-input-number),
  :deep(.ant-input-number-input),
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

  :deep(.ant-select-selection-item),
  :deep(.ant-select-selection-search) {
    border: none !important;
  }

  // 隐藏下拉箭头
  :deep(.ant-select-arrow),
  :deep(.ant-select-clear) {
    display: none !important;
  }

  // 表格内输入框样式
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