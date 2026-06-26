export interface Expenses {
  transportationFee?: number
  entertainmentFee?: number
  giftFee?: number
  otherFee?: number
}

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

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> { }

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

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> { }

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

export interface UpdatePaymentMethodRequest extends Partial<CreatePaymentMethodRequest> { }

export interface PaymentMethodQueryParams {
  page?: number
  pageSize?: number
  name?: string
}

export interface ProductClassificationSelection {
  classification_name: string
  level1: string
  level2: string
}

export interface Product {
  product_id: string
  product_name: string
  model?: string
  description?: string
  product_code: string
  unit?: string
  stock?: number
  tax_included_price?: number
  tax_excluded_price?: number
  product_classification?: string
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
  stock?: number
  tax_included_price?: number
  tax_excluded_price?: number
  product_classification?: string
  remarks?: string
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> { }

export interface ProductQueryParams {
  page?: number
  pageSize?: number
  name?: string
  code?: string
}

export interface WarehousingExpenseReportParams {
  startDate?: string
  endDate?: string
  orderNumber?: string
  contractNumber?: string
  productKeyword?: string
}

export interface WarehousingExpenseReportItem {
  warehousing_order_id: string
  order_number: string
  warehousing_time: string
  contract_number: string
  currency: string
  remarks: string
  product_code: string
  product_name: string
  model: string
  unit: string
  quantity: number
  tax_included_price: number
  total_price: number
  express_delivery_fee: number
  transportation_fee: number
  customs_fee: number
  warehousing_other_fee: number
  warehousing_expense_subtotal: number
  purchase_transportation_fee: number
  purchase_entertainment_fee: number
  purchase_gift_fee: number
  purchase_other_fee: number
  purchase_expense_subtotal: number
  total_expenses: number
  warehousing_person: string
}

export interface DeliveryExpenseReportParams {
  startDate?: string
  endDate?: string
  orderNumber?: string
  contractNumber?: string
  productKeyword?: string
}

export interface DeliveryExpenseReportItem {
  delivery_order_id: string
  order_number: string
  delivery_time: string
  contract_number: string
  customer_name: string
  currency: string
  remarks: string
  product_code: string
  product_name: string
  specification: string
  unit: string
  quantity: number
  tax_included_price: number
  total_price: number
  express_delivery_fee: number
  transportation_fee: number
  customs_fee: number
  delivery_other_fee: number
  delivery_expense_subtotal: number
  sales_transportation_fee: number
  sales_entertainment_fee: number
  sales_gift_fee: number
  sales_other_fee: number
  sales_expense_subtotal: number
  total_expenses: number
  delivery_person: string
}

export interface InventoryReportItem {
  product_id: string
  product_name: string
  product_code: string
  model: string
  unit: string
  // 期初
  opening_stock: number
  opening_stock_included_price: number
  opening_stock_excluded_price: number
  opening_stock_included_amount: number
  opening_stock_excluded_amount: number
  // 本期入库
  inbound_quantity: number
  inbound_included_price: number
  inbound_excluded_price: number
  inbound_included_amount: number
  inbound_excluded_amount: number
  // 本期出库
  outbound_quantity: number
  outbound_included_price: number
  outbound_excluded_price: number
  outbound_included_amount: number
  outbound_excluded_amount: number
  // 结余
  closing_stock: number
  closing_stock_included_price: number
  closing_stock_excluded_price: number
  closing_stock_included_amount: number
  closing_stock_excluded_amount: number
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

export interface UpdateBusinessCategoryRequest extends Partial<CreateBusinessCategoryRequest> { }

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
  outbound_quantity: number
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
  status: 1 | 2 | 3 | 4
  tax_included_amount: number
  currency: string
  exchange_rate: number
  entry_date?: string
  remarks?: string
  expenses?: string
  sales_person?: string
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
  entry_date?: string
  remarks?: string
  expenses?: Expenses
  sales_person?: string
  tax_included_amount?: number
}

export interface UpdateSalesOrderRequest extends Partial<CreateSalesOrderRequest> { }

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
  stock?: number
}

export interface PaymentMethodOption {
  payment_method_id: string
  payment_method_name: string
}

export interface BusinessCategoryOption {
  business_category_id: string
  business_category_name: string
}

// 产品分类相关类型
export interface ClassificationTree {
  [level1Name: string]: {
    [level2Name: string]: string
  }
}

