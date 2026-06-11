import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getWarehousingExpenseReport } from '../controllers/warehousingExpenseReportController.js'

const router = express.Router()

router.get('/', authMiddleware, getWarehousingExpenseReport)

export default router
