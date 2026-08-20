import instance from '@/utils/request'
import type { PaginatedResponse } from '@/types'

export interface InvoiceItem {
  no: number
  product_name: string
  description?: string
  quantity: number
  unit: string
  unit_value: number
  total_value: number
  remarks?: string
}

export interface Invoice {
  invoice_id: string
  invoice_number: string
  so_number?: string
  invoice_date: string
  seller_name: string
  seller_contact?: string
  seller_address?: string
  seller_phone?: string
  buyer_name: string
  buyer_contact?: string
  buyer_address?: string
  buyer_phone?: string
  trade_terms: string
  currency: string
  invoice_items: string | InvoiceItem[]
  total_value: number
  bank_name?: string
  bank_address?: string
  swift_code?: string
  beneficiary_name?: string
  beneficiary_address?: string
  account_number?: string
  seller_stamp?: string
  sales_order_id?: string
  customer_code?: string
  remarks?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CreateInvoiceRequest {
  invoice_number?: string
  so_number?: string
  invoice_date?: string
  seller_name: string
  seller_contact?: string
  seller_address?: string
  seller_phone?: string
  buyer_name: string
  buyer_contact?: string
  buyer_address?: string
  buyer_phone?: string
  trade_terms?: string
  currency?: string
  invoice_items: InvoiceItem[]
  total_value?: number
  bank_name?: string
  bank_address?: string
  swift_code?: string
  beneficiary_name?: string
  beneficiary_address?: string
  account_number?: string
  seller_stamp?: string
  sales_order_id?: string
  customer_code?: string
  remarks?: string
}

export interface InvoiceQueryParams {
  page?: number
  pageSize?: number
  invoiceNumber?: string
  soNumber?: string
  buyerName?: string
  startDate?: string
  endDate?: string
}

const API_BASE_URL = '/invoices'

export const invoicesApi = {
  // 获取所有发票（分页查询）
  getAll: async (params: InvoiceQueryParams = {}) => {
    return instance.get<PaginatedResponse<Invoice>>(`${API_BASE_URL}`, { params })
  },

  // 根据ID获取发票
  getById: async (id: string) => {
    return instance.get<{ success: boolean; data: Invoice }>(`${API_BASE_URL}/${id}`)
  },

  // 创建发票
  create: async (data: CreateInvoiceRequest) => {
    return instance.post<{ success: boolean; data: Invoice }>(`${API_BASE_URL}`, data)
  },

  // 更新发票
  update: async (id: string, data: Partial<CreateInvoiceRequest>) => {
    return instance.put<{ success: boolean; data: Invoice }>(`${API_BASE_URL}/${id}`, data)
  },

  // 删除发票
  delete: async (id: string) => {
    return instance.delete<{ success: boolean; message: string }>(`${API_BASE_URL}/${id}`)
  },

  // 获取新的发票号
  getNewInvoiceNumber: async () => {
    return instance.get<{ success: boolean; data: string }>(`${API_BASE_URL}/new-invoice-number`)
  },

  // 根据销售订单ID获取发票
  getBySalesOrderId: async (salesOrderId: string) => {
    return instance.get<{ success: boolean; data: Invoice[] }>(`${API_BASE_URL}/by-sales-order/${salesOrderId}`)
  }
}
