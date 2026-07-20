import type { Directive } from 'vue'

// 扩展 HTMLElement 类型
declare global {
  interface HTMLElement {
    _scrollTopbarObserver?: ResizeObserver
    _scrollTopbarHandler?: () => void
    _scrollContentHandler?: () => void
  }
}

/**
 * 自定义指令：将表格的水平滚动条移动到顶部
 * 使用方式：v-scroll-topbar
 */
export const scrollTopbar: Directive = {
  mounted(el) {
    // 延迟执行，确保表格已完全渲染
    setTimeout(() => moveScrollbarToTop(el), 200)
    // 再次延迟执行，确保所有内容都已加载
    setTimeout(() => moveScrollbarToTop(el), 500)
  },
  updated(el) {
    // 更新时重新计算滚动条宽度
    setTimeout(() => {
      const tableContent = el.querySelector('.ant-table-content') as HTMLElement
      const scrollbarContainer = el.querySelector('.top-scrollbar-container') as HTMLElement
      if (tableContent && scrollbarContainer) {
        updateScrollbarWidth(tableContent, scrollbarContainer)
      }
    }, 100)
  },
  beforeUnmount(el) {
    // 清理 observer
    if (el._scrollTopbarObserver) {
      el._scrollTopbarObserver.disconnect()
      delete el._scrollTopbarObserver
    }

    // 移除事件监听器
    const tableContent = el.querySelector('.ant-table-content') as HTMLElement
    const scrollbarContainer = el.querySelector('.top-scrollbar-container') as HTMLElement

    if (tableContent && el._scrollContentHandler) {
      tableContent.removeEventListener('scroll', el._scrollContentHandler)
    }

    if (scrollbarContainer && el._scrollTopbarHandler) {
      scrollbarContainer.removeEventListener('scroll', el._scrollTopbarHandler)
    }

    // 恢复原始滚动条
    if (tableContent) {
      tableContent.style.overflowX = 'auto'
    }

    // 移除顶部滚动条
    if (scrollbarContainer) {
      scrollbarContainer.remove()
    }
  },
}

function moveScrollbarToTop(el: HTMLElement) {
  // 查找表格的内容容器 - 尝试多种选择器
  let tableContent = el.querySelector('.ant-table-content') as HTMLElement
  if (!tableContent) {
    // 尝试其他选择器
    tableContent = el.querySelector('.ant-table-body') as HTMLElement
  }
  if (!tableContent) {
    // 尝试更通用的选择器
    tableContent = el.querySelector('[class*="table-content"]') as HTMLElement
  }
  if (!tableContent) {
    console.warn('未找到表格内容容器')
    return
  }

  // 检查是否已经有滚动条容器
  const existingScrollbar = el.querySelector('.top-scrollbar-container') as HTMLElement
  if (existingScrollbar) {
    // 更新滚动条宽度
    updateScrollbarWidth(tableContent, existingScrollbar)
    return
  }

  // 创建顶部滚动条容器
  const scrollbarContainer = document.createElement('div')
  scrollbarContainer.className = 'top-scrollbar-container'
  scrollbarContainer.style.cssText = `
    overflow-x: auto;
    overflow-y: hidden;
    height: 10px;
    margin-bottom: 8px;
    background: #f0f0f0;
    border-radius: 5px;
    cursor: pointer;
  `

  // 创建内部的滚动条宽度占位元素
  const scrollbarInner = document.createElement('div')
  scrollbarInner.className = 'top-scrollbar-inner'
  scrollbarInner.style.cssText = `
    height: 1px;
    min-width: 100%;
  `
  scrollbarContainer.appendChild(scrollbarInner)

  // 在表格内容前插入滚动条
  tableContent.parentNode?.insertBefore(scrollbarContainer, tableContent)

  // 隐藏原始的底部滚动条
  tableContent.style.overflowX = 'hidden'
  tableContent.style.scrollbarWidth = 'none'

  // 同步滚动位置
  const scrollbarHandler = () => {
    tableContent.scrollLeft = scrollbarContainer.scrollLeft
  }
  const contentHandler = () => {
    scrollbarContainer.scrollLeft = tableContent.scrollLeft
  }

  scrollbarContainer.addEventListener('scroll', scrollbarHandler)
  tableContent.addEventListener('scroll', contentHandler)

  // 存储 handler 以便清理
  el._scrollTopbarHandler = scrollbarHandler
  el._scrollContentHandler = contentHandler

  // 更新滚动条宽度
  updateScrollbarWidth(tableContent, scrollbarContainer)

  // 监听窗口大小变化
  const resizeObserver = new ResizeObserver(() => {
    updateScrollbarWidth(tableContent, scrollbarContainer)
  })
  resizeObserver.observe(tableContent)

  // 存储 observer 以便清理
  el._scrollTopbarObserver = resizeObserver
}

function updateScrollbarWidth(tableContent: HTMLElement, scrollbarContainer: HTMLElement) {
  const inner = scrollbarContainer.querySelector('.top-scrollbar-inner') as HTMLElement
  if (inner) {
    const scrollWidth = tableContent.scrollWidth || tableContent.offsetWidth
    inner.style.width = scrollWidth + 'px'
    inner.style.height = '1px'
  }
}
