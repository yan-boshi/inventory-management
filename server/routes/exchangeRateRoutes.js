import express from 'express'
import { authMiddleware, advancedOrAdmin } from '../middleware/auth.js'
import {
  getAllExchangeRates,
  getExchangeRateById,
  createExchangeRate,
  updateExchangeRate,
  deleteExchangeRate,
  getCurrentRate,
  getWeekRates
} from '../controllers/exchangeRateController.js'

const router = express.Router()

// 查询当前周汇率（所有登录用户可用，给订单表单自动填充用）
router.get('/current', authMiddleware, getCurrentRate)

// 获取某周的所有汇率（所有登录用户可用）
router.get('/week', authMiddleware, getWeekRates)

// 以下需要高级用户或管理员权限
router.get('/', authMiddleware, advancedOrAdmin, getAllExchangeRates)
router.get('/:id', authMiddleware, advancedOrAdmin, getExchangeRateById)
router.post('/', authMiddleware, advancedOrAdmin, createExchangeRate)
router.put('/:id', authMiddleware, advancedOrAdmin, updateExchangeRate)
router.delete('/:id', authMiddleware, advancedOrAdmin, deleteExchangeRate)

export default router
