import instance from '@/utils/request'
import type {
  ApiResponse,
  DeliveryOrder,
  CreateDeliveryOrderRequest,
  UpdateDeliveryOrderRequest,
  DeliveryOrderQueryParams,
  PaginatedResponse,
  UndeliveredSalesOrder
} from '@/types'

const API_BASE_URL = '/delivery-orders'

export const deliveryOrdersApi = {
  getAll: async (params: DeliveryOrderQueryParams = {}): Promise<PaginatedResponse<DeliveryOrder>> => {
    return instance.get(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string): Promise<DeliveryOrder> => {
    return instance.get(`${API_BASE_URL}/${id}`)
  },

  create: async (data: CreateDeliveryOrderRequest): Promise<DeliveryOrder> => {
    return instance.post(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: UpdateDeliveryOrderRequest): Promise<DeliveryOrder> => {
    return instance.put(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return instance.delete(`${API_BASE_URL}/${id}`)
  },

  getNewOrderNumber: async () => {
    const response = await instance.get<{ success: boolean; data: { order_number: string } }>(`${API_BASE_URL}/new-order-number`)
    return response.data
  },

  getUndeliveredSalesOrders: async (): Promise<ApiResponse<UndeliveredSalesOrder[]>> => {
    return instance.get(`${API_BASE_URL}/undelivered-sales-orders`)
  }
}
