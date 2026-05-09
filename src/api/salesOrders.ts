import instance from '@/utils/request'
import type { SalesOrder, CreateSalesOrderRequest, UpdateSalesOrderRequest, SalesOrderQueryParams, PaginatedResponse } from '@/types'

const API_BASE_URL = '/sales-orders'

export const salesOrdersApi = {
  // 获取所有销售订单（分页查询）
  getAll: async (params: SalesOrderQueryParams = {}) => {
    return instance.get<PaginatedResponse<SalesOrder>>(`${API_BASE_URL}`, { params })
  },

  // 根据ID获取销售订单
  getById: async (id: string) => {
    return instance.get<SalesOrder>(`${API_BASE_URL}/${id}`)
  },

  // 创建销售订单
  create: async (data: CreateSalesOrderRequest) => {
    return instance.post<SalesOrder>(`${API_BASE_URL}`, data)
  },

  // 更新销售订单
  update: async (id: string, data: UpdateSalesOrderRequest) => {
    return instance.put<SalesOrder>(`${API_BASE_URL}/${id}`, data)
  },

  // 删除销售订单
  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  },

  // 退货销售订单
  return: async (id: string) => {
    return instance.post<SalesOrder>(`${API_BASE_URL}/${id}/return`)
  },

  // 获取新的订单号
  getNewOrderNumber: async () => {
    const response = await instance.get<{ success: boolean; data: { order_number: string } }>(`${API_BASE_URL}/new-order-number`)
    return response.data
  }
}