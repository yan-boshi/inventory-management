import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getSettlementList,
  getSettlementSummary,
  getSettlementById,
  createSettlement,
  updateSettlement,
  deleteSettlement,
  getUninvoicedRecords,
  getOrderItems
} from '../controllers/settlementController.js'

const router = express.Router()

router.get('/', authMiddleware, getSettlementList)
router.get('/summary', authMiddleware, getSettlementSummary)
router.get('/uninvoiced', authMiddleware, getUninvoicedRecords)
router.get('/order-items', authMiddleware, getOrderItems)
router.get('/:id', authMiddleware, getSettlementById)
router.post('/', authMiddleware, createSettlement)
router.put('/:id', authMiddleware, updateSettlement)
router.delete('/:id', authMiddleware, deleteSettlement)

export default router
