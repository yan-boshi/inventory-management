import instance from '@/utils/request'
import type { WarehousingExpenseReportItem, WarehousingExpenseReportParams } from '@/types'

export const warehousingExpenseReportApi = {
  getReport: async (params: WarehousingExpenseReportParams) => {
    const response = await instance.get<{ success: boolean; data: WarehousingExpenseReportItem[] }>('/warehousing-expense-report', { params })
    return response.data
  },
}
