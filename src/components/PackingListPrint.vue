<template>
  <a-modal
    v-model:open="visible"
    title=""
    width="900px"
    :footer="null"
    :closable="false"
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
          <div class="info-row">
            <span class="label">PO.:</span>
            <span class="value">{{ orderData?.contract_number || '-' }}</span>
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
          <span class="value">{{ customerData?.customer_name || '-' }}</span>
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
        <table class="product-table">
          <thead>
            <tr>
              <th style="min-width: 140px">Name of goods（商品名称）</th>
              <th style="min-width: 160px">Description（产品描述）</th>
              <th style="width: 80px">Quantity（数量）</th>
              <th style="width: 80px">Unit（单位）</th>
              <th style="width: 100px">Net weight(KG)</th>
              <th style="width: 120px">Gross weight(KG)</th>
              <th style="min-width: 120px">Remark（备注）</th>
              <th style="width: 60px" class="no-print">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in orderItems" :key="index">
              <td>{{ item.product_name || '-' }}</td>
              <td>{{ item.description || item.model || '-' }}</td>
              <td>{{ item.quantity || '-' }}</td>
              <td>{{ item.unit || 'PCS' }}</td>
              <td>
                <span class="editable" @click="handleEditItem(index, 'netWeight')">
                  {{ item.netWeight || '-' }}
                </span>
              </td>
              <td>
                <span class="editable" @click="handleEditItem(index, 'grossWeight')">
                  {{ item.grossWeight || '-' }}
                </span>
              </td>
              <td>
                <span class="editable" @click="handleEditItem(index, 'remark')">
                  {{ item.remark || '-' }}
                </span>
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
          <div v-else class="stamp-placeholder no-print">
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
import { UploadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import type { SalesOrder } from '@/types'
import { useUserStore } from '@/stores/user'
import { customersApi } from '@/api/customers'
import { packingListsApi } from '@/api/packingLists'

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
const orderItems = ref<any[]>([])
const customerData = ref<any>(null)
const userStore = useUserStore()

const formData = reactive({
  titleEn: 'Packing List',
  titleZh: '装箱单',
  packingNo: '',
  packingDate: dayjs().format('YYYY-MM-DD'),
  sellerName: 'Shenzhen SunStar Optical Electronics Company, LTD',
  sellerContact: '',
  sellerAddress: 'Room 602, Jingfeng Building, No. 42 Wuhedadao (South), Nankun Community, Bantian Subdistrict, Longgang District, Shenzhen, China',
  sellerPhone: '',
  buyerContact: '',
  buyerAddress: '',
  buyerPhone: '',
  totalPackages: '1',
  tradeTerms: 'FOB',
  countryOfOrigin: 'CHINA',
})

const editModalVisible = ref(false)
const editField = ref('')
const editValue = ref('')
const editItemIndex = ref(-1)
const editItemField = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// 印章相关
const stampModalVisible = ref(false)
const sellerStamp = ref<string>('')

// 预置印章（可以是base64或URL）
const availableStamps = ref<string[]>([
  // 可以在这里添加预置印章图片
])

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
  return false // 阻止自动上传
}

const handleClearStamps = () => {
  sellerStamp.value = ''
  saveStamps()
  message.success('印章已清除')
}

const saveStamps = () => {
  const key = `packing_list_stamps_${orderData.value?.sales_order_id || 'default'}`
  localStorage.setItem(key, JSON.stringify({
    seller: sellerStamp.value,
  }))
}

const loadStamps = () => {
  const key = `packing_list_stamps_${orderData.value?.sales_order_id || 'default'}`
  const saved = localStorage.getItem(key)
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
    sellerContact: '卖方联系人',
    sellerAddress: '卖方地址',
    sellerPhone: '卖方电话',
    buyerContact: '买方联系人',
    buyerAddress: '买方地址',
    buyerPhone: '买方电话',
    totalPackages: '总箱数',
    tradeTerms: '成交方式',
    countryOfOrigin: '原产国',
  }
  return titles[editField.value] || '编辑'
})

