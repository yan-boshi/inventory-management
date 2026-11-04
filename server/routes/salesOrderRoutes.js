import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  getNewOrderNumber,
  getUndeliveredContractNumbers,
  getSalesItemsByContractNumber
} from '../controllers/salesOrderController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllSalesOrders)
router.get('/new-order-number', authMiddleware, getNewOrderNumber)
router.get('/undelivered-contracts', authMiddleware, getUndeliveredContractNumbers)
router.get('/by-contract/:contractNumber', authMiddleware, getSalesItemsByContractNumber)
router.get('/:id', authMiddleware, getSalesOrderById)
router.post('/', authMiddleware, createSalesOrder)
router.put('/:id', authMiddleware, updateSalesOrder)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteSalesOrder)

export default router
