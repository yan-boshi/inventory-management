import instance from '@/utils/request'
import type { SupplierOption, PaginatedResponse, Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '@/types'

const API_BASE_URL = '/suppliers'

export const suppliersApi = {
  getAllList: async () => {
    return instance.get<{ success: boolean; data: SupplierOption[] }>(`${API_BASE_URL}/list`)
  },

  getAll: async (params = {}) => {
    return instance.get<PaginatedResponse<Supplier>>(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string) => {
    return instance.get<Supplier>(`${API_BASE_URL}/${id}`)
  },

  create: async (data: CreateSupplierRequest) => {
    return instance.post<Supplier>(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: UpdateSupplierRequest) => {
    return instance.put<Supplier>(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  }
}
