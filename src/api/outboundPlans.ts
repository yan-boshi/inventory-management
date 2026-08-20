import request from '@/utils/request'

export const outboundPlansApi = {
  getAll(params?: any) {
    return request.get('/outbound-plans', { params })
  },

  getById(id: string) {
    return request.get(`/outbound-plans/${id}`)
  },

  create(data: any) {
    return request.post('/outbound-plans', data)
  },

  update(id: string, data: any) {
    return request.put(`/outbound-plans/${id}`, data)
  },

  delete(id: string) {
    return request.delete(`/outbound-plans/${id}`)
  },

  getNewPlanNumber() {
    return request.get('/outbound-plans/new-plan-number')
  },
}
