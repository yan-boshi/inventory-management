import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  createPackingList,
  updatePackingList,
  getPackingListById,
  getPackingListByPackingNo,
  getAllPackingLists,
  deletePackingList
} from '../controllers/packingListController.js'

const router = express.Router()

// 装箱单含客户隐私数据，全部接口必须鉴权（曾为全项目唯一无鉴权路由）
router.use(authMiddleware)

router.get('/', getAllPackingLists)
router.get('/:id', getPackingListById)
router.get('/by-packing-no/:packingNo', getPackingListByPackingNo)
router.post('/', createPackingList)
router.put('/:id', updatePackingList)
router.delete('/:id', advancedOrAdmin, deletePackingList)

export default router