import instance from '@/utils/request'

export interface BasicProfitReportParams {
  startDate?: string
  endDate?: string
  contractNumber?: string
  customerName?: string
  productCode?: string
  salesPerson?: string
  page?: number
  pageSize?: number
}

export interface BasicProfitReportItem {
  contract_number: string
  customer_name: string
  sales_person: string
  entry_date: string
  product_name: string
  product_code: string
  model: string
  quantity: number
  currency: string
  unit_price: number
  amount: number
  sales_customs_rate: number | null
  sales_amount_cny: number | null
  purchase_contract_number: string
  supplier_name: string
  purchase_person: string
  purchase_quantity: number
  purchase_currency: string
  purchase_unit_price: number
  purchase_amount: number
  purchase_customs_rate: number | null
  purchase_amount_cny: number | null
  purchase_expense_cny: number
  gross_profit: number | null
  gross_profit_rate: number | null
  remarks: string
}

export const basicProfitReportApi = {
  getReport: async (params: BasicProfitReportParams) => {
    return instance.get<{ success: boolean; data: BasicProfitReportItem[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>('/basic-profit-report', { params })
  },
}
