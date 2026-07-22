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
    print: string
  }
  // 销售订单
  salesOrder: {
    title: string
    newTitle: string
    editTitle: string
    companyName: string
    defaultOrderNo: string
    contractNumber: string
    customer: string
    selectCustomer: string
    paymentMethod: string
    selectPaymentMethod: string
    currency: string
    entryDate: string
    cny: string
    usd: string
    eur: string
    no: string
    businessCategory: string
    productCode: string
    productName: string
    model: string
    description: string
    unit: string
    quantity: string
    taxRate: string
    taxIncludedPrice: string
    taxExcludedPrice: string
    taxIncludedAmount: string
    taxExcludedAmount: string
    taxAmount: string
    outboundStatus: string
    purchaseStatus: string
    deliveryDate: string
    invoiceDate: string
    invoiceNumber: string
    invoiceReceived: string
    settlementDate: string
    settlementAmount: string
    unsettledAmount: string
    settlementStatus: string
    notShipped: string
    fullyShipped: string
    partiallyShipped: string
    returned: string
    unknown: string
    notPurchased: string
    partiallyPurchased: string
    purchased: string
    noNeedToPurchase: string
    fullySettled: string
    partiallySettled: string
    unsettled: string
    yes: string
    noOption: string
    salesExpense: string
    transportFee: string
    handlingFee: string
    otherFee: string
    selectProduct: string
    selectCategory: string
    totalWithTax: string
    addRow: string
    draft: string
    getContractNumberFail: string
    getCustomersFail: string
    getProductsFail: string
    getPaymentMethodsFail: string
    getCategoriesFail: string
    loadBasicDataFail: string
    inputContractNumber: string
    selectCustomerMsg: string
    selectPaymentMethodMsg: string
    selectEntryDate: string
    fillAllCategories: string
    addSaleContent: string
    orderUpdateSuccess: string
    orderCreateSuccess: string
    draftSuccess: string
    draftRestored: string
    restoreDraftTitle: string
    restoreDraftContent: string
    restore: string
    discard: string
    deleteConfirmTitle: string
    deleteConfirmContent: string
    deleteSuccess: string
    deleteFail: string
    returnConfirmTitle: string
    returnConfirmContent: string
    returnSuccess: string
    returnFail: string
    loadOrdersFail: string
    totalRecords: string
    orderNumber: string
    contractNumberLabel: string
    customerName: string
    customerCode: string
    salesDate: string
    amount: string
    salesPerson: string
    sequence: string
    defaultDocNumber: string
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
  // 销售订单打印
  salesOrderPrint: {
    companyName: string
    contractTitle: string
    contractNumber: string
    partyA: string
    partyB: string
    creditCode: string
    registeredAddress: string
    introText: string
    no: string
    productName: string
    productCode: string
    model: string
    description: string
    quantity: string
    unit: string
    taxIncludedPrice: string
    taxAmount: string
    taxIncludedAmount: string
    deliveryDate: string
    remarks: string
    taxAmountLabel: string
    taxAmountInWords: string
    totalWithTax: string
    totalWithTaxInWords: string
    paymentTerms: string
    paymentTermsContent: string
    invoiceTerms: string
    deliveryMethod: string
    deliveryPeriod: string
    acceptanceStandard: string
    warranty: string
    limitedLiability: string
    breach: string
    confidentiality: string
    effectiveness: string
    contactPerson: string
    phone: string
    email: string
    date: string
    signatureAndSeal: string
    cancel: string
    print: string
    editSalesDate: string
    editTaxRate: string
    editRemarks: string
    editContact: string
    editPhone: string
    editEmail: string
    editCreditCode: string
    editBuyerContact: string
    editBuyerPhone: string
    editBuyerEmail: string
    editDefault: string
  }
  // 采购订单
  purchaseOrder: {
    title: string
    newTitle: string
    editTitle: string
    companyName: string
    defaultOrderNo: string
    contractNumber: string
    supplier: string
    selectSupplier: string
    entryDate: string
    relatedSalesOrder: string
    selectRelatedSalesOrder: string
    currency: string
    cny: string
    usd: string
    eur: string
    no: string
    businessCategory: string
    productCode: string
    productName: string
    model: string
    description: string
    unit: string
    quantity: string
    taxRate: string
    taxIncludedPrice: string
    taxExcludedPrice: string
    taxIncludedAmount: string
    taxExcludedAmount: string
    taxAmount: string
    status: string
    deliveryDate: string
    invoiceDate: string
    invoiceNumber: string
    invoiceReceived: string
    settlementDate: string
    settlementAmount: string
    unsettledAmount: string
    settlementStatus: string
    totalPrice: string
    notInStock: string
    fullyInStock: string
    partiallyInStock: string
    returned: string
    unknown: string
    yes: string
    noOption: string
    fullySettled: string
    partiallySettled: string
    unsettled: string
    purchaseExpense: string
    transportFee: string
    vat: string
    handlingFee: string
    operatingExpenses: string
    otherFee: string
    selectProduct: string
    selectCategory: string
    totalWithTax: string
    addRow: string
    draft: string
    getOrderNumberFail: string
    getSuppliersFail: string
    getProductsFail: string
    getCategoriesFail: string
    loadBasicDataFail: string
    inputContractNumber: string
    selectSupplierMsg: string
    selectEntryDate: string
    addPurchaseItems: string
    fillAllCategories: string
    orderUpdateSuccess: string
    orderCreateSuccess: string
    draftSuccess: string
    draftRestored: string
    restoreDraftTitle: string
    restoreDraftContent: string
    restore: string
    discard: string
    salesOrderLoaded: string
    salesOrderParseFail: string
    noProductsInSalesOrder: string
    // 列表页
    orderNumber: string
    contractNumberLabel: string
    supplierName: string
    supplierCode: string
    purchaseDate: string
    amount: string
    purchaser: string
    sequence: string
    defaultDocNumber: string
    taxRateLabel: string
    taxExcludedAmountLabel: string
    taxExcludedPriceLabel: string
    totalWithTaxLabel: string
    deleteConfirmTitle: string
    deleteConfirmContent: string
    deleteSuccess: string
    deleteFail: string
    loadOrdersFail: string
    totalRecords: string
    statusUpdateTitle: string
    statusUpdateContent: string
    statusUpdateSuccess: string
    statusUpdateFail: string
  }
  // 采购订单打印
  purchaseOrderPrint: {
    title: string
    contractNumber: string
    supplier: string
    orderDate: string
    currency: string
    taxRate: string
    no: string
    productCode: string
    productName: string
    specification: string
    quantity: string
    unit: string
    taxIncludedPrice: string
    amount: string
    deliveryDate: string
    remarks: string
    amountInWords: string
    totalAmount: string
    contractTerms: string
    term1: string
    term2: string
    term3: string
    term4: string
    term5: string
    term6: string
    term7: string
    term8: string
    supplierInfo: string
    buyerInfo: string
    companyName: string
    address: string
    contactPerson: string
    phone: string
    email: string
    signatureAndSeal: string
    cancel: string
    print: string
    editOrderDate: string
    editTaxRate: string
    editRemarks: string
    editContact: string
    editPhone: string
    editEmail: string
    editDefault: string
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
      print: '打印',
    },
    salesOrder: {
      title: '销售订单',
      newTitle: '新增销售订单',
      editTitle: '编辑销售订单',
      companyName: '深圳市旭思达光电科技有限公司',
      defaultOrderNo: '默认单据编号：',
      contractNumber: '销售合同编号：',
      customer: '客户名称：',
      selectCustomer: '请选择客户',
      paymentMethod: '结算方式：',
      selectPaymentMethod: '请选择结算方式',
      currency: '币种：',
      entryDate: '录入日期：',
      cny: '人民币',
      usd: '美元',
      eur: '欧元',
      no: '编号',
      businessCategory: '业务分类',
      productCode: '产品代码',
      productName: '产品名称',
      model: '规格型号',
      description: '规格描述',
      unit: '单位',
      quantity: '数量',
      taxRate: '税率（%）',
      taxIncludedPrice: '含税单价',
      taxExcludedPrice: '未税单价',
      taxIncludedAmount: '含税金额',
      taxExcludedAmount: '未税金额',
      taxAmount: '税额',
      outboundStatus: '出库状态',
      purchaseStatus: '采购状态',
      deliveryDate: '发货日期',
      invoiceDate: '开票日期',
      invoiceNumber: '发票号',
      invoiceReceived: '是否到票',
      settlementDate: '结算日期',
      settlementAmount: '结算金额',
      unsettledAmount: '未结算金额',
      settlementStatus: '结算状态',
      notShipped: '未出库',
      fullyShipped: '已全部出库',
      partiallyShipped: '已部分出库',
      returned: '退货',
      unknown: '未知',
      notPurchased: '未采购',
      partiallyPurchased: '部分采购',
      purchased: '已采购',
      noNeedToPurchase: '无需采购',
      fullySettled: '全部结算',
      partiallySettled: '部分结算',
      unsettled: '未结算',
      yes: '是',
      noOption: '否',
      salesExpense: '销售费用登记',
      transportFee: '运输费',
      handlingFee: '手续费',
      otherFee: '其他',
      selectProduct: '请选择产品',
      selectCategory: '请选择业务分类',
      totalWithTax: '含税总价：',
      addRow: '追加行',
      draft: '暂存',
      getContractNumberFail: '获取销售订单编号失败',
      getCustomersFail: '获取客户列表失败',
      getProductsFail: '获取产品列表失败',
      getPaymentMethodsFail: '获取结算方式失败',
      getCategoriesFail: '获取业务分类失败',
      loadBasicDataFail: '加载基础数据失败',
      inputContractNumber: '请输入销售合同编号',
      selectCustomerMsg: '请选择客户',
      selectPaymentMethodMsg: '请选择结算方式',
      selectEntryDate: '请选择录入日期',
      fillAllCategories: '请填写所有商品的业务分类',
      addSaleContent: '请添加销售内容',
      orderUpdateSuccess: '销售订单更新成功',
      orderCreateSuccess: '销售订单创建成功',
      draftSuccess: '暂存成功',
      draftRestored: '已恢复暂存内容',
      restoreDraftTitle: '恢复暂存内容',
      restoreDraftContent: '检测到上次暂存的内容（{summary}，暂存于{time}），是否恢复？',
      restore: '恢复',
      discard: '放弃',
      deleteConfirmTitle: '确认删除',
      deleteConfirmContent: '确定要删除销售订单 {orderNumber} 吗？',
      deleteSuccess: '删除成功',
      deleteFail: '删除失败',
      returnConfirmTitle: '确认退货',
      returnConfirmContent: '确定要将销售订单 {orderNumber} 标记为退货吗？',
      returnSuccess: '退货成功',
      returnFail: '退货失败',
      loadOrdersFail: '加载销售订单失败',
      totalRecords: '共 {total} 条记录',
      orderNumber: '订单号',
      contractNumberLabel: '合同编号',
      customerName: '客户名称',
      customerCode: '客户代码',
      salesDate: '销售日期',
      amount: '金额',
      salesPerson: '销售员',
      sequence: '序号',
      defaultDocNumber: '默认单据编号',
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
    salesOrderPrint: {
      companyName: '深圳市旭思达光电科技有限公司',
      contractTitle: '销售合同',
      contractNumber: '合同编号：',
      partyA: '甲方：',
      partyB: '乙方：',
      creditCode: '信用代码：',
      registeredAddress: '注册地址：',
      introText: '一、经甲（需方）、乙（供方）双方友好协商，乙方出售以下货物给甲方：',
      no: '序号',
      productName: '产品名称',
      productCode: '产品代码',
      model: '规格型号',
      description: '规格描述',
      quantity: '数量',
      unit: '单位',
      taxIncludedPrice: '含税单价',
      taxAmount: '税额',
      taxIncludedAmount: '含税金额',
      deliveryDate: '发货日期',
      remarks: '备注',
      taxAmountLabel: '税额：',
      taxAmountInWords: '税额（大写）：',
      totalWithTax: '含税金额总计：',
      totalWithTaxInWords: '含税金额总计（大写）：',
      paymentTerms: '二、付款方式：',
      paymentTermsContent: '验收合格后',
      invoiceTerms: '三、发票：验收合格后，乙方提供合法正规发票，甲方收到发票后3个工作日内支付货款。',
      deliveryMethod: '交货方式：乙方负责将货物运送至甲方指定地址，货物在交货运输前造成的损失和意外均由乙方负责。',
      deliveryPeriod: '四、交货周期：合同生效后30日',
      acceptanceStandard: '五、验收标准：甲方收到货物3个工作日内（节假日顺延）以书面方式或者邮件的形式告知乙方开箱验收情况，超过3个工作日，则默认为甲方验收合格。乙方提供的产品必须符合国家标准，以及双方确认的图纸要求的标准（附件一），乙方产品经甲方入库后，如果在生产中发现不良品情况，乙方必须无条件退货或者返修，并按照甲方要求将合格产品送达甲方指定的收货地址。',
      warranty: '六、保修和售后服务：乙方保证所提供的货物为原厂出品，符合附件一所要求的标准，从甲方收到货物后开始计算，免费保修期为壹年（不含人为因素，消耗品易损件除外），如果产品故障是由于需方选型不当、意外事故、错误使用或没有按技术要求正常使用所引起，供方不承担质保责任。',
      limitedLiability: '七、有限责任：任何情况下，供方在本合同任何条款下所承担的全部责任，以需方产品实际已支付的价款为限。',
      breach: '八、违约情况：本合同如发生纠纷，供需双方应协商解决，协商不成的，向供货方所在地人民法院起诉。本合同因不可抗力而无法履行的，双方均不需承担责任。',
      confidentiality: '九、保密协议：未经双方许可，甲乙双方不得向第三方泄露本合同有关内容，更不得向第三方泄露图纸，文件，检验标准以及方案内容，如有泄露在签订和履行本合同的过程中所获得的对方任何商业机密的情况，由此产生的后果由泄露方承担。',
      effectiveness: '十、合同生效：本合同经双方签字盖章后生效，扫描件也具有同等效力；本合同一式两份，双方各执一份。',
      contactPerson: '联系人：',
      phone: '联系电话：',
      email: '邮箱：',
      date: '日期：',
      signatureAndSeal: '签字盖章：',
      cancel: '取消',
      print: '打印',
      editSalesDate: '销售日期',
      editTaxRate: '税率',
      editRemarks: '备注',
      editContact: '联系人',
      editPhone: '联系电话',
      editEmail: '邮箱',
      editCreditCode: '信用代码',
      editBuyerContact: '甲方联系人',
      editBuyerPhone: '甲方联系电话',
      editBuyerEmail: '甲方邮箱',
      editDefault: '编辑',
    },
    purchaseOrder: {
      title: '采购订单',
      newTitle: '新增采购订单',
      editTitle: '编辑采购订单',
      companyName: '深圳市旭思达光电科技有限公司',
      defaultOrderNo: '默认单据编号：',
      contractNumber: '采购合同编号：',
      supplier: '供应商名称：',
      selectSupplier: '请选择供应商',
      entryDate: '录入日期：',
      relatedSalesOrder: '关联销售订单：',
      selectRelatedSalesOrder: '请选择关联销售订单',
      currency: '币种：',
      cny: '人民币',
      usd: '美元',
      eur: '欧元',
      no: '编号',
      businessCategory: '业务分类',
      productCode: '产品代码',
      productName: '产品名称',
      model: '规格型号',
      description: '规格描述',
      unit: '单位',
      quantity: '数量',
      taxRate: '税率（%）',
      taxIncludedPrice: '含税单价',
      taxExcludedPrice: '未税单价',
      taxIncludedAmount: '含税金额',
      taxExcludedAmount: '未税金额',
      taxAmount: '税额',
      status: '状态',
      deliveryDate: '发货日期',
      invoiceDate: '开票日期',
      invoiceNumber: '发票号',
      invoiceReceived: '是否到票',
      settlementDate: '结算日期',
      settlementAmount: '结算金额',
      unsettledAmount: '未结算金额',
      settlementStatus: '结算状态',
      totalPrice: '总价',
      notInStock: '未入库',
      fullyInStock: '已全部入库',
      partiallyInStock: '已部分入库',
      returned: '退货',
      unknown: '未知',
      yes: '是',
      noOption: '否',
      fullySettled: '全部结算',
      partiallySettled: '部分结算',
      unsettled: '未结算',
      purchaseExpense: '采购费用登记',
      transportFee: '报关运输费',
      vat: '增值税',
      handlingFee: '手续费',
      operatingExpenses: '运营费',
      otherFee: '其他',
      selectProduct: '请选择产品',
      selectCategory: '请选择业务分类',
      totalWithTax: '含税总价：',
      addRow: '追加行',
      draft: '暂存',
      getOrderNumberFail: '获取采购订单编号失败',
      getSuppliersFail: '获取供应商列表失败',
      getProductsFail: '获取产品列表失败',
      getCategoriesFail: '获取业务分类失败',
      loadBasicDataFail: '加载基础数据失败',
      inputContractNumber: '请输入采购合同编号',
      selectSupplierMsg: '请选择供应商',
      selectEntryDate: '请选择录入日期',
      addPurchaseItems: '请添加采购商品',
      fillAllCategories: '请填写所有商品的业务分类',
      orderUpdateSuccess: '采购订单更新成功',
      orderCreateSuccess: '采购订单创建成功',
      draftSuccess: '暂存成功',
      draftRestored: '已恢复暂存内容',
      restoreDraftTitle: '恢复暂存内容',
      restoreDraftContent: '检测到上次暂存的内容（{summary}，暂存于{time}），是否恢复？',
      restore: '恢复',
      discard: '放弃',
      salesOrderLoaded: '已加载销售订单 {orderNumber} 的 {count} 个商品',
      salesOrderParseFail: '解析销售订单商品失败',
      noProductsInSalesOrder: '该销售订单没有商品',
      orderNumber: '订单号',
      contractNumberLabel: '合同编号',
      supplierName: '供应商名称',
      supplierCode: '供应商代码',
      purchaseDate: '采购日期',
      amount: '金额',
      purchaser: '采购人',
      sequence: '序号',
      defaultDocNumber: '默认单据编号',
      taxRateLabel: '税率(%)',
      taxExcludedAmountLabel: '未税金额',
      taxExcludedPriceLabel: '未税单价',
      totalWithTaxLabel: '含税总价',
      deleteConfirmTitle: '确认删除',
      deleteConfirmContent: '确定要删除采购订单 {orderNumber} 吗？',
      deleteSuccess: '删除成功',
      deleteFail: '删除失败',
      loadOrdersFail: '加载采购订单失败',
      totalRecords: '共 {total} 条记录',
      statusUpdateTitle: '确认更新状态',
      statusUpdateContent: '确定要将采购订单 {orderNumber} 的状态更新为 {status}吗？',
      statusUpdateSuccess: '状态更新成功',
      statusUpdateFail: '状态更新失败',
    },
    purchaseOrderPrint: {
      title: '采购订单',
      contractNumber: '合同编号：',
      supplier: '供方名称：',
      orderDate: '订单日期：',
      currency: '币种：',
      taxRate: '税率：',
      no: '序号',
      productCode: '产品代码',
      productName: '产品名称',
      specification: '产品规格/描述',
      quantity: '数量',
      unit: '单位',
      taxIncludedPrice: '含税单价',
      amount: '金额',
      deliveryDate: '交期',
      remarks: '备注',
      amountInWords: '金额总计（大写）：',
      totalAmount: '金额总计：',
      contractTerms: '合同条款',
      term1: '该材料应与以上品牌和型号一致，并为原厂原装全新产品。假一赔十。',
      term2: '该材料为原厂包装且管脚无氧化。若材料为非原厂原包装，甲方有权随时退货。',
      term3: '在半年之内如发现任何产品质量问题，无论上线与否，凭我司客户出具的检测报告或品质报告，乙方应在一星期内退还全部货款给甲方，甲方保留为客户向乙方追索因元件品质导致的额外加工费用权利。',
      term4: '收到订单后，请确认回传并提供银行资料。若因供应商提供有误的银行资料，一切后果由供应商自行负责。',
      term5: '如乙方已确认订单，但最终又取消订单无法按时出货，乙方需付订单总额的5%作为赔偿。',
      term6: '如甲方已付了订金给乙方，但最终又取消订单无法按时出货。乙方除退回订金外，需另付等额订金作为赔偿。',
      term7: '如乙方的货品及交期不符合甲方订单要求，甲方有权取消订单。',
      term8: '如果货物不能按时交付，超出供应商的承诺，供应商需全额支付客户购买现货的额外费用。',
      supplierInfo: '供方（乙方）信息',
      buyerInfo: '需方（甲方）信息',
      companyName: '单位名称：',
      address: '地址：',
      contactPerson: '联系人：',
      phone: '联系电话：',
      email: '邮箱：',
      signatureAndSeal: '签字盖章：',
      cancel: '取消',
      print: '打印',
      editOrderDate: '订单日期',
      editTaxRate: '税率',
      editRemarks: '备注',
      editContact: '联系人',
      editPhone: '联系电话',
      editEmail: '邮箱',
      editDefault: '编辑',
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
      print: 'Print',
    },
    salesOrder: {
      title: 'Sales Order',
      newTitle: 'New Sales Order',
      editTitle: 'Edit Sales Order',
      companyName: 'Shenzhen SunStar Optical Electronics Company, LTD',
      defaultOrderNo: 'Default Doc No.:',
      contractNumber: 'Contract No.:',
      customer: 'Customer:',
      selectCustomer: 'Select Customer',
      paymentMethod: 'Payment Method:',
      selectPaymentMethod: 'Select Payment Method',
      currency: 'Currency:',
      entryDate: 'Entry Date:',
      cny: 'CNY',
      usd: 'USD',
      eur: 'EUR',
      no: 'No.',
      businessCategory: 'Category',
      productCode: 'Product Code',
      productName: 'Product Name',
      model: 'Model',
      description: 'Description',
      unit: 'Unit',
      quantity: 'Qty',
      taxRate: 'Tax Rate(%)',
      taxIncludedPrice: 'Price(Incl. Tax)',
      taxExcludedPrice: 'Price(Excl. Tax)',
      taxIncludedAmount: 'Amount(Incl. Tax)',
      taxExcludedAmount: 'Amount(Excl. Tax)',
      taxAmount: 'Tax Amount',
      outboundStatus: 'Outbound',
      purchaseStatus: 'Purchase',
      deliveryDate: 'Delivery Date',
      invoiceDate: 'Invoice Date',
      invoiceNumber: 'Invoice No.',
      invoiceReceived: 'Invoice Received',
      settlementDate: 'Settlement Date',
      settlementAmount: 'Settlement Amt',
      unsettledAmount: 'Unsettled Amt',
      settlementStatus: 'Settlement',
      notShipped: 'Not Shipped',
      fullyShipped: 'Fully Shipped',
      partiallyShipped: 'Partially Shipped',
      returned: 'Returned',
      unknown: 'Unknown',
      notPurchased: 'Not Purchased',
      partiallyPurchased: 'Partial',
      purchased: 'Purchased',
      noNeedToPurchase: 'N/A',
      fullySettled: 'Settled',
      partiallySettled: 'Partial',
      unsettled: 'Unsettled',
      yes: 'Yes',
      noOption: 'No',
      salesExpense: 'Sales Expenses',
      transportFee: 'Transport Fee',
      handlingFee: 'Handling Fee',
      otherFee: 'Other',
      selectProduct: 'Select Product',
      selectCategory: 'Select Category',
      totalWithTax: 'Total (Incl. Tax):',
      addRow: 'Add Row',
      draft: 'Draft',
      getContractNumberFail: 'Failed to get contract number',
      getCustomersFail: 'Failed to get customers',
      getProductsFail: 'Failed to get products',
      getPaymentMethodsFail: 'Failed to get payment methods',
      getCategoriesFail: 'Failed to get categories',
      loadBasicDataFail: 'Failed to load basic data',
      inputContractNumber: 'Please input contract number',
      selectCustomerMsg: 'Please select customer',
      selectPaymentMethodMsg: 'Please select payment method',
      selectEntryDate: 'Please select entry date',
      fillAllCategories: 'Please fill in all product categories',
      addSaleContent: 'Please add sale items',
      orderUpdateSuccess: 'Order updated successfully',
      orderCreateSuccess: 'Order created successfully',
      draftSuccess: 'Draft saved',
      draftRestored: 'Draft restored',
      restoreDraftTitle: 'Restore Draft',
      restoreDraftContent: 'Draft found ({summary}, saved at {time}), restore?',
      restore: 'Restore',
      discard: 'Discard',
      deleteConfirmTitle: 'Confirm Delete',
      deleteConfirmContent: 'Delete sales order {orderNumber}?',
      deleteSuccess: 'Deleted successfully',
      deleteFail: 'Failed to delete',
      returnConfirmTitle: 'Confirm Return',
      returnConfirmContent: 'Mark sales order {orderNumber} as returned?',
      returnSuccess: 'Returned successfully',
      returnFail: 'Failed to return',
      loadOrdersFail: 'Failed to load sales orders',
      totalRecords: '{total} records',
      orderNumber: 'Order No.',
      contractNumberLabel: 'Contract No.',
      customerName: 'Customer',
      customerCode: 'Customer Code',
      salesDate: 'Sales Date',
      amount: 'Amount',
      salesPerson: 'Salesperson',
      sequence: 'No.',
      defaultDocNumber: 'Default Doc No.',
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
    salesOrderPrint: {
      companyName: 'Shenzhen SunStar Optical Electronics Company, LTD',
      contractTitle: 'SALES CONTRACT',
      contractNumber: 'Contract No.:',
      partyA: 'Party A:',
      partyB: 'Party B:',
      creditCode: 'Credit Code:',
      registeredAddress: 'Registered Address:',
      introText: '1. Through friendly negotiation between Party A (Buyer) and Party B (Seller), Party B agrees to sell the following goods to Party A:',
      no: 'No.',
      productName: 'Product Name',
      productCode: 'Product Code',
      model: 'Model',
      description: 'Description',
      quantity: 'Qty',
      unit: 'Unit',
      taxIncludedPrice: 'Price (Incl. Tax)',
      taxAmount: 'Tax Amount',
      taxIncludedAmount: 'Amount (Incl. Tax)',
      deliveryDate: 'Delivery Date',
      remarks: 'Remarks',
      taxAmountLabel: 'Tax Amount:',
      taxAmountInWords: 'Tax Amount (In Words):',
      totalWithTax: 'Total (Incl. Tax):',
      totalWithTaxInWords: 'Total (Incl. Tax, In Words):',
      paymentTerms: '2. Payment Terms:',
      paymentTermsContent: 'After acceptance',
      invoiceTerms: '3. Invoice: After acceptance, Party B shall provide a valid invoice. Party A shall make payment within 3 business days after receiving the invoice.',
      deliveryMethod: 'Delivery: Party B shall deliver the goods to the address designated by Party A. Party B shall bear all losses and accidents before delivery.',
      deliveryPeriod: '4. Delivery Period: Within 30 days after the contract takes effect.',
      acceptanceStandard: '5. Acceptance Criteria: Party A shall notify Party B in writing or by email of the unboxing inspection within 3 business days (excluding holidays) after receiving the goods. If no notification is given within 3 business days, it shall be deemed that Party A has accepted the goods. Products provided by Party B must comply with national standards and the standards confirmed by both parties (Appendix I). If defective products are found during production after warehousing, Party B shall unconditionally accept returns or repairs and deliver qualified products to the address designated by Party A.',
      warranty: '6. Warranty and After-sales Service: Party B guarantees that the goods are original factory products meeting the standards required in Appendix I. The free warranty period is one year from the date Party A receives the goods (excluding human factors and consumable parts). Party B shall not bear warranty responsibility if product failures are caused by improper selection, accidents, misuse, or failure to use according to technical requirements.',
      limitedLiability: '7. Limited Liability: Under any circumstances, Party B\'s total liability under any terms of this contract shall be limited to the actual amount paid by Party A.',
      breach: '8. Breach of Contract: In case of disputes, both parties shall negotiate. If negotiation fails, the case shall be submitted to the People\'s Court where the seller is located. Neither party shall bear responsibility if the contract cannot be performed due to force majeure.',
      confidentiality: '9. Confidentiality: Neither party shall disclose any content of this contract to third parties without permission, including drawings, documents, inspection standards, and solutions. The disclosing party shall bear all consequences of any breach of confidentiality.',
      effectiveness: '10. Effectiveness: This contract takes effect after being signed and sealed by both parties. Scanned copies have equal validity. This contract is made in duplicate, with each party holding one copy.',
      contactPerson: 'Contact:',
      phone: 'Phone:',
      email: 'Email:',
      date: 'Date:',
      signatureAndSeal: 'Signature & Seal:',
      cancel: 'Cancel',
      print: 'Print',
      editSalesDate: 'Sales Date',
      editTaxRate: 'Tax Rate',
      editRemarks: 'Remarks',
      editContact: 'Contact Person',
      editPhone: 'Phone',
      editEmail: 'Email',
      editCreditCode: 'Credit Code',
      editBuyerContact: 'Buyer Contact',
      editBuyerPhone: 'Buyer Phone',
      editBuyerEmail: 'Buyer Email',
      editDefault: 'Edit',
    },
    purchaseOrder: {
      title: 'Purchase Order',
      newTitle: 'New Purchase Order',
      editTitle: 'Edit Purchase Order',
      companyName: 'Shenzhen SunStar Optical Electronics Company, LTD',
      defaultOrderNo: 'Default Doc No.:',
      contractNumber: 'Contract No.:',
      supplier: 'Supplier:',
      selectSupplier: 'Select Supplier',
      entryDate: 'Entry Date:',
      relatedSalesOrder: 'Related Sales Order:',
      selectRelatedSalesOrder: 'Select Sales Order',
      currency: 'Currency:',
      cny: 'CNY',
      usd: 'USD',
      eur: 'EUR',
      no: 'No.',
      businessCategory: 'Category',
      productCode: 'Product Code',
      productName: 'Product Name',
      model: 'Model',
      description: 'Description',
      unit: 'Unit',
      quantity: 'Qty',
      taxRate: 'Tax Rate(%)',
      taxIncludedPrice: 'Price(Incl. Tax)',
      taxExcludedPrice: 'Price(Excl. Tax)',
      taxIncludedAmount: 'Amount(Incl. Tax)',
      taxExcludedAmount: 'Amount(Excl. Tax)',
      taxAmount: 'Tax Amount',
      status: 'Status',
      deliveryDate: 'Delivery Date',
      invoiceDate: 'Invoice Date',
      invoiceNumber: 'Invoice No.',
      invoiceReceived: 'Invoice Received',
      settlementDate: 'Settlement Date',
      settlementAmount: 'Settlement Amt',
      unsettledAmount: 'Unsettled Amt',
      settlementStatus: 'Settlement',
      totalPrice: 'Total',
      notInStock: 'Not in Stock',
      fullyInStock: 'Fully in Stock',
      partiallyInStock: 'Partially in Stock',
      returned: 'Returned',
      unknown: 'Unknown',
      yes: 'Yes',
      noOption: 'No',
      fullySettled: 'Settled',
      partiallySettled: 'Partial',
      unsettled: 'Unsettled',
      purchaseExpense: 'Purchase Expenses',
      transportFee: 'Transport Fee',
      vat: 'VAT',
      handlingFee: 'Handling Fee',
      operatingExpenses: 'Operating Expenses',
      otherFee: 'Other',
      selectProduct: 'Select Product',
      selectCategory: 'Select Category',
      totalWithTax: 'Total (Incl. Tax):',
      addRow: 'Add Row',
      draft: 'Draft',
      getOrderNumberFail: 'Failed to get order number',
      getSuppliersFail: 'Failed to get suppliers',
      getProductsFail: 'Failed to get products',
      getCategoriesFail: 'Failed to get categories',
      loadBasicDataFail: 'Failed to load basic data',
      inputContractNumber: 'Please input contract number',
      selectSupplierMsg: 'Please select supplier',
      selectEntryDate: 'Please select entry date',
      addPurchaseItems: 'Please add purchase items',
      fillAllCategories: 'Please fill in all product categories',
      orderUpdateSuccess: 'Order updated successfully',
      orderCreateSuccess: 'Order created successfully',
      draftSuccess: 'Draft saved',
      draftRestored: 'Draft restored',
      restoreDraftTitle: 'Restore Draft',
      restoreDraftContent: 'Draft found ({summary}, saved at {time}), restore?',
      restore: 'Restore',
      discard: 'Discard',
      salesOrderLoaded: 'Loaded {count} items from sales order {orderNumber}',
      salesOrderParseFail: 'Failed to parse sales order items',
      noProductsInSalesOrder: 'No items in this sales order',
      orderNumber: 'Order No.',
      contractNumberLabel: 'Contract No.',
      supplierName: 'Supplier',
      supplierCode: 'Supplier Code',
      purchaseDate: 'Purchase Date',
      amount: 'Amount',
      purchaser: 'Purchaser',
      sequence: 'No.',
      defaultDocNumber: 'Default Doc No.',
      taxRateLabel: 'Tax Rate(%)',
      taxExcludedAmountLabel: 'Amount(Excl. Tax)',
      taxExcludedPriceLabel: 'Price(Excl. Tax)',
      totalWithTaxLabel: 'Total (Incl. Tax)',
      deleteConfirmTitle: 'Confirm Delete',
      deleteConfirmContent: 'Delete purchase order {orderNumber}?',
      deleteSuccess: 'Deleted successfully',
      deleteFail: 'Failed to delete',
      loadOrdersFail: 'Failed to load purchase orders',
      totalRecords: '{total} records',
      statusUpdateTitle: 'Confirm Status Update',
      statusUpdateContent: 'Update purchase order {orderNumber} status to {status}?',
      statusUpdateSuccess: 'Status updated successfully',
      statusUpdateFail: 'Failed to update status',
    },
    purchaseOrderPrint: {
      title: 'PURCHASE ORDER',
      contractNumber: 'Contract No.:',
      supplier: 'Supplier:',
      orderDate: 'Order Date:',
      currency: 'Currency:',
      taxRate: 'Tax Rate:',
      no: 'No.',
      productCode: 'Product Code',
      productName: 'Product Name',
      specification: 'Specification',
      quantity: 'Qty',
      unit: 'Unit',
      taxIncludedPrice: 'Unit Price',
      amount: 'Amount',
      deliveryDate: 'Delivery',
      remarks: 'Remarks',
      amountInWords: 'Total Amount (In Words):',
      totalAmount: 'Total Amount:',
      contractTerms: 'Terms and Conditions',
      term1: 'The materials must be consistent with the above brand and model, and must be brand new original products. Counterfeits will be compensated at ten times the price.',
      term2: 'The materials must be in original packaging with no oxidized pins. If the materials are not in original packaging, Party A has the right to return the goods at any time.',
      term3: 'Within six months, if any product quality problem is found, regardless of whether it has been put into production or not, Party B shall refund the full payment to Party A within one week upon presentation of the test report or quality report issued by our customer. Party A reserves the right to claim additional processing costs caused by component quality issues from Party B.',
      term4: 'Upon receipt of the order, please confirm and return it with bank information. If the supplier provides incorrect bank information, all consequences shall be borne by the supplier.',
      term5: 'If Party B has confirmed the order but ultimately cancels the order and fails to deliver on time, Party B shall pay 5% of the total order amount as compensation.',
      term6: 'If Party A has paid a deposit to Party B but ultimately cancels the order and fails to deliver on time, Party B shall, in addition to returning the deposit, pay an amount equal to the deposit as compensation.',
      term7: 'If the goods and delivery date of Party B do not meet the requirements of Party A\'s order, Party A has the right to cancel the order.',
      term8: 'If the goods cannot be delivered on time beyond the supplier\'s commitment, the supplier shall pay in full the additional costs for the customer to purchase spot goods.',
      supplierInfo: 'Supplier (Party B) Information',
      buyerInfo: 'Buyer (Party A) Information',
      companyName: 'Company Name:',
      address: 'Address:',
      contactPerson: 'Contact:',
      phone: 'Phone:',
      email: 'Email:',
      signatureAndSeal: 'Signature & Seal:',
      cancel: 'Cancel',
      print: 'Print',
      editOrderDate: 'Order Date',
      editTaxRate: 'Tax Rate',
      editRemarks: 'Remarks',
      editContact: 'Contact',
      editPhone: 'Phone',
      editEmail: 'Email',
      editDefault: 'Edit',
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
