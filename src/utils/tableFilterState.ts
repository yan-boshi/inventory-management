// antd 表格列筛选状态工具
//
// 背景：a-table 的表头列筛选（filters/onFilter）是表格内部的"视图过滤"，
// 不会改动 :data-source 绑定的数据数组。合计行如果直接对数据数组求和，
// 筛选后合计不会跟着变。本工具把筛选状态捕获下来，让合计行按与表格
// 一致的口径（列内选中值 OR、列间 AND）对数据先行过滤再求和。

export type ColumnFilterState = Record<string, unknown[] | undefined>

interface FilterColumn {
  key?: string
  dataIndex?: string
  onFilter?: (value: any, record: any) => boolean
}

// 与 antd 表格列筛选同口径的行过滤：列内选中值 OR、列间 AND；无 onFilter 的列不筛
export function applyColumnFilters<T>(rows: T[], columns: readonly FilterColumn[] | undefined, state: ColumnFilterState): T[] {
  const cols = columns || []
  return (rows || []).filter(row =>
    cols.every(col => {
      const key = col.key || col.dataIndex
      const selected = key ? state[key] : undefined
      if (!selected || selected.length === 0 || typeof col.onFilter !== 'function') return true
      return selected.some(v => col.onFilter!(v, row))
    })
  )
}

// 从 a-table @change 事件的 filters 参数同步筛选状态（空选 = undefined）
export function captureColumnFilterState(state: ColumnFilterState, filters: Record<string, unknown> | undefined): void {
  for (const key of Object.keys(filters || {})) {
    const v = (filters as any)[key]
    state[key] = Array.isArray(v) && v.length > 0 ? v : undefined
  }
}
