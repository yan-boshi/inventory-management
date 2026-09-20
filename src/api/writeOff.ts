import instance from '@/utils/request'
import type {
  WriteOffDocument,
  WriteOffDetail,
  WriteOffSummary,
  WriteOffQueryParams,
  PendingRecord,
  PaginatedResponse
} from '@/types'

const API_BASE_URL = '/write-off'

export const writeOffApi = {
  // 获取核销单列表
  getList: async (params: WriteOffQueryParams = {}): Promise<PaginatedResponse<WriteOffDocument>> => {
    return instance.get(`${API_BASE_URL}`, { params })
  },

  // 获取汇总统计
  getSummary: async (params: { write_off_date_start?: string; write_off_date_end?: string } = {}): Promise<WriteOffSummary> => {
    return instance.get(`${API_BASE_URL}/summary`, { params })
  },

  // 获取详情
  getById: async (id: string): Promise<WriteOffDetail> => {
    return instance.get(`${API_BASE_URL}/${id}`)
  },

  // 获取下一个核销单编号
  getNextNumber: async (): Promise<{ write_off_number: string }> => {
    return instance.get(`${API_BASE_URL}/next-number`)
  },

  // 获取待核销的应收/应付账款
  getPendingRecords: async (params: { type: number; entity_id: string }): Promise<PaginatedResponse<PendingRecord>> => {
    return instance.get(`${API_BASE_URL}/pending-records`, { params })
  },

  // 创建核销单
  create: async (data: any): Promise<WriteOffDetail> => {
    return instance.post(`${API_BASE_URL}`, data)
  },

  // 编辑核销单
  update: async (id: string, data: any): Promise<WriteOffDetail> => {
    return instance.put(`${API_BASE_URL}/${id}`, data)
  },

  // 作废核销单
  void: async (id: string): Promise<{ message: string }> => {
    return instance.put(`${API_BASE_URL}/${id}/void`)
  }
}
