import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserRole } from '@/types'

interface UserState {
  userId: string
  username: string
  role: UserRole
  phone: string
  email: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<UserState | null>(null)
  const token = ref<string | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isAdvanced = computed(() => user.value?.role === 'advanced' || user.value?.role === 'admin')

  function setUser(userData: UserState, authToken: string) {
    user.value = userData
    token.value = authToken
    console.log('setUser:', userData, authToken)
    localStorage.setItem('token', authToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function clearUser() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function loadFromStorage() {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
    }
  }

  function hasPermission(requiredRole: UserRole): boolean {
    if (!user.value) return false
    if (requiredRole === 'admin') return user.value.role === 'admin'
    if (requiredRole === 'advanced')
      return user.value.role === 'advanced' || user.value.role === 'admin'
    return true
  }

  loadFromStorage()

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    isAdvanced,
    setUser,
    clearUser,
    hasPermission,
    loadFromStorage
  }
})
