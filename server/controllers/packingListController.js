import PackingList from '../models/PackingList.js'

export const createPackingList = async (req, res) => {
  try {
    const { packing_no } = req.body

    if (!packing_no) {
      return res.status(400).json({
        success: false,
        message: 'Packing No. is required'
      })
    }

    // Check if packing_no already exists
    const exists = await PackingList.existsByPackingNo(packing_no)
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'Packing No. already exists'
      })
    }

    const result = await PackingList.create(req.body)
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error creating packing list:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create packing list'
    })
  }
}

export const updatePackingList = async (req, res) => {
  try {
    const { id } = req.params
    const { packing_no } = req.body

    if (packing_no) {
      const exists = await PackingList.existsByPackingNo(packing_no, id)
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Packing No. already exists'
        })
      }
    }

    const result = await PackingList.update(id, req.body)
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error updating packing list:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update packing list'
    })
  }
}

export const getPackingListById = async (req, res) => {
  try {
    const { id } = req.params
    const result = await PackingList.findById(id)

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Packing list not found'
      })
    }

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error getting packing list:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get packing list'
    })
  }
}

export const getPackingListByPackingNo = async (req, res) => {
  try {
    const { packingNo } = req.params
    const result = await PackingList.findByPackingNo(packingNo)

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Packing list not found'
      })
    }

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error getting packing list:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get packing list'
    })
  }
}

export const getAllPackingLists = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, packingNo, buyerName, tradeTerms, startDate, endDate } = req.query

    const where = []
    const params = []

    if (packingNo) {
      where.push('packing_no LIKE ?')
      params.push(`%${packingNo}%`)
    }

    if (buyerName) {
      where.push('buyer_name LIKE ?')
      params.push(`%${buyerName}%`)
    }

    if (tradeTerms) {
      where.push('trade_terms LIKE ?')
      params.push(`%${tradeTerms}%`)
    }

    if (startDate && endDate) {
      where.push('packing_date BETWEEN ? AND ?')
      params.push(startDate, endDate)
    } else if (startDate) {
      where.push('packing_date >= ?')
      params.push(startDate)
    } else if (endDate) {
      where.push('packing_date <= ?')
      params.push(endDate)
    }

    const whereClause = where.length > 0 ? where.join(' AND ') : ''
    const result = await PackingList.paginate({
      where: whereClause,
      orderBy: 'created_at DESC',
      page,
      pageSize,
      params
    })

    res.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error getting packing lists:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get packing lists'
    })
  }
}

export const deletePackingList = async (req, res) => {
  try {
    const { id } = req.params
    await PackingList.delete(id)
    res.json({
      success: true,
      message: 'Packing list deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting packing list:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete packing list'
    })
  }
}