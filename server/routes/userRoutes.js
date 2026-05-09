import express from 'express'
import { authMiddleware, adminOnly } from '../middleware/auth.js'
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword
} from '../controllers/userController.js'

const router = express.Router()

router.get('/', authMiddleware, adminOnly, getAllUsers)
router.get('/:id', authMiddleware, adminOnly, getUserById)
router.post('/', authMiddleware, adminOnly, createUser)
router.put('/:id', authMiddleware, adminOnly, updateUser)
router.delete('/:id', authMiddleware, adminOnly, deleteUser)
router.post('/:id/change-password', authMiddleware, changePassword)

export default router
