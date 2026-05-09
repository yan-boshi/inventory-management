import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getAllSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  returnSalesOrder,
  getNewOrderNumber
} from '../controllers/salesOrderController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllSalesOrders)
router.get('/new-order-number', authMiddleware, getNewOrderNumber)
router.get('/:id', authMiddleware, getSalesOrderById)
router.post('/', authMiddleware, createSalesOrder)
router.put('/:id', authMiddleware, updateSalesOrder)
router.delete('/:id', authMiddleware, deleteSalesOrder)
router.post('/:id/return', authMiddleware, returnSalesOrder)

export default router
