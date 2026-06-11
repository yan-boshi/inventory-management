import instance from '@/utils/request'
import type { WarehousingOrder, CreateWarehousingOrderRequest, UpdateWarehousingOrderRequest, WarehousingOrderQueryParams, PaginatedResponse } from '@/types'

const API_BASE_URL = '/warehousing-orders'

export const warehousingOrdersApi = {
  getAll: async (params: WarehousingOrderQueryParams = {}) => {
    return instance.get<PaginatedResponse<WarehousingOrder>>(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string) => {
    return instance.get<WarehousingOrder>(`${API_BASE_URL}/${id}`)
  },

  create: async (data: CreateWarehousingOrderRequest) => {
    return instance.post<WarehousingOrder>(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: UpdateWarehousingOrderRequest) => {
    return instance.put<WarehousingOrder>(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  },

  getNewOrderNumber: async () => {
    return instance.get<{ order_number: string }>(`${API_BASE_URL}/new-order-number`)
  },

  getPurchaseOrdersForWarehousing: async () => {
    return instance.get<WarehousingOrder[]>('/purchase-orders')
  }
}
