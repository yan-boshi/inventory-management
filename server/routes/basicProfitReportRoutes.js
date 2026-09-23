import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getBasicProfitReport } from '../controllers/basicProfitReportController.js'

const router = express.Router()

router.get('/', authMiddleware, getBasicProfitReport)

export default router
