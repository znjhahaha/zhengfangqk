// 后台管理 - 操作日志记录

export interface AdminLog {
  id: string
  timestamp: number
  type: 'info' | 'success' | 'warning' | 'error'
  action: string
  details?: string
  userId?: string
}

const STORAGE_KEY = 'admin-operation-logs'
const MAX_LOGS = 500 // 最多保存500条日志

// 获取所有日志
export function getAllLogs(): AdminLog[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const logsJson = localStorage.getItem(STORAGE_KEY)
    if (logsJson) {
      const logs: AdminLog[] = JSON.parse(logsJson)
      return logs.sort((a, b) => b.timestamp - a.timestamp) // 按时间倒序
    }
  } catch (error) {
    console.error('读取日志失败:', error)
  }

  return []
}

// 添加日志
export function addLog(type: AdminLog['type'], action: string, details?: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const logs = getAllLogs()
    const newLog: AdminLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      action,
      details
    }

    logs.unshift(newLog) // 添加到开头
    
    // 只保留最新的MAX_LOGS条
    if (logs.length > MAX_LOGS) {
      logs.splice(MAX_LOGS)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch (error) {
    console.error('保存日志失败:', error)
  }
}

// 清除所有日志
export function clearAllLogs(): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(STORAGE_KEY)
}

// 清除指定类型的日志
export function clearLogsByType(type: AdminLog['type']): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const logs = getAllLogs()
    const filtered = logs.filter(log => log.type !== type)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('清除日志失败:', error)
  }
}

// 获取日志统计
export function getLogStats() {
  const logs = getAllLogs()
  const stats = {
    total: logs.length,
    info: logs.filter(l => l.type === 'info').length,
    success: logs.filter(l => l.type === 'success').length,
    warning: logs.filter(l => l.type === 'warning').length,
    error: logs.filter(l => l.type === 'error').length
  }
  return stats
}

// 获取最近N天的日志
export function getRecentLogs(days: number = 7): AdminLog[] {
  const logs = getAllLogs()
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)
  return logs.filter(log => log.timestamp >= cutoff)
}
