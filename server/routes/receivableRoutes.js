import express from 'express'
import { authMiddleware, adminOnly } from '../middleware/auth.js'
import {
  getAllReceivables,
  getReceivableById,
  deleteReceivable,
  updateReceivable
} from '../controllers/receivableController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllReceivables)
router.get('/:id', authMiddleware, getReceivableById)
router.put('/:id', authMiddleware, updateReceivable)
router.delete('/:id', authMiddleware, adminOnly, deleteReceivable)

export default router
