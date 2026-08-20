import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getAllPurchasePlans,
  getPurchasePlanById,
  createPurchasePlan,
  updatePurchasePlan,
  deletePurchasePlan,
  getNewPlanNumber,
} from '../controllers/purchasePlanController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllPurchasePlans)
router.get('/new-plan-number', authMiddleware, getNewPlanNumber)
router.get('/:id', authMiddleware, getPurchasePlanById)
router.post('/', authMiddleware, createPurchasePlan)
router.put('/:id', authMiddleware, updatePurchasePlan)
router.delete('/:id', authMiddleware, deletePurchasePlan)

export default router
