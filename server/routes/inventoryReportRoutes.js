import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getInventoryReport } from '../controllers/inventoryReportController.js'

const router = express.Router()

router.get('/', authMiddleware, getInventoryReport)

export default router
