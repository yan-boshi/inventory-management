import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getAllDeliveryOrders,
  getDeliveryOrderById,
  createDeliveryOrder,
  updateDeliveryOrder,
  deleteDeliveryOrder,
  getNewOrderNumber,
  getUndeliveredSalesOrders
} from '../controllers/deliveryOrderController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllDeliveryOrders)
router.get('/new-order-number', authMiddleware, getNewOrderNumber)
router.get('/undelivered-sales-orders', authMiddleware, getUndeliveredSalesOrders)
router.get('/:id', authMiddleware, getDeliveryOrderById)
router.post('/', authMiddleware, createDeliveryOrder)
router.put('/:id', authMiddleware, updateDeliveryOrder)
router.delete('/:id', authMiddleware, deleteDeliveryOrder)

export default router
