import BaseModel from './BaseModel.js'

class Quotation extends BaseModel {
  constructor() {
    super('quotations', 'quotation_id')
  }

  generateQuotationNumber() {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0')
    return `XSD-Q-${dateStr}-${random}`
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  async create(data) {
    const quotationItems = data.quotation_items || '[]'
    let taxIncludedAmount = 0

    try {
      const items = typeof quotationItems === 'string' ? JSON.parse(quotationItems) : quotationItems
      taxIncludedAmount = items.reduce((sum, item) => {
        return sum + (parseFloat(item.total_amount) || 0)
      }, 0)
    } catch (e) {
      console.error('Error parsing quotation_items:', e)
    }

    const orderData = {
      quotation_id: this.generateUUID(),
      quotation_number: this.generateQuotationNumber(),
      customer_name: data.customer_name,
      customer_code: data.customer_code,
      quotation_items: quotationItems,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 1,
      validity_period: data.validity_period || '自报价之日起10个工作日',
      delivery_method: data.delivery_method || '送货上门',
      tax_rate: data.tax_rate || 13,
      tax_included_amount: parseFloat(taxIncludedAmount.toFixed(2)) || 0,
      currency: data.currency || 'CNY',
      remarks: data.remarks || null
    }
    return super.create(orderData)
  }

  async update(id, data) {
    let taxIncludedAmount = null

    if (data.quotation_items !== undefined) {
      try {
        const items = typeof data.quotation_items === 'string' ? JSON.parse(data.quotation_items) : data.quotation_items
        taxIncludedAmount = items.reduce((sum, item) => {
          return sum + (parseFloat(item.total_amount) || 0)
        }, 0)
        data.tax_included_amount = parseFloat(taxIncludedAmount.toFixed(2)) || 0
      } catch (e) {
        console.error('Error parsing quotation_items:', e)
      }
    }

    return super.update(id, data)
  }
}

export default new Quotation()
