import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getAllSuppliersList
} from '../controllers/supplierController.js'

const router = express.Router()

router.get('/', authMiddleware, advancedOrAdmin, getAllSuppliers)
router.get('/list', authMiddleware, getAllSuppliersList)
router.get('/:id', authMiddleware, advancedOrAdmin, getSupplierById)
router.post('/', authMiddleware, advancedOrAdmin, createSupplier)
router.put('/:id', authMiddleware, advancedOrAdmin, updateSupplier)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteSupplier)

export default router
