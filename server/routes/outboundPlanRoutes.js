import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getAllOutboundPlans,
  getOutboundPlanById,
  createOutboundPlan,
  updateOutboundPlan,
  deleteOutboundPlan,
  getNewPlanNumber,
} from '../controllers/outboundPlanController.js'

const router = express.Router()

router.get('/', authMiddleware, getAllOutboundPlans)
router.get('/new-plan-number', authMiddleware, getNewPlanNumber)
router.get('/:id', authMiddleware, getOutboundPlanById)
router.post('/', authMiddleware, createOutboundPlan)
router.put('/:id', authMiddleware, updateOutboundPlan)
router.delete('/:id', authMiddleware, deleteOutboundPlan)

export default router
