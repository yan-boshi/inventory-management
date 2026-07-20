import instance from '@/utils/request'
import type {
  SettlementStatement,
  SettlementDetail,
  SettlementSummary,
  SettlementQueryParams,
  PaginatedResponse
} from '@/types'

const API_BASE_URL = '/settlement'

export const settlementApi = {
  // 获取对账单列表
  getList: async (params: SettlementQueryParams = {}): Promise<PaginatedResponse<SettlementStatement>> => {
    return instance.get(`${API_BASE_URL}`, { params })
  },

  // 获取汇总统计
  getSummary: async (params: { billing_month?: string } = {}): Promise<SettlementSummary> => {
    return instance.get(`${API_BASE_URL}/summary`, { params })
  },

  // 获取详情
  getById: async (id: string): Promise<SettlementDetail> => {
    return instance.get(`${API_BASE_URL}/${id}`)
  },

  // 创建对账单
  create: async (data: Partial<SettlementStatement & { items: Partial<SettlementStatementItem>[] }>): Promise<SettlementStatement> => {
    return instance.post(`${API_BASE_URL}`, data)
  },

  // 更新对账单
  update: async (id: string, data: Partial<SettlementStatement & { items: Partial<SettlementStatementItem>[] }>): Promise<SettlementStatement> => {
    return instance.put(`${API_BASE_URL}/${id}`, data)
  },

  // 删除对账单
  delete: async (id: string): Promise<{ message: string }> => {
    return instance.delete(`${API_BASE_URL}/${id}`)
  },

  // 获取未开票的应收/应付记录
  getUninvoicedRecords: async (params: { type: number; settlement_date_start: string; settlement_date_end: string; entity_id: string }): Promise<any[]> => {
    return instance.get(`${API_BASE_URL}/uninvoiced`, { params })
  },

  // 获取出库单/入库单的商品信息
  getOrderItems: async (params: { type: number; order_number: string }): Promise<any[]> => {
    return instance.get(`${API_BASE_URL}/order-items`, { params })
  }
}
