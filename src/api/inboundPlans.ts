import request from '@/utils/request'

export const inboundPlansApi = {
  getAll(params?: any) {
    return request.get('/inbound-plans', { params })
  },

  getById(id: string) {
    return request.get(`/inbound-plans/${id}`)
  },

  create(data: any) {
    return request.post('/inbound-plans', data)
  },

  update(id: string, data: any) {
    return request.put(`/inbound-plans/${id}`, data)
  },

  delete(id: string) {
    return request.delete(`/inbound-plans/${id}`)
  },

  getNewPlanNumber() {
    return request.get('/inbound-plans/new-plan-number')
  },
}
