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
  // 出货信息
  delivery_date: string
  order_number: string
  sales_contract_number: string
  sales_person: string
  customer_name: string
  payment_method: string
  settlement_date: string
  classification: string

  // 商品信息
  product_name: string
  product_code: string
  model: string
  description: string
  unit: string
  delivery_quantity: number

  // 销售信息
  unit_price: number
  sales_amount_included: number
  unit_price_excluded: number
  sales_amount_excluded: number
  tax_rate: number

  // 结算信息
  settlement_status: string
  receivable_amount: number
  received_amount: number
  balance_amount: number
  last_write_off_date: string | null
  last_write_off_number: string
  write_off_count: number

  // 出库成本
  cost_unit_price_excluded: number
  cost_unit_price_included: number
  cost_amount_excluded: number
  cost_amount_included: number

  // 采购信息
  purchase_contract_number: string
  purchase_person: string
  warehousing_date: string
  warehousing_quantity: number
  warehousing_unit_price_excluded: number
  warehousing_unit_price_included: number
  warehousing_amount: number
  warehousing_amount_included: number

  // 采购费用
  po_expense_transportation: number
  po_expense_operating: number
  po_expense_vat: number
  po_expense_handling: number
  po_expense_other: number
  po_expense_total: number

  // 销售费用
  sl_expense_transportation: number
  sl_expense_handling: number
  sl_expense_other: number
  sl_expense_total: number

  // 入库费用
  wh_expense_tariff: number
  wh_expense_transportation: number
  wh_expense_customs: number
  wh_expense_other: number
  wh_expense_total: number

  // 出库费用
  dl_expense_express: number
  dl_expense_transportation: number
  dl_expense_customs: number
  dl_expense_other: number
  dl_expense_total: number

  // 费用合计和利润
  total_expense: number
  total_cost: number
  gross_profit: number
  gross_profit_rate: number

  // 汇率信息
  currency: string
  bank_rate: number
  customs_rate: number
  sales_amount_included_cny_bank: number
  sales_amount_excluded_cny_bank: number
  sales_amount_included_cny_customs: number
  sales_amount_excluded_cny_customs: number
  exchange_diff_included: number
  exchange_diff_excluded: number

  // 其他
  commission_rate: number | null
  commission_amount: number | null
  remarks: string
}

export const profitReportApi = {
  getReport: async (params: ProfitReportParams) => {
    return instance.get<{ success: boolean; data: ProfitReportItem[]; pagination: { total: number; page: number; pageSize: number; totalPages: number } }>('/profit-report', { params })
  },
}