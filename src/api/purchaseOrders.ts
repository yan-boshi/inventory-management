import instance from '@/utils/request'
import type { PurchaseOrder, CreatePurchaseOrderRequest, UpdatePurchaseOrderRequest, PurchaseOrderQueryParams, PaginatedResponse, PlanRestoreSummary } from '@/types'

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

  delete: async (id: string, options?: { restorePlan?: boolean }): Promise<{ message: string; data?: PlanRestoreSummary | null }> => {
    return instance.delete(`${API_BASE_URL}/${id}`, {
      params: options?.restorePlan ? { restorePlan: 1 } : undefined
    })
  },

  updateStatus: async (id: string, status: 1 | 2 | 3 | 4) => {
    return instance.put<PurchaseOrder>(`${API_BASE_URL}/${id}/status`, { status })
  },

  getNewOrderNumber: async () => {
    const response = await instance.get<{ success: boolean; data: { order_number: string } }>(`${API_BASE_URL}/new-order-number`)
    return response.data
  }
}
