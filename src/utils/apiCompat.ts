// 兼容性导出文件
// 从 deliveryOrders.ts 中导出旧版本函数，确保代码不会因为结构变化而崩溃

export { deliveryOrdersApi as getDeliveryOrdersApi } from '@/api/deliveryOrders'
export { warehousingOrdersApi as getWarehousingOrdersApi } from '@/api/warehousingOrders'
export { productApi as getProductApi } from '@/api/products'
export { supplierApi as getSupplierApi } from '@/api/suppliers'
export { customerApi as getCustomerApi } from '@/api/customers'
export { salesOrdersApi as getSalesOrdersApi } from '@/api/salesOrders'