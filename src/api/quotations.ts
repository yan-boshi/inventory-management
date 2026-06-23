import instance from '@/utils/request'
import type { Quotation, CreateQuotationRequest, UpdateQuotationRequest, QuotationQueryParams, PaginatedResponse } from '@/types'

const API_BASE_URL = '/quotations'

export const quotationsApi = {
  // 获取所有报价单（分页查询）
  getAll: async (params: QuotationQueryParams = {}) => {
    return instance.get<PaginatedResponse<Quotation>>(`${API_BASE_URL}`, { params })
  },

  // 根据ID获取报价单
  getById: async (id: string) => {
    return instance.get<Quotation>(`${API_BASE_URL}/${id}`)
  },

  // 创建报价单
  create: async (data: CreateQuotationRequest) => {
    return instance.post<Quotation>(`${API_BASE_URL}`, data)
  },

  // 更新报价单
  update: async (id: string, data: UpdateQuotationRequest) => {
    return instance.put<Quotation>(`${API_BASE_URL}/${id}`, data)
  },

  // 删除报价单
  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  },

  // 获取新的报价编号
  getNewQuotationNumber: async () => {
    return instance.get<{ success: boolean; data: { quotation_number: string } }>(`${API_BASE_URL}/new-quotation-number`)
  }
}
