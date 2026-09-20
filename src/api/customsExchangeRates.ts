import instance from '@/utils/request'
import type { CustomsExchangeRate } from '@/types'

// 获取海关汇率列表（分页）
export const getAllCustomsExchangeRates = (params?: {
  page?: number
  pageSize?: number
  source_currency?: string
  target_currency?: string
  effective_month?: string
}) => {
  return instance.get<{
    success: boolean
    data: CustomsExchangeRate[]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
    }
  }>('/customs-exchange-rates', { params })
}

// 获取单个海关汇率
export const getCustomsExchangeRateById = (id: string) => {
  return instance.get<{ success: boolean; data: CustomsExchangeRate }>(`/customs-exchange-rates/${id}`)
}

// 创建海关汇率
export const createCustomsExchangeRate = (data: Partial<CustomsExchangeRate>) => {
  return instance.post<{ success: boolean; data: CustomsExchangeRate }>('/customs-exchange-rates', data)
}

// 更新海关汇率
export const updateCustomsExchangeRate = (id: string, data: Partial<CustomsExchangeRate>) => {
  return instance.put<{ success: boolean; data: CustomsExchangeRate }>(`/customs-exchange-rates/${id}`, data)
}

// 删除海关汇率
export const deleteCustomsExchangeRate = (id: string) => {
  return instance.delete<{ success: boolean; message: string }>(`/customs-exchange-rates/${id}`)
}

// 查询当前月的海关汇率（给订单表单自动填充用）
export const getCurrentCustomsRate = (source_currency: string, target_currency: string) => {
  return instance.get<{ success: boolean; data: CustomsExchangeRate | null; message?: string }>(
    '/customs-exchange-rates/current',
    { params: { source_currency, target_currency } }
  )
}

// 获取某月的所有海关汇率
export const getMonthRates = (effective_month: string) => {
  return instance.get<{ success: boolean; data: CustomsExchangeRate[] }>(
    '/customs-exchange-rates/month',
    { params: { effective_month } }
  )
}
