import instance from '@/utils/request'
import type { BusinessCategoryOption, PaginatedResponse, BusinessCategory, CreateBusinessCategoryRequest, UpdateBusinessCategoryRequest } from '@/types'

const API_BASE_URL = '/business-categories'

export const businessCategoriesApi = {
  getAllList: async () => {
    const response = await instance.get<{ success: boolean; data: BusinessCategoryOption[] }>(`${API_BASE_URL}/list`)
    return response.data
  },

  getAll: async (params = {}) => {
    return instance.get<PaginatedResponse<BusinessCategory>>(`${API_BASE_URL}`, { params })
  },

  create: async (data: CreateBusinessCategoryRequest) => {
    return instance.post<BusinessCategory>(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: UpdateBusinessCategoryRequest) => {
    return instance.put<BusinessCategory>(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  }
}
