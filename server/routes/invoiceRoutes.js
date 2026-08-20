import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getNewInvoiceNumber,
  getInvoicesBySalesOrder
} from '../controllers/invoiceController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllInvoices)
router.get('/new-invoice-number', authMiddleware, getNewInvoiceNumber)
router.get('/by-sales-order/:salesOrderId', authMiddleware, getInvoicesBySalesOrder)
router.get('/:id', authMiddleware, getInvoiceById)
router.post('/', authMiddleware, createInvoice)
router.put('/:id', authMiddleware, updateInvoice)
router.delete('/:id', authMiddleware, deleteInvoice)

export default router
