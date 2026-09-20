import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllCustomsExchangeRates,
  getCustomsExchangeRateById,
  createCustomsExchangeRate,
  updateCustomsExchangeRate,
  deleteCustomsExchangeRate,
  getCurrentCustomsRate,
  getMonthRates
} from '../controllers/customsExchangeRateController.js'

const router = express.Router()

// 查询当前月海关汇率（所有登录用户可用，给订单表单自动填充用）
router.get('/current', authMiddleware, getCurrentCustomsRate)

// 获取某月的所有海关汇率（所有登录用户可用）
router.get('/month', authMiddleware, getMonthRates)

// 以下需要高级用户或管理员权限
router.get('/', authMiddleware, advancedOrAdmin, getAllCustomsExchangeRates)
router.get('/:id', authMiddleware, advancedOrAdmin, getCustomsExchangeRateById)
router.post('/', authMiddleware, advancedOrAdmin, createCustomsExchangeRate)
router.put('/:id', authMiddleware, advancedOrAdmin, updateCustomsExchangeRate)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteCustomsExchangeRate)

export default router
