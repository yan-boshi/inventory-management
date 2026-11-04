import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getNewQuotationNumber
} from '../controllers/quotationController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllQuotations)
router.get('/new-quotation-number', authMiddleware, getNewQuotationNumber)
router.get('/:id', authMiddleware, getQuotationById)
router.post('/', authMiddleware, createQuotation)
router.put('/:id', authMiddleware, updateQuotation)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteQuotation)

export default router
