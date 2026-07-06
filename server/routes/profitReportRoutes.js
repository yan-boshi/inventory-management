import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getProfitReport } from '../controllers/profitReportController.js'

const router = express.Router()

router.get('/', authMiddleware, getProfitReport)

export default router
