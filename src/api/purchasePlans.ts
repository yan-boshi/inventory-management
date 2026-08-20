import request from '@/utils/request'

export const purchasePlansApi = {
  getAll(params?: any) {
    return request.get('/purchase-plans', { params })
  },

  getById(id: string) {
    return request.get(`/purchase-plans/${id}`)
  },

  create(data: any) {
    return request.post('/purchase-plans', data)
  },

  update(id: string, data: any) {
    return request.put(`/purchase-plans/${id}`, data)
  },

  delete(id: string) {
    return request.delete(`/purchase-plans/${id}`)
  },

  getNewPlanNumber() {
    return request.get('/purchase-plans/new-plan-number')
  },
}
