/**
 * 数据库错误处理工具
 * 将 MySQL 错误转换为用户友好的中文错误信息
 */

// MySQL 错误码映射
const MYSQL_ERROR_MAP = {
  // 非空字段为空
  "Column .* cannot be null": "必填字段不能为空，请检查所有必填项是否已填写",
  "Field .* doesn't have a default value": "字段缺少默认值，请确保所有必填字段已填写",

  // 数据过长
  "Data too long for column": "输入的数据超出字段长度限制，请缩短内容",

  // 唯一约束冲突
  "Duplicate entry": "数据已存在，请勿重复添加",
  "Duplicate key": "数据已存在，请勿重复添加",

  // 外键约束
  "Cannot add or update a child row: a foreign key constraint fails": "关联数据不存在，请检查引用的数据是否正确",
  "Cannot delete or update a parent row: a foreign key constraint fails": "该数据被其他记录引用，无法删除",

  // 语法错误
  "You have an error in your SQL syntax": "数据格式错误，请检查输入内容",

  // 连接错误
  "Connection refused": "数据库连接失败，请稍后重试",
  "Lost connection to MySQL server": "数据库连接中断，请稍后重试",

  // 权限错误
  "Access denied": "数据库访问被拒绝，请联系管理员",

  // 表不存在
  "Table .* doesn't exist": "数据表不存在，请联系管理员",
  "Unknown table": "数据表不存在，请联系管理员",

  // 数据类型错误
  "Incorrect integer value": "请输入正确的整数",
  "Incorrect decimal value": "请输入正确的数字",
  "Incorrect date value": "请输入正确的日期格式",
  "Incorrect datetime value": "请输入正确的日期时间格式",
  "Out of range value": "数值超出允许范围",
  "Truncated incorrect": "数据格式不正确",
}

/**
 * 将 MySQL 错误转换为用户友好的中文错误信息
 * @param {Error} error - 原始错误对象
 * @param {string} defaultMessage - 默认错误信息
 * @returns {string} 中文错误信息
 */
export function translateDbError(error, defaultMessage = "操作失败，请稍后重试") {
  if (!error || !error.message) {
    return defaultMessage
  }

  const errorMessage = error.message

  // 匹配 MySQL 错误模式
  for (const [pattern, chineseMessage] of Object.entries(MYSQL_ERROR_MAP)) {
    const regex = new RegExp(pattern, "i")
    if (regex.test(errorMessage)) {
      return chineseMessage
    }
  }

  // 如果是 MySQL 错误但未匹配到已知模式，返回通用错误
  if (error.code && error.code.startsWith("ER_")) {
    return "数据操作失败，请检查输入数据是否正确"
  }

  return defaultMessage
}

/**
 * 统一的错误响应处理
 * @param {Error} error - 错误对象
 * {string} operation - 操作描述（如 "创建对账单"）
 * @param {number} statusCode - HTTP 状态码，默认 500
 * @returns {{ statusCode: number, message: string }}
 */
export function handleDbError(error, operation = "操作", statusCode = 500) {
  console.error(`${operation}失败:`, error)

  const message = translateDbError(error, `${operation}失败，请稍后重试`)

  return { statusCode, message }
}
