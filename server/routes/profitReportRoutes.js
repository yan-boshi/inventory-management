import express from 'express'
import { authMiddleware, adminOnly } from '../middleware/auth.js'
import { getProfitReport, updateSettlementDate, updateReceivedAmount } from '../controllers/profitReportController.js'

const router = express.Router()

router.get('/', authMiddleware, getProfitReport)
router.put('/settlement-date', authMiddleware, adminOnly, updateSettlementDate)
router.put('/received-amount', authMiddleware, adminOnly, updateReceivedAmount)

export default router
