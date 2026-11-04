// 环境变量必须最先加载（ESM import 先于模块体执行，顺序即优先级）
import './loadEnv.js'
import express from 'express'
import cors from 'cors'

// Import routes
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import businessCategoryRoutes from './routes/businessCategoryRoutes.js'
import paymentMethodRoutes from './routes/paymentMethodRoutes.js'
import productRoutes from './routes/productRoutes.js'
import customerRoutes from './routes/customerRoutes.js'
import supplierRoutes from './routes/supplierRoutes.js'
import salesOrderRoutes from './routes/salesOrderRoutes.js'
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js'
import purchasePlanRoutes from './routes/purchasePlanRoutes.js'
import inboundPlanRoutes from './routes/inboundPlanRoutes.js'
import outboundPlanRoutes from './routes/outboundPlanRoutes.js'
import quotationRoutes from './routes/quotationRoutes.js'
import warehousingOrderRoutes from './routes/warehousingOrderRoutes.js'
import deliveryOrderRoutes from './routes/deliveryOrderRoutes.js'
import inventoryReportRoutes from './routes/inventoryReportRoutes.js'
import warehousingExpenseReportRoutes from './routes/warehousingExpenseReportRoutes.js'
import deliveryExpenseReportRoutes from './routes/deliveryExpenseReportRoutes.js'
import productClassificationRoutes from './routes/productClassificationRoutes.js'
import profitReportRoutes from './routes/profitReportRoutes.js'
import receivableRoutes from './routes/receivableRoutes.js'
import payableRoutes from './routes/payableRoutes.js'
import settlementRoutes from './routes/settlementRoutes.js'
import inboundReturnRoutes from './routes/inboundReturnRoutes.js'
import outboundReturnRoutes from './routes/outboundReturnRoutes.js'
import packingListRoutes from './routes/packingListRoutes.js'
import invoiceRoutes from './routes/invoiceRoutes.js'
import currencyRoutes from './routes/currencyRoutes.js'
import exchangeRateRoutes from './routes/exchangeRateRoutes.js'
import customsExchangeRateRoutes from './routes/customsExchangeRateRoutes.js'
import writeOffRoutes from './routes/writeOffRoutes.js'
import basicProfitReportRoutes from './routes/basicProfitReportRoutes.js'
import authRateLimit from './middleware/rateLimit.js'

// （环境变量已由 loadEnv.js 在 import 首位预加载）

const app = express()
const PORT = process.env.PORT || 3003

// 不暴露服务器框架指纹
app.disable('x-powered-by')

// 基础安全响应头（SPA 页面由前端主机服务时，那边也应配置同款）
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  next()
})

// CORS 白名单：只放行前端来源（ALLOWED_ORIGINS 逗号分隔可配，生产务必改成实际域名）
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // 无 Origin（同源/curl/非浏览器）放行；跨域来源必须在白名单内
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(null, false)
  },
  credentials: false
}))

// 请求体大小限制（防超大 body 消耗内存）
app.use(express.json({ limit: '2mb' }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Inventory Management Server is running' })
})

// API Routes
// 登录/注册限流（防暴力破解与批量注册）
app.use('/api/auth', authRateLimit, authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/business-categories', businessCategoryRoutes)
app.use('/api/payment-methods', paymentMethodRoutes)
app.use('/api/products', productRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/sales-orders', salesOrderRoutes)
app.use('/api/purchase-orders', purchaseOrderRoutes)
app.use('/api/purchase-plans', purchasePlanRoutes)
app.use('/api/inbound-plans', inboundPlanRoutes)
app.use('/api/outbound-plans', outboundPlanRoutes)
app.use('/api/quotations', quotationRoutes)
app.use('/api/warehousing-orders', warehousingOrderRoutes)
app.use('/api/delivery-orders', deliveryOrderRoutes)
app.use('/api/inventory-report', inventoryReportRoutes)
app.use('/api/warehousing-expense-report', warehousingExpenseReportRoutes)
app.use('/api/delivery-expense-report', deliveryExpenseReportRoutes)
app.use('/api/product-classifications', productClassificationRoutes)
app.use('/api/profit-report', profitReportRoutes)
app.use('/api/receivables', receivableRoutes)
app.use('/api/payables', payableRoutes)
app.use('/api/settlement', settlementRoutes)
app.use('/api/inbound-returns', inboundReturnRoutes)
app.use('/api/outbound-returns', outboundReturnRoutes)
app.use('/api/packing-lists', packingListRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/currencies', currencyRoutes)
app.use('/api/exchange-rates', exchangeRateRoutes)
app.use('/api/customs-exchange-rates', customsExchangeRateRoutes)
app.use('/api/write-off', writeOffRoutes)
app.use('/api/basic-profit-report', basicProfitReportRoutes)

// Error handling middleware
// 客户端错误（4xx，如 JSON 解析失败）保留原状态码，不一律伪装成 500；不向客户端泄露堆栈
app.use((err, req, res, next) => {
  console.error(err.stack)
  const status = err.status || err.statusCode || 500
  const message = status < 500 ? (err.message || '请求参数错误') : 'Something went wrong!'
  res.status(status).json({ success: false, message })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`API documentation available at http://localhost:${PORT}/api`)
})
