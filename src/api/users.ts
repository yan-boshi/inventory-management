import request from '@/utils/request'
import type {
  ApiResponse,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserQueryParams
} from '@/types'

interface UsersListResponse {
  data: User[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export const getUsers = (params: UserQueryParams): Promise<ApiResponse<UsersListResponse>> => {
  return request.get('/users', { params })
}

export const getUserById = (id: string): Promise<ApiResponse<User>> => {
  return request.get(`/users/${id}`)
}

export const createUser = (data: CreateUserRequest): Promise<ApiResponse<User>> => {
  return request.post('/users', data)
}

export const updateUser = (id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> => {
  return request.put(`/users/${id}`, data)
}

export const deleteUser = (id: string): Promise<ApiResponse<void>> => {
  return request.delete(`/users/${id}`)
}
