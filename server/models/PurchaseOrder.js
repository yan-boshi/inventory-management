import BaseModel from './BaseModel.js'

class PurchaseOrder extends BaseModel {
  constructor() {
    super('purchase_orders', 'purchase_order_id')
  }

  generateOrderNumber() {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `XSD-P${dateStr}-${random}`
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
    const taxExcludedPrice = this.calculateTaxExcludedPrice(data.tax_included_price, data.tax_rate)
    const taxIncludedAmount = this.calculateTaxIncludedAmount(data.quantity, data.tax_included_price)
    const taxExcludedAmount = this.calculateTaxExcludedAmount(data.quantity, taxExcludedPrice)
    const taxAmount = this.calculateTaxAmount(taxIncludedAmount, data.tax_rate)

    const orderData = {
      purchase_order_id: this.generateUUID(),
      order_number: this.generateOrderNumber(),
      contract_number: data.contract_number || null,
      supplier_name: data.supplier_name,
      supplier_code: data.supplier_code,
      payment_method: data.payment_method,
      business_category: data.business_category,
      product_name: data.product_name,
      model: data.model || null,
      description: data.description || null,
      product_code: data.product_code,
      unit: data.unit || null,
      quantity: data.quantity,
      tax_included_price: data.tax_included_price,
      tax_rate: data.tax_rate || 0.13,
      tax_excluded_price: taxExcludedPrice,
      tax_included_amount: taxIncludedAmount,
      tax_excluded_amount: taxExcludedAmount,
      tax_amount: taxAmount,
      currency: data.currency || 'CNY',
      exchange_rate: data.exchange_rate || 1.0,
      delivery_date: data.delivery_date || null,
      arrival_date: data.arrival_date || null,
      remarks: data.remarks || null,
      is_returned: data.is_returned || false
    }
    return super.create(orderData)
  }
}

export default new PurchaseOrder()
