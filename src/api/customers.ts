import instance from '@/utils/request'
import type { CustomerOption, PaginatedResponse, Customer, CreateCustomerRequest, UpdateCustomerRequest } from '@/types'

const API_BASE_URL = '/customers'

export const customersApi = {
  getAllList: async (): Promise<CustomerOption[]> => {
    const response = await instance.get<{ success: boolean; data: CustomerOption[] }>(`${API_BASE_URL}/list`)
    return response.data as unknown as CustomerOption[]
  },

  getAll: async (params = {}) => {
    return instance.get<PaginatedResponse<Customer>>(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await instance.get<{ success: boolean; data: Customer }>(`${API_BASE_URL}/${id}`)
    return response.data as unknown as Customer
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
