import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  returnPurchaseOrder,
  getNewOrderNumber
} from '../controllers/purchaseOrderController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllPurchaseOrders)
router.get('/new-order-number', authMiddleware, getNewOrderNumber)
router.get('/:id', authMiddleware, getPurchaseOrderById)
router.post('/', authMiddleware, createPurchaseOrder)
router.put('/:id', authMiddleware, updatePurchaseOrder)
router.delete('/:id', authMiddleware, deletePurchaseOrder)
router.post('/:id/return', authMiddleware, returnPurchaseOrder)

export default router
