import BaseModel from './BaseModel.js'
import pool from '../config/database.js'

class SalesOrder extends BaseModel {
  constructor() {
    super('sales_orders', 'sales_order_id')
  }

  async generateOrderNumber() {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0')
    return `XSD-S-${dateStr}-${random}`
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  calculateTaxExcludedPrice(taxIncludedPrice, taxRate) {
    if (!taxIncludedPrice || !taxRate) return 0
    return parseFloat((taxIncludedPrice / (1 + taxRate)).toFixed(2))
  }

  calculateTaxIncludedAmount(quantity, taxIncludedPrice) {
    if (!quantity || !taxIncludedPrice) return 0
    return parseFloat((quantity * taxIncludedPrice).toFixed(2))
  }

  calculateTaxExcludedAmount(quantity, taxExcludedPrice) {
    if (!quantity || !taxExcludedPrice) return 0
    return parseFloat((quantity * taxExcludedPrice).toFixed(2))
  }

  calculateTaxAmount(taxIncludedAmount, taxRate) {
    if (!taxIncludedAmount || !taxRate) return 0
    return parseFloat((taxIncludedAmount * taxRate).toFixed(2))
  }

  async create(data) {
    const salesItems = data.sales_items || '[]'

    const orderData = {
      sales_order_id: this.generateUUID(),
      order_number: await this.generateOrderNumber(),
      contract_number: data.contract_number || null,
      customer_name: data.customer_name,
      customer_code: data.customer_code,
      payment_method: data.payment_method,
      sales_items: salesItems,
      sales_date: new Date().toISOString().slice(0, 10),
      status: 1,
      tax_included_amount: data.tax_included_amount || 0,
      currency: data.currency || 'CNY',
      exchange_rate: parseFloat(data.exchange_rate) || 1.0,
      delivery_date: data.delivery_date || null,
      remarks: data.remarks || null
    }
    return super.create(orderData)
  }

  async update(id, data) {
    let taxIncludedAmount = null

    if (data.sales_items !== undefined) {
      try {
        const items = typeof data.sales_items === 'string' ? JSON.parse(data.sales_items) : data.sales_items
        taxIncludedAmount = items.reduce((sum, item) => {
          return sum + (parseFloat(item.tax_included_amount) || 0)
        }, 0)
        data.tax_included_amount = parseFloat(taxIncludedAmount.toFixed(2)) || 0
      } catch (e) {
        console.error('Error parsing sales_items:', e)
      }
    }

    return super.update(id, data)
  }

  async getNewOrderNumber() {
    return await this.generateOrderNumber()
  }
}

export default new SalesOrder()
