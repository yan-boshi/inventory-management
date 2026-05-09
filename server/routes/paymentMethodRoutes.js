import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getAllPaymentMethodsList
} from '../controllers/paymentMethodController.js'

const router = express.Router()

router.get('/', authMiddleware, advancedOrAdmin, getAllPaymentMethods)
router.get('/list', authMiddleware, getAllPaymentMethodsList)
router.get('/:id', authMiddleware, advancedOrAdmin, getPaymentMethodById)
router.post('/', authMiddleware, advancedOrAdmin, createPaymentMethod)
router.put('/:id', authMiddleware, advancedOrAdmin, updatePaymentMethod)
router.delete('/:id', authMiddleware, advancedOrAdmin, deletePaymentMethod)

export default router
