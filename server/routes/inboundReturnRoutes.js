import { Router } from 'express'
import {
  getAllInboundReturns,
  getInboundReturnById,
  createInboundReturn,
  updateInboundReturn,
  deleteInboundReturn,
  getNewOrderNumber
} from '../controllers/inboundReturnController.js'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/new-order-number', getNewOrderNumber)
router.get('/', getAllInboundReturns)
router.get('/:id', getInboundReturnById)
router.post('/', createInboundReturn)
router.put('/:id', updateInboundReturn)
router.delete('/:id', advancedOrAdmin, deleteInboundReturn)

export default router
