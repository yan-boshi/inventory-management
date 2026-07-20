import instance from '@/utils/request'
import type {
  Payable,
  PayableQueryParams,
  PaginatedResponse
} from '@/types'

const API_BASE_URL = '/payables'

export const payablesApi = {
  getAll: async (params: PayableQueryParams = {}): Promise<PaginatedResponse<Payable>> => {
    return instance.get(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string): Promise<Payable> => {
    return instance.get(`${API_BASE_URL}/${id}`)
  },

  update: async (id: string, data: Partial<Payable>): Promise<Payable> => {
    return instance.put(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return instance.delete(`${API_BASE_URL}/${id}`)
  }
}
