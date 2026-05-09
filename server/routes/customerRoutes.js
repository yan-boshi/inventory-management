import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAllCustomersList
} from '../controllers/customerController.js'

const router = express.Router()

router.get('/', authMiddleware, advancedOrAdmin, getAllCustomers)
router.get('/list', authMiddleware, getAllCustomersList)
router.get('/:id', authMiddleware, advancedOrAdmin, getCustomerById)
router.post('/', authMiddleware, advancedOrAdmin, createCustomer)
router.put('/:id', authMiddleware, advancedOrAdmin, updateCustomer)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteCustomer)

export default router
