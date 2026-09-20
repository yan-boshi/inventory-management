import express from 'express'
import { authMiddleware, adminOnly } from '../middleware/auth.js'
import {
  getAllPayables,
  getPayableById,
  deletePayable,
  updatePayable
} from '../controllers/payableController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllPayables)
router.get('/:id', authMiddleware, getPayableById)
router.put('/:id', authMiddleware, updatePayable)
router.delete('/:id', authMiddleware, adminOnly, deletePayable)

export default router