export interface ProductClassification {
  product_classification_id: string
  classification_name: string
  classification_data: ClassificationTree
  description?: string
  creator?: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface CreateProductClassificationRequest {
  classification_name: string
  classification_data?: ClassificationTree
  description?: string
  remarks?: string
}

export interface UpdateProductClassificationRequest {
  classification_name?: string
  classification_data?: ClassificationTree
  description?: string
  remarks?: string
}

export interface ProductClassificationQueryParams {
  page?: number
  pageSize?: number
  name?: string
}

export interface ProductClassificationOption {
  product_classification_id: string
  classification_name: string
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

export interface PurchaseItem {
  no: number
  business_category: string
  product_name: string
  product_code: string
  model?: string
  description?: string
  unit?: string
  quantity: number
  inbound_quantity: number
  tax_rate: number
  tax_included_price: number
  tax_excluded_price: number
  tax_included_amount: number
  tax_excluded_amount: number
  tax_amount: number
  status: number
  delivery_date?: string
  remarks?: string
  total_price?: number
}

export interface PurchaseOrder {
  purchase_order_id: string
  order_number: string
  contract_number?: string
  supplier_name: string
  supplier_code: string
  purchase_items: string
  currency: string
  exchange_rate: number
  entry_date?: string
  status: 1 | 2 | 3 | 4
  remarks?: string
  expenses?: string
  purchase_person?: string
  created_at: string
  updated_at: string
}

export interface CreatePurchaseOrderRequest {
  contract_number?: string
  supplier_name: string
  supplier_code: string
  purchase_items: PurchaseItem[]
  currency?: string
  exchange_rate?: number
  entry_date?: string
  remarks?: string
  expenses?: Expenses
  purchase_person?: string
}

export interface UpdatePurchaseOrderRequest extends Partial<CreatePurchaseOrderRequest> { }

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
    phone?: string
    email?: string
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
  entry_date?: string
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
  entry_date?: string
}

export interface UpdateQuotationRequest extends Partial<CreateQuotationRequest> { }

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

export interface WarehousingItem {
  no: number
  product_code: string
  product_name: string
  description?: string
  unit?: string
  quantity: number
  max_quantity?: number
  remarks?: string
  total_price?: number
  model?: string
  tax_rate?: number
  tax_included_price?: number
}

export interface WarehousingExpenses {
  expressDeliveryFee?: number
  transportationFee?: number
  customsFee?: number
  otherFee?: number
}

export interface WarehousingOrder {
  warehousing_order_id: string
  order_number: string
  contract_number?: string
  warehousing_items: string
  warehousing_time: string
  entry_date?: string
  tracking_number?: string
  customer_name?: string
  customer_address?: string
  total_amount: number
  currency: string
  warehousing_person?: string
  contact_phone?: string
  remarks?: string
  expenses?: string
  created_at: string
  updated_at: string
}

export interface CreateWarehousingOrderRequest {
  contract_number?: string
  warehousing_items?: WarehousingItem[]
  warehousing_time?: string
  entry_date?: string
  tracking_number?: string
  customer_name?: string
  customer_address?: string
  total_amount?: number
  currency?: string
  warehousing_person?: string
  contact_phone?: string
  remarks?: string
  expenses?: WarehousingExpenses
}

export interface UpdateWarehousingOrderRequest extends Partial<CreateWarehousingOrderRequest> { }

export interface WarehousingOrderQueryParams {
  page?: number
  pageSize?: number
  productName?: string
  productCode?: string
  orderNumber?: string
  warehousingDate?: string
}

export interface DeliveryExpenses {
  expressDeliveryFee?: number
  transportationFee?: number
  customsFee?: number
  otherFee?: number
}

export interface DeliveryItem {
  no: number
  product_code: string
  product_name: string
  model?: string
  specification: string
  unit: string
  quantity: number
  max_quantity?: number
  stock?: number
  tax_rate?: number
  tax_included_price?: number
  amount?: number
  remarks?: string
}

export interface DeliveryOrder {
  delivery_order_id: string
  order_number: string
  contract_number?: string
  customer_name: string
  customer_address: string
  delivery_items: string
  delivery_time: string
  delivery_date?: string
  entry_date?: string
  currency: string
  total_amount: number
  expenses?: string
  tracking_number?: string
  delivery_person: string
  contact_phone: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface CreateDeliveryOrderRequest {
  contract_number?: string
  customer_name: string
  customer_address: string
  delivery_items: DeliveryItem[] | string
  delivery_time?: string
  delivery_date?: string
  entry_date?: string
  currency?: string
  total_amount?: number
  tracking_number?: string
  delivery_person?: string
  contact_phone?: string
  remarks?: string
  expenses?: DeliveryExpenses
}

export interface UpdateDeliveryOrderRequest extends Partial<CreateDeliveryOrderRequest> { }

export interface DeliveryOrderQueryParams {
  page?: number
  pageSize?: number
  productName?: string
  productCode?: string
  orderNumber?: string
  deliveryDate?: string
}

export interface UndeliveredSalesOrder {
  sales_order_id: string
  order_number: string
  customer_name: string
  customer_address?: string
  sales_items: string
  currency: string
  tax_included_amount: number
  remarks?: string
}
