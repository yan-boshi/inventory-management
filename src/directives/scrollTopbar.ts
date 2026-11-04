import type { Directive } from 'vue'

// 每个滚动容器的接管记录（支持一个指令范围内多张表格各配一根顶条）
interface ScrollbarEntry {
  target: HTMLElement
  bar: HTMLElement
  barHandler: () => void
  contentHandler: () => void
}

declare global {
  interface HTMLElement {
    _scrollTopbarObserver?: ResizeObserver
    _scrollTopbarEntries?: ScrollbarEntry[]
    _scrollTopbarTarget?: HTMLElement
    _scrollTopbarBar?: HTMLElement
    _scrollTopbarHandler?: () => void
    _scrollContentHandler?: () => void
  }
}

/**
 * 自定义指令：将表格的水平滚动条移动到顶部
 * 使用方式：v-scroll-topbar
 *
 * 实现要点（修复"双滚动条/常驻灰条/多表格只接管第一个"）：
 * 1. 对范围内每个真正横向滚动的容器各配一根顶部滚动条（幂等，绝不重复插条）；
 * 2. 原生横向滚动条用 .hide-native-scrollbar 类隐藏（CSS 兜底）；
 * 3. 顶部滚动条只在确实有横向溢出时显示，无溢出 display:none。
 */
export const scrollTopbar: Directive = {
  mounted(el) {
    // 延迟执行，确保表格已完全渲染（二次兜底覆盖晚到的异步数据）
    setTimeout(() => ensureScrollbars(el), 200)
    setTimeout(() => ensureScrollbars(el), 500)
  },
  updated(el) {
    setTimeout(() => {
      // 表格 DOM 被整体重建时旧条/旧目标已游离，清理后重建；否则增量补齐/同步
      const entries = el._scrollTopbarEntries || []
      const stale = entries.some((e: ScrollbarEntry) => !el.contains(e.target))
      if (stale) cleanupEntries(el)
      ensureScrollbars(el)
    }, 100)
  },
  beforeUnmount(el) {
    cleanupEntries(el)
    if (el._scrollTopbarObserver) {
      el._scrollTopbarObserver.disconnect()
      delete el._scrollTopbarObserver
    }
  },
}

// 为范围内每个横向溢出的容器建立顶部滚动条（已接管的跳过），并同步全部
function ensureScrollbars(el: HTMLElement) {
  const candidates = el.querySelectorAll<HTMLElement>(
    '.ant-table-content, .ant-table-body, [class*="table-content"]'
  )
  const entries = el._scrollTopbarEntries || (el._scrollTopbarEntries = [])

  for (const target of candidates) {
    if (target.scrollWidth <= target.clientWidth) continue
    if (entries.some(e => e.target === target)) continue
    entries.push(createEntry(target))
  }

  // 监听尺寸变化只挂一次
  if (!el._scrollTopbarObserver) {
    const observer = new ResizeObserver(() => syncEntries(el))
    observer.observe(el)
    el._scrollTopbarObserver = observer
  }

  syncEntries(el)
}

// 为单个滚动容器创建顶部滚动条并绑定双向同步
function createEntry(target: HTMLElement): ScrollbarEntry {
  const bar = document.createElement('div')
  bar.className = 'top-scrollbar-container'

  const inner = document.createElement('div')
  inner.className = 'top-scrollbar-inner'
  inner.style.cssText = 'height: 1px; min-width: 100%;'
  bar.appendChild(inner)

  target.parentNode?.insertBefore(bar, target)

  const barHandler = () => {
    target.scrollLeft = bar.scrollLeft
  }
  const contentHandler = () => {
    bar.scrollLeft = target.scrollLeft
  }
  bar.addEventListener('scroll', barHandler)
  target.addEventListener('scroll', contentHandler)

  return { target, bar, barHandler, contentHandler }
}

// 同步所有接管条的宽度与显隐；无横向溢出时隐藏并不再压制原生条
function syncEntries(el: HTMLElement) {
  for (const entry of el._scrollTopbarEntries || []) {
    const { target, bar } = entry
    const inner = bar.querySelector('.top-scrollbar-inner') as HTMLElement | null
    const hasOverflow = target.scrollWidth > target.clientWidth + 1

    if (inner) {
      inner.style.width = (target.scrollWidth || target.offsetWidth) + 'px'
      inner.style.height = '1px'
    }
    bar.style.display = hasOverflow ? '' : 'none'

    if (hasOverflow) {
      target.classList.add('hide-native-scrollbar')
      target.style.overflowX = 'hidden'
      target.style.scrollbarWidth = 'none'
    } else {
      target.classList.remove('hide-native-scrollbar')
      target.style.overflowX = ''
      target.style.scrollbarWidth = ''
    }
  }
}

// 清理全部接管（卸载或目标游离时）：解绑监听、还原样式、移除顶条
function cleanupEntries(el: HTMLElement) {
  for (const entry of el._scrollTopbarEntries || []) {
    entry.bar.removeEventListener('scroll', entry.barHandler)
    entry.target.removeEventListener('scroll', entry.contentHandler)
    entry.target.style.overflowX = ''
    entry.target.style.scrollbarWidth = ''
    entry.target.classList.remove('hide-native-scrollbar')
    entry.bar.remove()
  }
  delete el._scrollTopbarEntries
}
