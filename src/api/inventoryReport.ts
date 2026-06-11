import instance from '@/utils/request'
import type { InventoryReportItem } from '@/types'

export const inventoryReportApi = {
  getReport: async (params: { year: number; month?: number }) => {
    const response = await instance.get<{ success: boolean; data: InventoryReportItem[] }>('/inventory-report', { params })
    return response.data;
  },
}
