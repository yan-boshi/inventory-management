import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllProductClassifications,
  getAllProductClassificationsList,
  getProductClassificationById,
  createProductClassification,
  updateProductClassification,
  deleteProductClassification,
  addLevel1,
  updateLevel1,
  deleteLevel1,
  addLevel2,
  updateLevel2,
  deleteLevel2
} from '../controllers/productClassificationController.js'

const router = express.Router()

// 基础CRUD
router.get('/', authMiddleware, advancedOrAdmin, getAllProductClassifications)
router.get('/list', authMiddleware, getAllProductClassificationsList)
router.get('/:id', authMiddleware, advancedOrAdmin, getProductClassificationById)
router.post('/', authMiddleware, advancedOrAdmin, createProductClassification)
router.put('/:id', authMiddleware, advancedOrAdmin, updateProductClassification)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteProductClassification)

// 一级分类操作
router.post('/:id/level1', authMiddleware, advancedOrAdmin, addLevel1)
router.put('/:id/level1/:oldName', authMiddleware, advancedOrAdmin, updateLevel1)
router.delete('/:id/level1/:name', authMiddleware, advancedOrAdmin, deleteLevel1)

// 二级分类操作
router.post('/:id/level1/:level1Name/level2', authMiddleware, advancedOrAdmin, addLevel2)
router.put('/:id/level1/:level1Name/level2/:oldName', authMiddleware, advancedOrAdmin, updateLevel2)
router.delete('/:id/level1/:level1Name/level2/:name', authMiddleware, advancedOrAdmin, deleteLevel2)

export default router
