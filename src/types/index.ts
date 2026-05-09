export interface Customer {
  customer_id: string
  customer_name: string
  customer_code: string
  customer_tax_number: string
  register_address: string
  customer_phone: string
  customer_email: string
  bank_name: string
  bank_account: string
  bank_code: string
  contact: string
  contact_phone: string
  receiver: string
  receiver_address: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface CreateCustomerRequest {
  customer_name: string
  customer_code: string
  customer_tax_number?: string
  register_address?: string
  customer_phone?: string
  customer_email?: string
  bank_name?: string
  bank_account?: string
  bank_code?: string
  contact?: string
  contact_phone?: string
  receiver?: string
  receiver_address?: string
  remarks?: string
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {}

export interface CustomerQueryParams {
  page?: number
  pageSize?: number
  name?: string
  code?: string
}

export interface Supplier {
  supplier_id: string
  supplier_name: string
  supplier_code: string
  supplier_tax_number: string
  register_address: string
  supplier_phone: string
  supplier_email: string
  bank_name: string
  bank_account: string
  bank_code: string
  contact: string
  contact_phone: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface CreateSupplierRequest {
  supplier_name: string
  supplier_code: string
  supplier_tax_number?: string
  register_address?: string
  supplier_phone?: string
  supplier_email?: string
  bank_name?: string
  bank_account?: string
  bank_code?: string
  contact?: string
  contact_phone?: string
  remarks?: string
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {}

export interface SupplierQueryParams {
  page?: number
  pageSize?: number
  name?: string
  code?: string
}

export interface SupplierOption {
  supplier_id: string
  supplier_name: string
  supplier_code: string
}

export interface PaymentMethod {
  payment_method_id: string
  payment_method_name: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface CreatePaymentMethodRequest {
  payment_method_name: string
  remarks?: string
}

export interface UpdatePaymentMethodRequest extends Partial<CreatePaymentMethodRequest> {}

export interface PaymentMethodQueryParams {
  page?: number
  pageSize?: number
  name?: string
}

export interface Product {
  product_id: string
  product_name: string
  model?: string
  description?: string
  product_code: string
  unit?: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface CreateProductRequest {
  product_name: string
  model?: string
  description?: string
  product_code: string
  unit?: string
  remarks?: string
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface ProductQueryParams {
  page?: number
  pageSize?: number
  name?: string
  code?: string
}

export interface BusinessCategory {
  business_category_id: string
  business_category_name: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface CreateBusinessCategoryRequest {
  business_category_name: string
  remarks?: string
}

export interface UpdateBusinessCategoryRequest extends Partial<CreateBusinessCategoryRequest> {}

export interface BusinessCategoryQueryParams {
  page?: number
  pageSize?: number
  name?: string
}

export interface SalesOrderItem {
  no: number
  business_category: string
  product_name: string
  model?: string
  description?: string
  unit?: string
  quantity: number
  tax_rate: number
  tax_included_price: number
  tax_excluded_price: number
  tax_included_amount: number
  tax_excluded_amount: number
  tax_amount: number
  status?: number
  remarks?: string
  product_code?: string
}

export interface SalesOrder {
  sales_order_id: string
  order_number: string
  contract_number?: string
  customer_name: string
  customer_code: string
  payment_method: string
  sales_items: string
  sales_date: string
  status: 1 | 2
  tax_included_amount: number
  currency: string
  exchange_rate: number
  delivery_date?: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface CreateSalesOrderRequest {
  contract_number?: string
  customer_name: string
  customer_code: string
  payment_method: string
  sales_items: SalesOrderItem[]
  currency?: string
  exchange_rate?: number
  delivery_date?: string
  remarks?: string
}

export interface UpdateSalesOrderRequest extends Partial<CreateSalesOrderRequest> {}

export interface SalesOrderQueryParams {
  page?: number
  pageSize?: number
  orderNumber?: string
  customerName?: string
  customerCode?: string
  quotationNumber?: string
  salesDate?: string
  startDate?: string
  endDate?: string
}

export interface CustomerOption {
  customer_id: string
  customer_name: string
  customer_code: string
}

export interface ProductOption {
  product_id: string
  product_name: string
  product_code: string
  model?: string
  description?: string
  unit?: string
}

export interface PaymentMethodOption {
  payment_method_id: string
  payment_method_name: string
}

export interface BusinessCategoryOption {
  business_category_id: string
  business_category_name: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface PurchaseOrder {
  purchase_order_id: string
  order_number: string
  contract_number?: string
  supplier_name: string
  supplier_code: string
  register_address?: string
  contact?: string
  contact_phone?: string
  supplier_email?: string
  payment_method: string
  business_category: string
  product_name: string
  model?: string
  description?: string
  product_code: string
  unit?: string
  quantity: number
  tax_included_price: number
  tax_rate: number
  tax_excluded_price: number
  tax_included_amount: number
  tax_excluded_amount: number
  tax_amount: number
  currency: string
  exchange_rate: number
  delivery_date?: string
  arrival_date?: string
  remarks?: string
  is_returned: boolean
  created_at: string
  updated_at: string
}

export interface CreatePurchaseOrderRequest {
  contract_number?: string
  supplier_name: string
  supplier_code: string
  payment_method: string
  business_category: string
  product_name: string
  model?: string
  description?: string
  product_code: string
  unit?: string
  quantity: number
  tax_included_price: number
  tax_rate?: number
  tax_excluded_price?: number
  tax_included_amount?: number
  tax_excluded_amount?: number
  tax_amount?: number
  currency?: string
  exchange_rate?: number
  delivery_date?: string
  arrival_date?: string
  remarks?: string
}

export interface UpdatePurchaseOrderRequest extends Partial<CreatePurchaseOrderRequest> {}

export interface PurchaseOrderQueryParams {
  page?: number
  pageSize?: number
  supplierName?: string
  supplierCode?: string
  orderNumber?: string
  startDate?: string
  endDate?: string
}

export interface User {
  user_id: string
  username: string
  role: 'admin' | 'advanced' | 'normal'
  phone: string
  email: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  phone: string
  email: string
  remarks?: string
}

export interface UpdateUserRequest {
  username?: string
  password?: string
  role?: 'admin' | 'advanced' | 'normal'
  phone?: string
  email?: string
  remarks?: string
}

export interface CreateUserRequest {
  username: string
  password: string
  role: 'admin' | 'advanced' | 'normal'
  phone: string
  email: string
  remarks?: string
}

export interface UserQueryParams {
  page?: number
  pageSize?: number
  username?: string
  role?: string
}

export interface AuthResponse {
  user: {
    userId: string
    username: string
    role: string
    contact?: string
  }
  token: string
}

export type UserRole = 'admin' | 'advanced' | 'normal'

export interface QuotationItem {
  no: number
  product_name: string
  model?: string
  description?: string
  unit?: string
  quantity: number
  unit_price: number
  total_amount: number
  status: 1 | 2
  remarks?: string
}

export interface Quotation {
  quotation_id: string
  quotation_number: string
  customer_name: string
  customer_code: string
  quotation_items: string
  created_at: string
  status: 1 | 2 | 3 | 4
  remarks?: string
  validity_period?: string
  delivery_method?: string
  tax_rate?: number
  tax_included_amount: number
  currency: string
  updated_at: string
}

export interface CreateQuotationRequest {
  customer_name: string
  customer_code: string
  quotation_items: string
  validity_period?: string
  delivery_method?: string
  tax_rate?: number
  currency?: string
  remarks?: string
}

export interface UpdateQuotationRequest extends Partial<CreateQuotationRequest> {}

export interface QuotationQueryParams {
  page?: number
  pageSize?: number
  customerName?: string
  customerCode?: string
  quotationNumber?: string
  startDate?: string
  endDate?: string
}

export interface QuotationResponse {
  quotation_id: string
  quotation_number: string
  customer_name: string
  customer_code: string
  quotation_items: QuotationItem[]
  created_at: string
  status: 1 | 2 | 3 | 4
  remarks?: string
  validity_period?: string
  delivery_method?: string
  tax_rate?: number
  updated_at: string
}
