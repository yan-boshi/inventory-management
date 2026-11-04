import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllInboundPlans,
  getInboundPlanById,
  createInboundPlan,
  updateInboundPlan,
  deleteInboundPlan,
  getNewPlanNumber,
} from '../controllers/inboundPlanController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllInboundPlans)
router.get('/new-plan-number', authMiddleware, getNewPlanNumber)
router.get('/:id', authMiddleware, getInboundPlanById)
router.post('/', authMiddleware, createInboundPlan)
router.put('/:id', authMiddleware, updateInboundPlan)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteInboundPlan)

export default router
