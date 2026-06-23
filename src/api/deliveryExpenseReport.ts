import instance from '@/utils/request'
import type { DeliveryExpenseReportItem, DeliveryExpenseReportParams } from '@/types'

export const deliveryExpenseReportApi = {
  getReport: async (params: DeliveryExpenseReportParams) => {
    return instance.get<{ success: boolean; data: DeliveryExpenseReportItem[] }>('/delivery-expense-report', { params })
  },
}
