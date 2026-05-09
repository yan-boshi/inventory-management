import instance from '@/utils/request'
import type { ProductOption, PaginatedResponse, Product, CreateProductRequest, UpdateProductRequest } from '@/types'

const API_BASE_URL = '/products'

export const productsApi = {
  getAllList: async () => {
    const response = await instance.get<{ success: boolean; data: ProductOption[] }>(`${API_BASE_URL}/list`)
    return response.data
  },

  getAll: async (params = {}) => {
    return instance.get<PaginatedResponse<Product>>(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string) => {
    return instance.get<Product>(`${API_BASE_URL}/${id}`)
  },

  create: async (data: CreateProductRequest) => {
    return instance.post<Product>(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: UpdateProductRequest) => {
    return instance.put<Product>(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  }
}
