import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

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

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3003

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Inventory Management Server is running' })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/business-categories', businessCategoryRoutes)
app.use('/api/payment-methods', paymentMethodRoutes)
app.use('/api/products', productRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/sales-orders', salesOrderRoutes)
app.use('/api/purchase-orders', purchaseOrderRoutes)
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ success: false, message: 'Something went wrong!' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`API documentation available at http://localhost:${PORT}/api`)
})
