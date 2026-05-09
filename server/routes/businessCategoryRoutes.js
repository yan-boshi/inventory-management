import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllBusinessCategories,
  getBusinessCategoryById,
  createBusinessCategory,
  updateBusinessCategory,
  deleteBusinessCategory,
  getAllBusinessCategoriesList
} from '../controllers/businessCategoryController.js'

const router = express.Router()

router.get('/', authMiddleware, advancedOrAdmin, getAllBusinessCategories)
router.get('/list', authMiddleware, getAllBusinessCategoriesList)
router.get('/:id', authMiddleware, advancedOrAdmin, getBusinessCategoryById)
router.post('/', authMiddleware, advancedOrAdmin, createBusinessCategory)
router.put('/:id', authMiddleware, advancedOrAdmin, updateBusinessCategory)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteBusinessCategory)

export default router
