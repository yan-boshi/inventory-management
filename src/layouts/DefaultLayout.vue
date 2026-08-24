<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" style="position: relative">
      <div class="logo">
        <h3>旭思达ERP系统</h3>
      </div>
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline">
        <a-menu-item key="Customers" @click="navigateTo('/customers')" v-if="userStore.isAdvanced">
          <template #icon>
            <TeamOutlined />
          </template>
          <span>客户管理</span>
        </a-menu-item>
        <a-menu-item key="Suppliers" @click="navigateTo('/suppliers')" v-if="userStore.isAdvanced">
          <template #icon>
            <ShopOutlined />
          </template>
          <span>供应商管理</span>
        </a-menu-item>
        <a-sub-menu key="Sales">
          <template #icon>
            <ShoppingCartOutlined />
          </template>
          <template #title>销售管理</template>
          <a-menu-item key="Quotations" @click="navigateTo('/quotations')">
            <span>报价单</span>
          </a-menu-item>
          <a-menu-item key="SalesOrders" @click="navigateTo('/sales-orders')">
            <span>销售订单</span>
          </a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="Purchase">
          <template #icon>
            <ShoppingOutlined />
          </template>
          <template #title>采购管理</template>
          <a-menu-item key="PurchaseOrders" @click="navigateTo('/purchase-orders')">
            <span>采购订单</span>
          </a-menu-item>
          <a-menu-item key="PurchasePlans" @click="navigateTo('/purchase-plans')">
            <span>采购计划</span>
          </a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="Inventory">
          <template #icon>
            <FileTextOutlined />
          </template>
          <template #title>库存管理</template>
          <a-menu-item
            key="WarehousingOrders"
            @click="navigateTo('/warehousing-orders')"
            v-if="userStore.isAdvanced"
          >
            <span>入库单</span>
          </a-menu-item>
          <a-menu-item key="InboundPlans" @click="navigateTo('/inbound-plans')">
            <span>入库计划</span>
          </a-menu-item>
          <a-menu-item key="InboundReturnOrders" @click="navigateTo('/inbound-return-orders')">
            <span>入库退货单</span>
          </a-menu-item>
          <a-menu-item
            key="WarehousingExpenseReport"
            @click="navigateTo('/warehousing-expense-report')"
          >
            入库明细表
          </a-menu-item>
          <a-menu-item key="DeliveryOrders" @click="navigateTo('/delivery-orders')">
            <span>出库单</span>
          </a-menu-item>
          <a-menu-item key="OutboundPlans" @click="navigateTo('/outbound-plans')">
            <span>出库计划</span>
          </a-menu-item>
          <a-menu-item key="OutboundReturnOrders" @click="navigateTo('/outbound-return-orders')">
            <span>出库退货单</span>
          </a-menu-item>
          <a-menu-item key="DeliveryExpenseReport" @click="navigateTo('/delivery-expense-report')">
            出库明细表
          </a-menu-item>
          <a-menu-item key="InventoryReport" @click="navigateTo('/inventory-report')">
            进销存明细表
          </a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="ReceivablePayable">
          <template #icon>
            <AccountBookOutlined />
          </template>
          <template #title>应收应付</template>
          <a-menu-item key="Receivables" @click="navigateTo('/receivables')">
            <span>应收账款</span>
          </a-menu-item>
          <a-menu-item key="Payables" @click="navigateTo('/payables')">
            <span>应付账款</span>
          </a-menu-item>
          <a-menu-item key="SettlementStatement" @click="navigateTo('/settlement-statement')">
            <span>对账单</span>
          </a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="Reports">
          <template #icon>
            <BarChartOutlined />
          </template>
          <template #title>报表中心</template>
          <a-menu-item key="ProfitReport" @click="navigateTo('/profit-report')">
            毛利表
          </a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="Documents">
          <template #icon>
            <FileSearchOutlined />
          </template>
          <template #title>单据中心</template>
          <a-menu-item key="PackingLists" @click="navigateTo('/packing-lists')">
            装箱单
          </a-menu-item>
          <a-menu-item key="Invoices" @click="navigateTo('/invoices')">
            发票
          </a-menu-item>
        </a-sub-menu>
        <a-menu-item key="Products" @click="navigateTo('/products')" v-if="userStore.isAdvanced">
          <template #icon>
            <AppstoreOutlined />
          </template>
          <span>产品管理</span>
        </a-menu-item>
        <a-menu-item
          key="PaymentMethods"
          @click="navigateTo('/payment-methods')"
          v-if="userStore.isAdvanced"
        >
          <template #icon>
            <PayCircleOutlined />
          </template>
          <span>结算方式</span>
        </a-menu-item>
        <a-menu-item
          key="BusinessCategories"
          @click="navigateTo('/business-categories')"
          v-if="userStore.isAdvanced"
        >
          <template #icon>
            <AppstoreAddOutlined />
          </template>
          <span>业务分类</span>
        </a-menu-item>
        <a-menu-item
          key="ProductClassifications"
          @click="navigateTo('/product-classifications')"
          v-if="userStore.isAdvanced"
        >
          <template #icon>
            <TagsOutlined />
          </template>
          <span>产品分类</span>
        </a-menu-item>
        <a-menu-item key="Users" @click="navigateTo('/users')" v-if="userStore.isAdmin">
          <template #icon>
            <SettingOutlined />
          </template>
          <span>用户管理</span>
        </a-menu-item>
      </a-menu>
      <div class="sidebar-footer">
        <a-dropdown>
          <div class="user-info-sidebar">
            <a-avatar size="small">
              <template #icon>
                <UserOutlined />
              </template>
            </a-avatar>
            <span v-if="!collapsed" class="username">{{ userStore.user?.username }}</span>
          </div>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="handleLogout">
                <LogoutOutlined />
                <span>退出登录</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </a-layout-sider>
    <a-layout>
      <div class="tabs-container">
        <a-tabs
          v-model:activeKey="tabsStore.activeKey"
          type="editable-card"
          size="small"
          hide-add
          @edit="onTabEdit"
          @change="onTabChange"
        >
          <a-tab-pane
            v-for="tab in tabsStore.tabs"
            :key="tab.key"
            :tab="tab.title"
            :closable="tab.closable"
          />
        </a-tabs>
      </div>
      <a-layout-content>
        <div class="content-wrapper">
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { useUserStore } from '@/stores/user'
import { useTabsStore } from '@/stores/tabs'
import {
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ShopOutlined,
  AppstoreOutlined,
  PayCircleOutlined,
  AppstoreAddOutlined,
  TagsOutlined,
  SettingOutlined,
  FileTextOutlined,
  BarChartOutlined,
  AccountBookOutlined,
  UserOutlined,
  LogoutOutlined,
  FileSearchOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const tabsStore = useTabsStore()

const collapsed = ref(false)
const selectedKeys = ref<string[]>([route.name as string])

const navigateTo = (path: string) => {
  router.push(path)
}

const handleLogout = () => {
  userStore.clearUser()
  tabsStore.clearTabs()
  message.success('退出登录成功')
  router.push('/login')
}

// 标签页编辑（关闭）
const onTabEdit = (targetKey: any, action: string) => {
  if (action === 'remove') {
    const targetTab = tabsStore.tabs.find(t => t.key === targetKey)
    if (targetTab) {
      tabsStore.removeTab(targetKey as string)
      // 如果关闭的是当前标签，导航到新的活跃标签
      if (tabsStore.activeKey !== targetKey) {
        router.push(tabsStore.activeTabPath)
      }
    }
  }
}

// 标签页切换
const onTabChange = (activeKey: string) => {
  const tab = tabsStore.tabs.find(t => t.key === activeKey)
  if (tab) {
    router.push(tab.path)
  }
}

// 监听路由变化，自动添加标签
watch(
  () => route.path,
  () => {
    if (route.name) {
      const routeName = route.name as string
      selectedKeys.value = [routeName]
      tabsStore.addTab(routeName, route.path)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.logo {
  height: 32px;
  margin: 16px;
  color: white;
  text-align: center;
}

.logo h3 {
  margin: 0;
}

.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.user-info-sidebar {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  color: white;
  transition: background-color 0.3s;
}

.user-info-sidebar:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.username {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tabs-container {
  background: #fff;
  padding: 8px 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.tabs-container :deep(.ant-tabs) {
  margin-bottom: 0;
}

.tabs-container :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.content-wrapper {
  padding: 16px;
  background: #fff;
  min-height: 360px;
  margin: 16px;
}
</style>
