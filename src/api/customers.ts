import instance from '@/utils/request'
import type { CustomerOption, PaginatedResponse, Customer, CreateCustomerRequest, UpdateCustomerRequest } from '@/types'

const API_BASE_URL = '/customers'

export const customersApi = {
  getAllList: async () => {
    return instance.get<{ success: boolean; data: CustomerOption[] }>(`${API_BASE_URL}/list`)
  },

  getAll: async (params = {}) => {
    return instance.get<PaginatedResponse<Customer>>(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string) => {
    return instance.get<{ success: boolean; data: Customer }>(`${API_BASE_URL}/${id}`)
  },

  create: async (data: CreateCustomerRequest) => {
    return instance.post<Customer>(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: UpdateCustomerRequest) => {
    return instance.put<Customer>(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  }
}
