import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllWarehousingOrders,
  getWarehousingOrderById,
  createWarehousingOrder,
  updateWarehousingOrder,
  deleteWarehousingOrder,
  getNewOrderNumber,
  getPurchaseOrdersForWarehousing
} from '../controllers/warehousingOrderController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllWarehousingOrders)
router.get('/new-order-number', authMiddleware, getNewOrderNumber)
router.get('/purchase-orders', authMiddleware, getPurchaseOrdersForWarehousing)
router.get('/:id', authMiddleware, getWarehousingOrderById)
router.post('/', authMiddleware, createWarehousingOrder)
router.put('/:id', authMiddleware, updateWarehousingOrder)
router.delete('/:id', authMiddleware, deleteWarehousingOrder)

export default router
