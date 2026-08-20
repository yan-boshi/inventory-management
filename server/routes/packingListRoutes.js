import express from 'express'
import {
  createPackingList,
  updatePackingList,
  getPackingListById,
  getPackingListByPackingNo,
  getAllPackingLists,
  deletePackingList
} from '../controllers/packingListController.js'

const router = express.Router()

router.get('/', getAllPackingLists)
router.get('/:id', getPackingListById)
router.get('/by-packing-no/:packingNo', getPackingListByPackingNo)
router.post('/', createPackingList)
router.put('/:id', updatePackingList)
router.delete('/:id', deletePackingList)

export default router