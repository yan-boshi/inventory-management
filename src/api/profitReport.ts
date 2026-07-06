import instance from '@/utils/request'

export interface ProfitReportParams {
  startDate?: string
  endDate?: string
  contractNumber?: string
  customerName?: string
  productCode?: string
  page?: number
  pageSize?: number
}

export interface ProfitReportItem {
  delivery_date: string
  settlement_status: string
  settlement_date: string | null
  sales_contract_number: string
  sales_person: string
  customer_name: string
  payment_method: string
  classification: string
  product_name: string
  product_code: string
  model: string
  description: string
  unit: string
  delivery_quantity: number
  unit_price: number
  sales_amount_included: number
  unit_price_excluded: number
  sales_amount_excluded: number
  purchase_contract_number: string
  purchase_person: string
  warehousing_date: string
  warehousing_quantity: number
  warehousing_unit_price_excluded: number
  warehousing_amount: number
  po_expense_transportation: number
  po_expense_operating: number
  po_expense_vat: number
  po_expense_handling: number
  po_expense_other: number
  po_expense_total: number
  sl_expense_transportation: number
  sl_expense_handling: number
  sl_expense_other: number
  sl_expense_total: number
  wh_expense_tariff: number
  wh_expense_transportation: number
  wh_expense_customs: number
  wh_expense_other: number
  wh_expense_total: number
  dl_expense_express: number
  dl_expense_transportation: number
  dl_expense_customs: number
  dl_expense_other: number
  dl_expense_total: number
  gross_profit: number
  commission_rate: number | null
  commission_amount: number | null
  remarks: string
}

export const profitReportApi = {
  getReport: async (params: ProfitReportParams) => {
    return instance.get<{ success: boolean; data: ProfitReportItem[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>('/profit-report', { params })
  },
}
