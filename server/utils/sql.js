// LIKE 模式转义：把用户输入里的 % _ \ 转义，防止通配符扩大匹配
export function escapeLike(input) {
  return String(input ?? '').replace(/[\\%_]/g, '\\$&')
}
