import instance from '@/utils/request'
import type { ExchangeRate } from '@/types'

// 获取汇率列表（分页）
export const getAllExchangeRates = (params?: {
  page?: number
  pageSize?: number
  source_currency?: string
  target_currency?: string
  effective_week?: string
}) => {
  return instance.get<{
    success: boolean
    data: ExchangeRate[]
    pagination: {
      total: number
      page: number
      pageSize: number
      totalPages: number
    }
  }>('/exchange-rates', { params })
}

// 获取单个汇率
export const getExchangeRateById = (id: string) => {
  return instance.get<{ success: boolean; data: ExchangeRate }>(`/exchange-rates/${id}`)
}

// 创建汇率
export const createExchangeRate = (data: Partial<ExchangeRate>) => {
  return instance.post<{ success: boolean; data: ExchangeRate }>('/exchange-rates', data)
}

// 更新汇率
export const updateExchangeRate = (id: string, data: Partial<ExchangeRate>) => {
  return instance.put<{ success: boolean; data: ExchangeRate }>(`/exchange-rates/${id}`, data)
}

// 删除汇率
export const deleteExchangeRate = (id: string) => {
  return instance.delete<{ success: boolean; message: string }>(`/exchange-rates/${id}`)
}

// 查询当前周的汇率（给订单表单自动填充用）
export const getCurrentRate = (source_currency: string, target_currency: string) => {
  return instance.get<{ success: boolean; data: ExchangeRate | null; message?: string }>(
    '/exchange-rates/current',
    { params: { source_currency, target_currency } }
  )
}

// 获取某一周的所有汇率
export const getWeekRates = (effective_week: string) => {
  return instance.get<{ success: boolean; data: ExchangeRate[] }>(
    '/exchange-rates/week',
    { params: { effective_week } }
  )
}
