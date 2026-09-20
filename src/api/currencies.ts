import instance from '@/utils/request'
import type { Currency } from '@/types'

// 获取币种列表（分页）
export const getAllCurrencies = (params?: {
  page?: number
  pageSize?: number
  currency_code?: string
  currency_name?: string
  is_active?: number
}) => {
  return instance.get<{
    success: boolean
    data: Currency[]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
    }
  }>('/currencies', { params })
}

// 获取所有启用的币种（下拉用）
export const getActiveCurrencies = () => {
  return instance.get<{ success: boolean; data: Currency[] }>('/currencies/active')
}

// 获取单个币种
export const getCurrencyById = (id: string) => {
  return instance.get<{ success: boolean; data: Currency }>(`/currencies/${id}`)
}

// 创建币种
export const createCurrency = (data: Partial<Currency>) => {
  return instance.post<{ success: boolean; data: Currency }>('/currencies', data)
}

// 更新币种
export const updateCurrency = (id: string, data: Partial<Currency>) => {
  return instance.put<{ success: boolean; data: Currency }>(`/currencies/${id}`, data)
}

// 删除币种
export const deleteCurrency = (id: string) => {
  return instance.delete<{ success: boolean; message: string }>(`/currencies/${id}`)
}
