import instance from '@/utils/request'
import type { PurchaseOrder, CreatePurchaseOrderRequest, UpdatePurchaseOrderRequest, PurchaseOrderQueryParams, PaginatedResponse } from '@/types'

const API_BASE_URL = '/purchase-orders'

export const purchaseOrdersApi = {
  getAll: async (params: PurchaseOrderQueryParams = {}) => {
    return instance.get<PaginatedResponse<PurchaseOrder>>(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string) => {
    return instance.get<PurchaseOrder>(`${API_BASE_URL}/${id}`)
  },

  create: async (data: CreatePurchaseOrderRequest) => {
    return instance.post<PurchaseOrder>(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: UpdatePurchaseOrderRequest) => {
    return instance.put<PurchaseOrder>(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  },

  return: async (id: string) => {
    return instance.post<PurchaseOrder>(`${API_BASE_URL}/${id}/return`)
  },

  getNewOrderNumber: async () => {
    const response = await instance.get<{ success: boolean; data: { order_number: string } }>(`${API_BASE_URL}/new-order-number`)
    return response.data
  }
}
