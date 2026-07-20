import instance from '@/utils/request'
import type {
  Receivable,
  ReceivableQueryParams,
  PaginatedResponse
} from '@/types'

const API_BASE_URL = '/receivables'

export const receivablesApi = {
  getAll: async (params: ReceivableQueryParams = {}): Promise<PaginatedResponse<Receivable>> => {
    return instance.get(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string): Promise<Receivable> => {
    return instance.get(`${API_BASE_URL}/${id}`)
  },

  update: async (id: string, data: Partial<Receivable>): Promise<Receivable> => {
    return instance.put(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return instance.delete(`${API_BASE_URL}/${id}`)
  }
}
