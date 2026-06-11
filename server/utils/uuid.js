/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() if available, otherwise falls back to a custom implementation
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Validate and parse pagination parameters
 * @param {object} query - The query parameters object
 * @returns {{ page: number, pageSize: number }} Validated pagination params
 */
export function parsePagination(query) {
  let page = parseInt(query.page) || 1
  let pageSize = parseInt(query.pageSize) || 10

  // Ensure positive integers
  if (page < 1) page = 1
  if (pageSize < 1) pageSize = 10

  // Cap pageSize to prevent abuse
  if (pageSize > 1000) pageSize = 1000

  return { page, pageSize }
}

/**
 * Safely parse JSON string
 * @param {string} jsonString - The JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed value or default
 */
export function safeParseJSON(jsonString, defaultValue = null) {
  if (!jsonString) return defaultValue
  if (typeof jsonString !== 'string') return jsonString
  try {
    return JSON.parse(jsonString)
  } catch (e) {
    return defaultValue
  }
}
