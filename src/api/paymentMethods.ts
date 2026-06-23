import instance from '@/utils/request'
import type { PaymentMethodOption, PaginatedResponse, PaymentMethod, CreatePaymentMethodRequest, UpdatePaymentMethodRequest } from '@/types'

const API_BASE_URL = '/payment-methods'

export const paymentMethodsApi = {
  getAllList: async () => {
    return instance.get<{ success: boolean; data: PaymentMethodOption[] }>(`${API_BASE_URL}/list`)
  },

  getAll: async (params = {}) => {
    return instance.get<PaginatedResponse<PaymentMethod>>(`${API_BASE_URL}`, { params })
  },

  create: async (data: CreatePaymentMethodRequest) => {
    return instance.post<PaymentMethod>(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: UpdatePaymentMethodRequest) => {
    return instance.put<PaymentMethod>(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  }
}
