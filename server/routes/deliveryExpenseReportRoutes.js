import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getDeliveryExpenseReport } from '../controllers/deliveryExpenseReportController.js'

const router = express.Router()

router.get('/', authMiddleware, getDeliveryExpenseReport)

export default router
