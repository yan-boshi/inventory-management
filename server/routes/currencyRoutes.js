import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllCurrencies,
  getActiveCurrencies,
  getCurrencyById,
  createCurrency,
  updateCurrency,
  deleteCurrency
} from '../controllers/currencyController.js'

const router = express.Router()

// 获取启用的币种列表（所有登录用户可用）
router.get('/active', authMiddleware, getActiveCurrencies)

// 以下需要高级用户或管理员权限
router.get('/', authMiddleware, advancedOrAdmin, getAllCurrencies)
router.get('/:id', authMiddleware, advancedOrAdmin, getCurrencyById)
router.post('/', authMiddleware, advancedOrAdmin, createCurrency)
router.put('/:id', authMiddleware, advancedOrAdmin, updateCurrency)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteCurrency)

export default router
