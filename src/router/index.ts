import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { UserRole } from '@/types'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Layout',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue')
        },
        {
          path: 'sales-orders',
          name: 'SalesOrders',
          component: () => import('@/views/sales/SalesOrders.vue'),
          meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'purchase-orders',
          name: 'PurchaseOrders',
          component: () => import('@/views/purchase/PurchaseOrders.vue'),
          meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'quotations',
          name: 'Quotations',
          component: () => import('@/views/quotations/Quotations.vue'),
          meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'warehousing-orders',
          name: 'WarehousingOrders',
          component: () => import('@/views/warehousing/WarehousingOrders.vue'),
          meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'customers',
          name: 'Customers',
          component: () => import('@/views/customers/Customers.vue'),
          meta: { roles: ['advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'suppliers',
          name: 'Suppliers',
          component: () => import('@/views/suppliers/Suppliers.vue'),
          meta: { roles: ['advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'payment-methods',
          name: 'PaymentMethods',
          component: () => import('@/views/settings/PaymentMethods.vue'),
          meta: { roles: ['advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('@/views/products/Products.vue'),
          meta: { roles: ['advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'business-categories',
          name: 'BusinessCategories',
          component: () => import('@/views/settings/BusinessCategories.vue'),
          meta: { roles: ['advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'delivery-orders',
          name: 'DeliveryOrders',
          component: () => import('@/views/delivery/DeliveryOrders.vue'),
          meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/users/Users.vue'),
          meta: { roles: ['admin'] as UserRole[] }
        },
        {
          path: 'inventory-report',
          name: 'InventoryReport',
          component: () => import('@/views/reports/InventoryReport.vue'),
          meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'warehousing-expense-report',
          name: 'WarehousingExpenseReport',
          component: () => import('@/views/reports/WarehousingExpenseReport.vue'),
          meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
        },
        {
          path: 'delivery-expense-report',
          name: 'DeliveryExpenseReport',
          component: () => import('@/views/reports/DeliveryExpenseReport.vue'),
          meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
        }
      ]
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/layouts/AuthLayout.vue'),
      children: [
        {
          path: '',
          name: 'LoginPage',
          component: () => import('@/views/auth/Login.vue')
        }
      ],
      meta: { guest: true }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/layouts/AuthLayout.vue'),
      children: [
        {
          path: '',
          name: 'RegisterPage',
          component: () => import('@/views/auth/Register.vue')
        }
      ],
      meta: { guest: true }
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  if (to.meta.guest) {
    if (userStore.isLoggedIn) {
      next('/')
    } else {
      next()
    }
  } else {
    if (!userStore.isLoggedIn) {
      next('/login')
    } else {
      const roles = to.meta.roles as UserRole[] | undefined
      if (roles && !roles.includes(userStore.user?.role as UserRole)) {
        next('/')
      } else {
        next()
      }
    }
  }
})

export default router
