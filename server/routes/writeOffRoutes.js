import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getWriteOffList,
  getWriteOffSummary,
  getWriteOffById,
  getNextWriteOffNumber,
  getPendingRecords,
  createWriteOff,
  updateWriteOff,
  voidWriteOff
} from '../controllers/writeOffController.js'

const router = express.Router()

router.get('/', authMiddleware, getWriteOffList)
router.get('/summary', authMiddleware, getWriteOffSummary)
router.get('/next-number', authMiddleware, getNextWriteOffNumber)
router.get('/pending-records', authMiddleware, getPendingRecords)
router.get('/:id', authMiddleware, getWriteOffById)
router.post('/', authMiddleware, createWriteOff)
router.put('/:id', authMiddleware, updateWriteOff)
router.put('/:id/void', authMiddleware, voidWriteOff)

export default router
