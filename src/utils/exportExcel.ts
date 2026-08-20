import * as XLSX from 'xlsx'
import { message } from 'ant-design-vue'

export interface ExportColumn {
  /** 数据字段名 */
  key: string
  /** Excel 表头标题 */
  title: string
  /** 自定义格式化 */
  formatter?: (value: any, record: any) => string | number
}

interface ExportToExcelOptions {
  /** 文件名（不含扩展名） */
  filename: string
  /** 列定义 */
  columns: ExportColumn[]
  /** 数据源 */
  data: any[]
  /** 工作表名称，默认 Sheet1 */
  sheetName?: string
}

/**
 * 格式化金额，保留4位小数
 */
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0.0000'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0.0000'
  return num.toFixed(4)
}

/**
 * 判断是否为金额字段（根据字段名）
 */
function isMoneyField(key: string): boolean {
  const moneyKeywords = [
    'price', 'amount', 'total', 'fee', 'cost', 'profit',
    '单价', '金额', '总价', '费用', '成本', '毛利'
  ]
  const lowerKey = key.toLowerCase()
  return moneyKeywords.some(keyword => lowerKey.includes(keyword))
}

/**
 * 将数据导出为 Excel 文件
 */
export function exportToExcel({ filename, columns, data, sheetName = 'Sheet1' }: ExportToExcelOptions) {
  if (!data || data.length === 0) {
    message.warning('没有可导出的数据')
    return
  }

  // 构建表头
  const headers = columns.map(col => col.title)

  // 构建数据行
  const rows = data.map(record =>
    columns.map(col => {
      if (col.formatter) {
        return col.formatter(record[col.key], record)
      }
      const val = record[col.key]
      if (val === null || val === undefined) return ''
      // 自动格式化金额字段
      if (typeof val === 'number' && isMoneyField(col.key)) {
        return formatMoney(val)
      }
      return val
    })
  )

  // 创建工作表
  const wsData = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 自动设置列宽
  ws['!cols'] = columns.map((col, i) => {
    let maxLen = col.title.length
    for (const row of rows) {
      const cell = row[i]
      const len = cell !== null && cell !== undefined ? String(cell).length : 0
      if (len > maxLen) maxLen = len
    }
    // 中文字符宽度约为英文的 2 倍
    return { wch: Math.min(maxLen + 4, 40) }
  })

  // 创建工作簿并写入
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
  message.success('导出成功')
}
