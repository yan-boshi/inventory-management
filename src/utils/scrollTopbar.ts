/**
 * 全局表格滚动条置顶工具
 * 自动为所有带横向滚动的表格添加顶部滚动条
 */

// 存储已处理的表格
const processedTables = new WeakSet<HTMLElement>()

// 存储滚动条容器的引用
const scrollbarMap = new WeakMap<HTMLElement, {
  container: HTMLElement
  handler: () => void
  contentHandler: () => void
  observer: ResizeObserver
}>()

/**
 * 为单个表格添加顶部滚动条
 */
function addScrollbarToTable(tableContent: HTMLElement) {
  // 检查是否已处理
  if (processedTables.has(tableContent)) {
    // 只更新宽度
    const data = scrollbarMap.get(tableContent)
    if (data) {
      updateScrollbarWidth(tableContent, data.container)
    }
    return
  }

  // 标记为已处理
  processedTables.add(tableContent)

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

  // 更新滚动条宽度
  updateScrollbarWidth(tableContent, scrollbarContainer)

  // 监听窗口大小变化
  const resizeObserver = new ResizeObserver(() => {
    updateScrollbarWidth(tableContent, scrollbarContainer)
  })
  resizeObserver.observe(tableContent)

  // 存储引用
  scrollbarMap.set(tableContent, {
    container: scrollbarContainer,
    handler: scrollbarHandler,
    contentHandler: contentHandler,
    observer: resizeObserver
  })
}

/**
 * 更新滚动条宽度
 */
function updateScrollbarWidth(tableContent: HTMLElement, scrollbarContainer: HTMLElement) {
  const inner = scrollbarContainer.querySelector('.top-scrollbar-inner') as HTMLElement
  if (inner) {
    const scrollWidth = tableContent.scrollWidth || tableContent.offsetWidth
    inner.style.width = scrollWidth + 'px'
    inner.style.height = '1px'
  }
}

/**
 * 处理所有表格
 */
function processAllTables() {
  // 查找所有表格内容容器
  const tableContents = document.querySelectorAll(
    '.ant-table-content, .ant-table-body, [class*="table-content"]'
  )

  tableContents.forEach(el => {
    const element = el as HTMLElement
    // 检查是否有横向滚动
    if (element.scrollWidth > element.clientWidth) {
      addScrollbarToTable(element)
    }
  })
}

/**
 * 初始化全局滚动条置顶
 */
export function initGlobalScrollbarTop() {
  // 初始处理
  setTimeout(processAllTables, 300)

  // 监听 DOM 变化
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldProcess = true
      }
    })
    if (shouldProcess) {
      setTimeout(processAllTables, 100)
    }
  })

  // 观察整个文档
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    setTimeout(processAllTables, 100)
  })

  // 监听路由变化（通过监听 popstate）
  window.addEventListener('popstate', () => {
    setTimeout(processAllTables, 300)
  })

  // 返回清理函数
  return () => {
    observer.disconnect()
    window.removeEventListener('resize', processAllTables)
    window.removeEventListener('popstate', processAllTables)
  }
}
