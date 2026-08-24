import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Tab {
  key: string      // 路由名称
  title: string    // 标签标题
  path: string     // 路由路径
  closable: boolean // 是否可关闭
}

// 路由名称到中文标题的映射
const routeTitleMap: Record<string, string> = {
  Dashboard: '仪表盘',
  Customers: '客户管理',
  Suppliers: '供应商管理',
  SalesOrders: '销售订单',
  Quotations: '报价单',
  PurchaseOrders: '采购订单',
  PurchasePlans: '采购计划',
  WarehousingOrders: '入库单',
  InboundPlans: '入库计划',
  InboundReturnOrders: '入库退货单',
  WarehousingExpenseReport: '入库明细表',
  DeliveryOrders: '出库单',
  OutboundPlans: '出库计划',
  OutboundReturnOrders: '出库退货单',
  DeliveryExpenseReport: '出库明细表',
  InventoryReport: '进销存明细表',
  Receivables: '应收账款',
  Payables: '应付账款',
  SettlementStatement: '对账单',
  SettlementCreate: '新增对账单',
  SettlementCreateReceivable: '新增应收对账单',
  SettlementCreatePayable: '新增应付对账单',
  SettlementDetail: '对账单详情',
  SettlementEdit: '编辑对账单',
  ProfitReport: '毛利表',
  PackingLists: '装箱单',
  Invoices: '发票',
  Products: '产品管理',
  PaymentMethods: '结算方式',
  BusinessCategories: '业务分类',
  ProductClassifications: '产品分类',
  Users: '用户管理'
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([])
  const activeKey = ref<string>('')

  // 获取标签标题
  function getTabTitle(routeName: string): string {
    return routeTitleMap[routeName] || routeName
  }

  // 添加标签
  function addTab(routeName: string, path: string) {
    const existingTab = tabs.value.find(tab => tab.key === routeName)
    if (!existingTab) {
      tabs.value.push({
        key: routeName,
        title: getTabTitle(routeName),
        path: path,
        closable: routeName !== 'Dashboard'
      })
    }
    activeKey.value = routeName
  }

  // 移除标签
  function removeTab(targetKey: string) {
    const targetIndex = tabs.value.findIndex(tab => tab.key === targetKey)
    if (targetIndex === -1) return

    tabs.value = tabs.value.filter(tab => tab.key !== targetKey)

    // 如果关闭的是当前活跃标签，需要切换到其他标签
    if (activeKey.value === targetKey) {
      const newActiveTab = tabs.value[targetIndex] || tabs.value[tabs.value.length - 1]
      if (newActiveTab) {
        activeKey.value = newActiveTab.key
      }
    }
  }

  // 设置活跃标签
  function setActiveTab(key: string) {
    activeKey.value = key
  }

  // 获取当前活跃标签的路径
  const activeTabPath = computed(() => {
    const tab = tabs.value.find(t => t.key === activeKey.value)
    return tab?.path || '/'
  })

  // 清除所有标签（退出登录时调用）
  function clearTabs() {
    tabs.value = []
    activeKey.value = ''
  }

  return {
    tabs,
    activeKey,
    addTab,
    removeTab,
    setActiveTab,
    activeTabPath,
    clearTabs,
    getTabTitle
  }
})
