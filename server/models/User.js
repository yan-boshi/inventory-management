import BaseModel from './BaseModel.js'
import bcrypt from 'bcrypt'
import { generateUUID } from '../utils/uuid.js'

class User extends BaseModel {
  constructor() {
    super('users', 'user_id')
  }

  async findByUsername(username) {
    return this.findOne('username = ?', [username])
  }

  async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    const userId = generateUUID()
    const data = {
      user_id: userId,
      username: userData.username,
      password: hashedPassword,
      role: userData.role || 'normal',
      phone: userData.phone || null,
      email: userData.email || null,
      remarks: userData.remarks || null
    }
    return super.create(data)
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword)
  }

  async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    return this.update(userId, { password: hashedPassword })
  }
}

export default new User()
