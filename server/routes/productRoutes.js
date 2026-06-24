import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsList,
  searchProducts
} from '../controllers/productController.js'

const router = express.Router()

router.get('/', authMiddleware, advancedOrAdmin, getAllProducts)
router.get('/search', authMiddleware, advancedOrAdmin, searchProducts)
router.get('/list', authMiddleware, getAllProductsList)
router.get('/:id', authMiddleware, advancedOrAdmin, getProductById)
router.post('/', authMiddleware, advancedOrAdmin, createProduct)
router.put('/:id', authMiddleware, advancedOrAdmin, updateProduct)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteProduct)

export default router
