import User from '../models/User.js'

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, role, username } = req.query
    const where = []
    const params = []

    if (role) {
      where.push('role = ?')
      params.push(role)
    }

    if (username) {
      where.push('username LIKE ?')
      params.push(`%${username}%`)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await User.paginate({
      where: whereClause,
      orderBy: 'created_at DESC',
      page,
      pageSize,
      params
    })

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createUser = async (req, res) => {
  try {
    const { username, password, role, phone, email, remarks } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' })
    }

    const existingUser = await User.findByUsername(username)
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' })
    }

    const validRoles = ['admin', 'advanced', 'normal']
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' })
    }

    const user = await User.create({ username, password, role, phone, email, remarks })
    res.status(201).json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { username, password, role, phone, email, remarks } = req.body

    const existingUser = await User.findById(id)
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (username && username !== existingUser.username) {
      const duplicateUser = await User.findByUsername(username)
      if (duplicateUser) {
        return res.status(400).json({ success: false, message: 'Username already exists' })
      }
    }

    const validRoles = ['admin', 'advanced', 'normal']
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' })
    }

    const updateData = {}
    if (username !== undefined) updateData.username = username
    if (role !== undefined) updateData.role = role
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (remarks !== undefined) updateData.remarks = remarks

    let user
    if (password) {
      await User.updatePassword(id, password)
      user = await User.update(id, updateData)
    } else {
      user = await User.update(id, updateData)
    }

    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    const existingUser = await User.findById(id)
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (existingUser.username === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete admin user' })
    }

    await User.delete(id)
    res.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const changePassword = async (req, res) => {
  try {
    const { id } = req.params
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Old password and new password are required' })
    }

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const isValid = await User.verifyPassword(oldPassword, user.password)
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid old password' })
    }

    await User.updatePassword(id, newPassword)
    res.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
