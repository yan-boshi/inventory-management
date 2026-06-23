import instance from '@/utils/request'
import type {
  ProductClassificationOption,
  PaginatedResponse,
  ProductClassification,
  CreateProductClassificationRequest,
  UpdateProductClassificationRequest,
  ClassificationTree
} from '@/types'

const API_BASE_URL = '/product-classifications'

export const productClassificationApi = {
  // 获取分类列表（分页）
  getAll: async (params = {}) => {
    return instance.get<PaginatedResponse<ProductClassification>>(`${API_BASE_URL}`, { params })
  },

  // 获取所有分类（下拉选择）
  getAllList: async () => {
    return instance.get<{ success: boolean; data: ProductClassificationOption[] }>(`${API_BASE_URL}/list`)
  },

  // 获取单个分类详情
  getById: async (id: string) => {
    return instance.get<{ success: boolean; data: ProductClassification }>(`${API_BASE_URL}/${id}`)
  },

  // 创建分类
  create: async (data: CreateProductClassificationRequest) => {
    return instance.post<ProductClassification>(`${API_BASE_URL}`, data)
  },

  // 更新分类
  update: async (id: string, data: UpdateProductClassificationRequest) => {
    return instance.put<ProductClassification>(`${API_BASE_URL}/${id}`, data)
  },

  // 删除分类
  delete: async (id: string) => {
    return instance.delete<{ message: string }>(`${API_BASE_URL}/${id}`)
  },

  // ==================== 一级分类操作 ====================

  // 新增一级分类
  addLevel1: async (id: string, name: string) => {
    return instance.post<{ success: boolean; data: ClassificationTree }>(`${API_BASE_URL}/${id}/level1`, { name })
  },

  // 编辑一级分类
  updateLevel1: async (id: string, oldName: string, newName: string) => {
    return instance.put<{ success: boolean; data: ClassificationTree }>(
      `${API_BASE_URL}/${id}/level1/${encodeURIComponent(oldName)}`,
      { new_name: newName }
    )
  },

  // 删除一级分类
  deleteLevel1: async (id: string, name: string) => {
    return instance.delete<{ success: boolean; data: ClassificationTree }>(
      `${API_BASE_URL}/${id}/level1/${encodeURIComponent(name)}`
    )
  },

  // ==================== 二级分类操作 ====================

  // 新增二级分类
  addLevel2: async (id: string, level1Name: string, name: string) => {
    return instance.post<{ success: boolean; data: ClassificationTree }>(
      `${API_BASE_URL}/${id}/level1/${encodeURIComponent(level1Name)}/level2`,
      { name }
    )
  },

  // 编辑二级分类
  updateLevel2: async (id: string, level1Name: string, oldName: string, newName: string) => {
    return instance.put<{ success: boolean; data: ClassificationTree }>(
      `${API_BASE_URL}/${id}/level1/${encodeURIComponent(level1Name)}/level2/${encodeURIComponent(oldName)}`,
      { new_name: newName }
    )
  },

  // 删除二级分类
  deleteLevel2: async (id: string, level1Name: string, name: string) => {
    return instance.delete<{ success: boolean; data: ClassificationTree }>(
      `${API_BASE_URL}/${id}/level1/${encodeURIComponent(level1Name)}/level2/${encodeURIComponent(name)}`
    )
  }
}
