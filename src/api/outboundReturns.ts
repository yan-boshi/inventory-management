import instance from '@/utils/request'
import type { OutboundReturnOrder, OutboundReturnQueryParams } from '@/types'

const API_BASE_URL = '/outbound-returns'

export const outboundReturnsApi = {
  getAll: async (params: OutboundReturnQueryParams = {}) => {
    return instance.get<{ data: OutboundReturnOrder[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string) => {
    return instance.get<OutboundReturnOrder>(`${API_BASE_URL}/${id}`)
  },

  create: async (data: Partial<OutboundReturnOrder>) => {
    return instance.post<OutboundReturnOrder>(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: Partial<OutboundReturnOrder>) => {
    return instance.put<OutboundReturnOrder>(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string) => {
    return instance.delete(`${API_BASE_URL}/${id}`)
  },

  getNewOrderNumber: async () => {
    return instance.get<{ order_number: string }>(`${API_BASE_URL}/new-order-number`)
  }
}

// 保持向后兼容的导出
export const getAllOutboundReturns = outboundReturnsApi.getAll
export const getOutboundReturnById = outboundReturnsApi.getById
export const createOutboundReturn = outboundReturnsApi.create
export const updateOutboundReturn = outboundReturnsApi.update
export const deleteOutboundReturn = outboundReturnsApi.delete
export const getNewOutboundReturnOrderNumber = outboundReturnsApi.getNewOrderNumber
