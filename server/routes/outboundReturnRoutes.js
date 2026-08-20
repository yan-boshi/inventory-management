import { Router } from 'express'
import {
  getAllOutboundReturns,
  getOutboundReturnById,
  createOutboundReturn,
  updateOutboundReturn,
  deleteOutboundReturn,
  getNewOrderNumber
} from '../controllers/outboundReturnController.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

router.get('/new-order-number', getNewOrderNumber)
router.get('/', getAllOutboundReturns)
router.get('/:id', getOutboundReturnById)
router.post('/', createOutboundReturn)
router.put('/:id', updateOutboundReturn)
router.delete('/:id', deleteOutboundReturn)

export default router
