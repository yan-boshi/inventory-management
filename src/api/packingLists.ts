import request from '@/utils/request'

export interface PackingListData {
  packing_list_id?: string
  packing_no: string
  packing_date: string
  po_number?: string
  sales_order_id?: string
  seller_name?: string
  seller_contact?: string
  seller_address?: string
  seller_phone?: string
  buyer_name?: string
  buyer_contact?: string
  buyer_address?: string
  buyer_phone?: string
  packing_items: any[]
  total_packages?: string
  trade_terms?: string
  country_of_origin?: string
  title_en?: string
  title_zh?: string
  seller_stamp?: string
}

export const packingListsApi = {
  getAll: (params = {}) => {
    return request.get('/packing-lists', { params })
  },

  getById: (id: string) => {
    return request.get(`/packing-lists/${id}`)
  },

  getByPackingNo: (packingNo: string) => {
    return request.get(`/packing-lists/by-packing-no/${packingNo}`)
  },

  create: (data: PackingListData) => {
    return request.post('/packing-lists', data)
  },

  update: (id: string, data: Partial<PackingListData>) => {
    return request.put(`/packing-lists/${id}`, data)
  },

  delete: (id: string) => {
    return request.delete(`/packing-lists/${id}`)
  }
}