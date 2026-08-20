import instance from '@/utils/request'
import type { InboundReturnOrder, InboundReturnQueryParams } from '@/types'

const API_BASE_URL = '/inbound-returns'

export const inboundReturnsApi = {
  getAll: async (params: InboundReturnQueryParams = {}) => {
    return instance.get<{ data: InboundReturnOrder[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>(`${API_BASE_URL}`, { params })
  },

  getById: async (id: string) => {
    return instance.get<InboundReturnOrder>(`${API_BASE_URL}/${id}`)
  },

  create: async (data: Partial<InboundReturnOrder>) => {
    return instance.post<InboundReturnOrder>(`${API_BASE_URL}`, data)
  },

  update: async (id: string, data: Partial<InboundReturnOrder>) => {
    return instance.put<InboundReturnOrder>(`${API_BASE_URL}/${id}`, data)
  },

  delete: async (id: string) => {
    return instance.delete(`${API_BASE_URL}/${id}`)
  },

  getNewOrderNumber: async () => {
    return instance.get<{ order_number: string }>(`${API_BASE_URL}/new-order-number`)
  }
}

// 保持向后兼容的导出
export const getAllInboundReturns = inboundReturnsApi.getAll
export const getInboundReturnById = inboundReturnsApi.getById
export const createInboundReturn = inboundReturnsApi.create
export const updateInboundReturn = inboundReturnsApi.update
export const deleteInboundReturn = inboundReturnsApi.delete
export const getNewInboundReturnOrderNumber = inboundReturnsApi.getNewOrderNumber
