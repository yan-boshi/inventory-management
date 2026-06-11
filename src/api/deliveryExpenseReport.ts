import instance from '@/utils/request'
import type { DeliveryExpenseReportItem, DeliveryExpenseReportParams } from '@/types'

export const deliveryExpenseReportApi = {
  getReport: async (params: DeliveryExpenseReportParams) => {
    const response = await instance.get<{ success: boolean; data: DeliveryExpenseReportItem[] }>('/delivery-expense-report', { params })
    return response.data
  },
}
