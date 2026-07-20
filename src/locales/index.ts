export type Lang = 'zh' | 'en'

export interface LocaleMessages {
  // 通用
  common: {
    save: string
    cancel: string
    delete: string
    edit: string
    add: string
    search: string
    reset: string
    confirm: string
    loading: string
    success: string
    error: string
    noData: string
    action: string
    status: string
    remarks: string
    date: string
    select: string
    input: string
    pleaseSelect: string
    pleaseInput: string
  }
  // 报价单
  quotation: {
    title: string
    newTitle: string
    editTitle: string
    companyName: string
    quotationNo: string
    customer: string
    selectCustomer: string
    entryDate: string
    // 表格列
    no: string
    productCode: string
    productName: string
    model: string
    description: string
    unit: string
    quantity: string
    quantityPlaceholder: string
    unitPrice: string
    totalAmount: string
    // 状态
    quoting: string
    sold: string
    // 操作
    sale: string
    addRow: string
    // 报价说明
    currency: string
    validity: string
    validityPlaceholder: string
    delivery: string
    deliveryOptions: {
      doorToDoor: string
      selfPickup: string
      express: string
      other: string
    }
    taxRate: string
    // 公司信息
    address: string
    addressValue: string
    tel: string
    telValue: string
    // 备注
    remarks: string
    // 底部按钮
    print: string
    saveAndPrint: string
  }
}

const locales: Record<Lang, LocaleMessages> = {
  zh: {
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      add: '新增',
      search: '查询',
      reset: '重置',
      confirm: '确定',
      loading: '加载中...',
      success: '操作成功',
      error: '操作失败',
      noData: '暂无数据',
      action: '操作',
      status: '状态',
      remarks: '备注',
      date: '日期',
      select: '请选择',
      input: '请输入',
      pleaseSelect: '请选择',
      pleaseInput: '请输入',
    },
    quotation: {
      title: '报价单',
      newTitle: '新增报价单',
      editTitle: '编辑报价单',
      companyName: '深圳市旭思达光电科技有限公司',
      quotationNo: '报价编号：',
      customer: '客户名称：',
      selectCustomer: '请选择客户',
      entryDate: '录入日期：',
      no: '编号',
      productCode: '产品代码',
      productName: '产品名称',
      model: '规格型号',
      description: '规格描述',
      unit: '单位',
      quantity: '数量',
      quantityPlaceholder: '如: 1-10',
      unitPrice: '单价',
      totalAmount: '合计',
      quoting: '报价中',
      sold: '已销售',
      sale: '销售',
      addRow: '追加行',
      currency: '币种：',
      validity: '报价有效期：',
      validityPlaceholder: '自报价之日起10个工作日',
      delivery: '送货方式：',
      deliveryOptions: {
        doorToDoor: '送货上门',
        selfPickup: '自提',
        express: '物流快递',
        other: '其他',
      },
      taxRate: '报价单税率：',
      address: '地址：',
      addressValue: '深圳市龙岗区坂田街道五和大道（南）景丰大厦602室',
      tel: '联系方式：',
      telValue: '18028740351',
      remarks: '备注：',
      print: '打印',
      saveAndPrint: '保存并打印',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      reset: 'Reset',
      confirm: 'Confirm',
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
      noData: 'No Data',
      action: 'Action',
      status: 'Status',
      remarks: 'Remarks',
      date: 'Date',
      select: 'Select',
      input: 'Input',
      pleaseSelect: 'Please select',
      pleaseInput: 'Please input',
    },
    quotation: {
      title: 'QUOTATION',
      newTitle: 'New Quotation',
      editTitle: 'Edit Quotation',
      companyName: 'Shenzhen SunStar Optical Electronics Company, LTD',
      quotationNo: 'Quotation No.:',
      customer: 'Customer:',
      selectCustomer: 'Select Customer',
      entryDate: 'Date:',
      no: 'No.',
      productCode: 'Product Code',
      productName: 'Product Name',
      model: 'Model',
      description: 'Description',
      unit: 'Unit',
      quantity: 'Quantity',
      quantityPlaceholder: 'e.g. 1-10',
      unitPrice: 'Unit Price',
      totalAmount: 'Total',
      quoting: 'Quoting',
      sold: 'Sold',
      sale: 'Sale',
      addRow: 'Add Row',
      currency: 'Currency:',
      validity: 'Validity:',
      validityPlaceholder: '10 working days from quotation date',
      delivery: 'Delivery:',
      deliveryOptions: {
        doorToDoor: 'Door-to-door Delivery',
        selfPickup: 'Self Pickup',
        express: 'Express Delivery',
        other: 'Other',
      },
      taxRate: 'Tax Rate:',
      address: 'Address:',
      addressValue: 'Room 602, Jingfeng Building. No. 42 Wuhedadao (South), Nankun Communit, Bantian Subdistrict, Longgang Distric,Shenzhen',
      tel: 'Tel:',
      telValue: '86+18028740351',
      remarks: 'Remarks:',
      print: 'Print',
      saveAndPrint: 'Save & Print',
    },
  },
}

export const useLocale = (lang: Lang) => {
  return locales[lang]
}

export const getLocale = (lang: Lang): LocaleMessages => {
  return locales[lang]
}

export default locales
