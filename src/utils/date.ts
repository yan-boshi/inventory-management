import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * 能正确处理各种日期格式，包括：
 * - "2026-07-05T16:00:00.000Z" (ISO格式，UTC时间)
 * - "2026-07-05 10:00:00" (带时间的日期)
 * - "2026-07-05" (纯日期)
 * - Date对象
 * - 时间戳
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-'

  // 如果是字符串
  if (typeof date === 'string') {
    // 处理 ISO 格式 "2026-07-05T16:00:00.000Z" - 需要转换时区
    if (date.includes('T')) {
      // 使用 dayjs 解析并转换为中国时区
      const d = dayjs(date).tz('Asia/Shanghai')
      if (!d.isValid()) return '-'
      return d.format('YYYY-MM-DD')
    }
    // 处理 "2026-07-05 10:00:00" 格式
    if (date.includes(' ')) {
      return date.substring(0, 10)
    }
    // 如果已经是 "2026-07-05" 格式
    if (date.length === 10 && date.includes('-')) {
      return date
    }
  }

  // 使用 dayjs 处理其他情况
  const d = dayjs(date)
  if (!d.isValid()) return '-'
  return d.format('YYYY-MM-DD')
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm 格式
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-'

  // 如果是 ISO 格式字符串，需要转换时区
  if (typeof date === 'string' && date.includes('T')) {
    const d = dayjs(date).tz('Asia/Shanghai')
    if (!d.isValid()) return '-'
    return d.format('YYYY-MM-DD HH:mm')
  }

  const d = dayjs(date)
  if (!d.isValid()) return '-'
  return d.format('YYYY-MM-DD HH:mm')
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss 格式
 */
export const formatFullDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-'

  // 如果是 ISO 格式字符串，需要转换时区
  if (typeof date === 'string' && date.includes('T')) {
    const d = dayjs(date).tz('Asia/Shanghai')
    if (!d.isValid()) return '-'
    return d.format('YYYY-MM-DD HH:mm:ss')
  }

  const d = dayjs(date)
  if (!d.isValid()) return '-'
  return d.format('YYYY-MM-DD HH:mm:ss')
}