const initializeFormData = () => {
  if (!orderData.value) return
  const order = orderData.value
  const user = userStore.user

  formData.packingNo = ''
  formData.packingDate = dayjs().format('YYYY-MM-DD')
  formData.totalPackages = '1'
  formData.tradeTerms = order.payment_method || 'FOB'
  formData.countryOfOrigin = 'CHINA'

  // 从登录用户获取联系人和电话
  formData.sellerContact = user?.username || ''
  formData.sellerPhone = user?.phone || ''

  // 初始化订单商品
  const items = JSON.parse(order.sales_items || '[]')
  orderItems.value = items.map((item: any) => ({
    ...item,
    netWeight: '',
    grossWeight: '',
    remark: '',
  }))
}

watch(
  () => props.visible,
  async newVal => {
    if (newVal) {
      initializeFormData()
      loadStamps()
      // 页面打开时获取客户信息
      const customerCode = orderData.value?.customer_code
      if (customerCode) {
        try {
          const response = await customersApi.getAll({ code: customerCode })
          const data = response.data as any
          if (data && data.length > 0) {
            customerData.value = data[0]
            // 更新买方字段
            formData.buyerContact = customerData.value?.contact || ''
            formData.buyerAddress = customerData.value?.register_address || ''
            formData.buyerPhone = customerData.value?.contact_phone || ''
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

const handleEdit = (field: string) => {
  editField.value = field
  editItemIndex.value = -1
  editItemField.value = ''

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
    case 'sellerContact':
      editValue.value = formData.sellerContact
      break
    case 'sellerAddress':
      editValue.value = formData.sellerAddress
      break
    case 'sellerPhone':
      editValue.value = formData.sellerPhone
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

const handleEditItem = (index: number, field: string) => {
  editItemIndex.value = index
  editItemField.value = field
  editField.value = ''
  editValue.value = orderItems.value[index][field] || ''
  editModalVisible.value = true
}

const handleDeleteItem = (index: number) => {
  orderItems.value.splice(index, 1)
}

const handleEditConfirm = () => {
  if (editItemIndex.value >= 0 && editItemField.value) {
    // 编辑表格项
    const items = [...orderItems.value]
    items[editItemIndex.value][editItemField.value] = editValue.value
    // 注意：这里需要更新orderItems，但由于是computed，实际使用中可能需要调整
  } else {
    // 编辑表单字段
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
      case 'sellerContact':
        formData.sellerContact = editValue.value
        break
      case 'sellerAddress':
        formData.sellerAddress = editValue.value
        break
      case 'sellerPhone':
        formData.sellerPhone = editValue.value
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
  }
  editModalVisible.value = false
}

const loading = ref(false)

const handleCancel = () => {
  visible.value = false
}

const handleSaveAndPrint = async () => {
  // Validate packing_no
  if (!formData.packingNo) {
    message.error('请填写Packing No.')
    return
  }

  loading.value = true

  try {
    const saveData = {
      packing_no: formData.packingNo,
      packing_date: formData.packingDate,
      po_number: orderData.value?.contract_number || '',
      sales_order_id: orderData.value?.sales_order_id || '',
      seller_name: formData.sellerName,
      seller_contact: formData.sellerContact,
      seller_address: formData.sellerAddress,
      seller_phone: formData.sellerPhone,
      buyer_name: customerData.value?.customer_name || '',
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
  padding: 30px 20px;
  background: white;
  min-height: 600px;
  position: relative;
}

.page-header {
  text-align: center;
  margin-bottom: 15px;

  .title-en {
    font-size: 24px;
    font-weight: bold;
    margin: 0 0 3px 0;
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
      font-size: 14px;
      opacity: 0.5;
    }
  }

  .title-zh {
    font-size: 20px;
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
      font-size: 12px;
      opacity: 0.5;
    }
  }
}

.middle-info {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  margin-bottom: 15px;
  padding-right: 10%;

  .middle-right {
    text-align: right;

    .info-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-bottom: 5px;
      font-size: 12px;

      .label {
        font-weight: bold;
        color: #000;
        min-width: 80px;
        text-align: right;
        padding-right: 6px;

        .required {
          color: #ff4d4f;
          margin-right: 3px;
        }
      }

      .value {
        color: #000;
        min-width: 100px;
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
  margin-bottom: 15px;
  width: 66.67%;

  .seller-section,
  .buyer-section {
    padding: 12px;
    border: 1px solid #e8e8e8;
    background: #fafafa;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }

    .info-item {
      margin-bottom: 6px;
      font-size: 12px;
      color: #000;

      &.address {
        .value {
          display: inline-block;
          max-width: 350px;
          white-space: pre-wrap;
        }
      }

      .label {
        color: #595959;
        margin-right: 6px;
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

.table-section {
  margin-bottom: 20px;

  .product-table {
    width: 100%;
    border-collapse: collapse;

    th {
      padding: 8px 6px;
      background: #f5f5f5;
      border: 1px solid #d9d9d9;
      font-weight: 500;
      font-size: 11px;
      color: #262626;
      text-align: center;
    }

    td {
      padding: 8px 6px;
      border: 1px solid #e8e8e8;
      text-align: center;
      font-size: 11px;
      color: #000;
      vertical-align: middle;
    }

    .empty-row {
      height: 25px;
    }

    .editable {
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

.bottom-section {
  margin-bottom: 20px;
  padding: 12px;
  border: 1px solid #e8e8e8;
  background: #fafafa;

  .info-item {
    margin-bottom: 6px;
    font-size: 12px;
    color: #000;

    .label {
      color: #595959;
      margin-right: 6px;
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
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;

  .signature-box {
    width: 220px;
    min-height: 100px;
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
      max-height: 80px;
      margin-top: 8px;
      object-fit: contain;
    }

    .stamp-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-top: 8px;
      color: #bfbfbf;
      font-size: 11px;

      .anticon {
        font-size: 20px;
        margin-bottom: 3px;
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
</style>

<style lang="scss">
@media print {
  @page {
    size: A4 portrait;
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

  .no-print {
    display: none !important;
  }

  .print-content {
    padding: 0 !important;
    min-height: auto !important;
    overflow: visible !important;
    page-break-inside: avoid;
    font-size: 9px !important;
    box-shadow: none !important;
  }

  // 页面标题
  .page-header {
    margin-bottom: 5px !important;

    .title-en {
      font-size: 16px !important;
      cursor: default !important;
      padding: 0 !important;
      margin: 0 !important;

      &:hover {
        background-color: transparent !important;
      }

      &::after {
        display: none !important;
      }
    }

    .title-zh {
      font-size: 13px !important;
      cursor: default !important;
      padding: 0 !important;
      margin: 0 !important;

      &:hover {
        background-color: transparent !important;
      }

      &::after {
        display: none !important;
      }
    }
  }

  // 中间信息
  .middle-info {
    margin-bottom: 5px !important;

    .middle-right {
      .info-row {
        margin-bottom: 2px !important;
        font-size: 9px !important;

        .label {
          min-width: 70px !important;
        }

        .editable {
          border-bottom: none !important;
          color: #000 !important;
        }
      }
    }
  }

  // 卖方买方信息
  .parties-container {
    width: 66.67% !important;
    margin-bottom: 5px !important;

    .seller-section,
    .buyer-section {
      padding: 4px 6px !important;
      box-shadow: none !important;
      margin-bottom: 5px !important;

      &:last-child {
        margin-bottom: 0 !important;
      }

      .info-item {
        margin-bottom: 2px !important;
        font-size: 9px !important;

        .editable {
          border-bottom: none !important;
          color: #000 !important;
        }
      }
    }
  }

  // 表格区域
  .table-section {
    margin-bottom: 5px !important;

    .product-table {
      border: 1px solid #000 !important;

      th {
        padding: 2px 3px !important;
        font-size: 8px !important;
        border: 1px solid #333 !important;
      }

      td {
        padding: 2px 3px !important;
        font-size: 8px !important;
        border: 1px solid #333 !important;
      }

      .empty-row {
        height: 15px !important;
      }

      .editable {
        border-bottom: none !important;
        color: #000 !important;
      }
    }
  }

  // 底部信息
  .bottom-section {
    margin-bottom: 5px !important;
    padding: 4px 6px !important;
    box-shadow: none !important;

    .info-item {
      margin-bottom: 2px !important;
      font-size: 9px !important;

      .editable {
        border-bottom: none !important;
        color: #000 !important;
      }
    }
  }

  // 签章区域
  .signature-section {
    margin-top: 10px !important;

    .signature-box {
      min-height: 60px !important;
      border: none !important;

      .signature-label {
        font-size: 9px !important;
      }

      .stamp-image {
        max-width: 150px !important;
        max-height: 60px !important;
      }

      .stamp-placeholder {
        display: none !important;
      }
    }
  }
}
</style>