import request from '@/utils/request'
import type { LoginRequest, RegisterRequest, AuthResponse, ApiResponse } from '@/types'

interface CurrentUser {
  userId: string
  username: string
  role: string
  phone?: string
  email?: string
  remarks?: string
}

export const login = (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
  return request.post('/auth/login', data)
}

export const register = (data: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
  return request.post('/auth/register', data)
}

export const getCurrentUser = (): Promise<ApiResponse<CurrentUser>> => {
  return request.get('/auth/me')
}

export const logout = (): Promise<ApiResponse<void>> => {
  return request.post('/auth/logout')
}
