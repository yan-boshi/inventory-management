<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo">
        <h3>旭思达ERP系统</h3>
      </div>
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline">
        <!-- <a-menu-item key="Dashboard" @click="navigateTo('/')">
          <template #icon>
            <DashboardOutlined />
          </template>
          <span>仪表盘</span>
        </a-menu-item> -->
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
          <a-menu-item
            key="WarehousingExpenseReport"
            @click="navigateTo('/warehousing-expense-report')"
          >
            入库费用明细表
          </a-menu-item>
          <a-menu-item key="DeliveryOrders" @click="navigateTo('/delivery-orders')">
            <span>出库单</span>
          </a-menu-item>
          <a-menu-item key="DeliveryExpenseReport" @click="navigateTo('/delivery-expense-report')">
            出库费用明细表
          </a-menu-item>
          <a-menu-item key="InventoryReport" @click="navigateTo('/inventory-report')">
            进销存明细表
          </a-menu-item>
        </a-sub-menu>
        <a-sub-menu key="Reports">
          <template #icon>
            <BarChartOutlined />
          </template>
          <template #title>报表中心</template>
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
    </a-layout-sider>
    <a-layout>
      <a-layout-header style="background: #fff; padding: 0">
        <div class="header-content">
          <div class="left">
            <MenuUnfoldOutlined v-if="collapsed" class="trigger" @click="toggleCollapsed" />
            <MenuFoldOutlined v-else class="trigger" @click="toggleCollapsed" />
          </div>
          <div class="right">
            <a-dropdown>
              <a-space class="user-info">
                <a-avatar>
                  <template #icon>
                    <UserOutlined />
                  </template>
                </a-avatar>
                <span>{{ userStore.user?.username }}</span>
                <DownOutlined />
              </a-space>
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
        </div>
      </a-layout-header>
      <a-layout-content style="margin: 16px">
        <div style="padding: 24px; background: #fff; min-height: 360px">
          <router-view />
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
import {
  DashboardOutlined,
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
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  DownOutlined,
  LogoutOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const collapsed = ref(false)
const selectedKeys = ref<string[]>([route.name as string])

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}

const navigateTo = (path: string) => {
  router.push(path)
}

const handleLogout = () => {
  userStore.clearUser()
  message.success('退出登录成功')
  router.push('/login')
}

watch(
  () => route.name,
  name => {
    if (name) {
      selectedKeys.value = [name as string]
    }
  }
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

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

.header-content .left {
  font-size: 18px;
  cursor: pointer;
}

.header-content .right {
  display: flex;
  align-items: center;
}

.trigger:hover {
  color: #1890ff;
}

.user-info {
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f5f5;
}
</style>
