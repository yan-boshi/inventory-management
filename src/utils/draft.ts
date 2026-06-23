const DRAFT_PREFIX = 'draft_'

export interface DraftData {
  data: Record<string, any>
  timestamp: number
  summary: string
}

// 保存暂存
export function saveDraft(key: string, data: Record<string, any>, summary: string): void {
  const draft: DraftData = {
    data,
    timestamp: Date.now(),
    summary
  }
  localStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify(draft))
}

// 读取暂存
export function loadDraft(key: string): DraftData | null {
  const raw = localStorage.getItem(`${DRAFT_PREFIX}${key}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DraftData
  } catch {
    return null
  }
}

// 清除暂存
export function clearDraft(key: string): void {
  localStorage.removeItem(`${DRAFT_PREFIX}${key}`)
}

// 检查是否有暂存
export function hasDraft(key: string): boolean {
  return localStorage.getItem(`${DRAFT_PREFIX}${key}`) !== null
}

// 格式化暂存时间
export function formatDraftTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 2 * day) return '昨天'
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`

  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
