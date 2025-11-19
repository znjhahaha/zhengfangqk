// 访问统计跟踪器

export interface VisitRecord {
  id: string
  timestamp: number
  sessionId: string
  userAgent?: string
  referrer?: string
}

export interface VisitStats {
  totalVisits: number
  uniqueVisitors: number
  todayVisits: number
  todayUnique: number
  weeklyVisits: number
  monthlyVisits: number
  visitsByDay: { date: string; count: number }[]
  visitsByHour: { hour: number; count: number }[]
}

const STORAGE_KEY_VISITS = 'admin-visit-records'
const STORAGE_KEY_VISITOR_IDS = 'admin-visitor-ids'
const MAX_RECORDS = 10000 // 最多保存10000条访问记录

// 获取或生成访客ID
function getVisitorId(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    let visitorId = sessionStorage.getItem('visitor-id')
    if (!visitorId) {
      visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('visitor-id', visitorId)
    }
    return visitorId
  } catch (error) {
    console.error('获取访客ID失败:', error)
    return `visitor-${Date.now()}`
  }
}

// 生成会话ID
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    let sessionId = sessionStorage.getItem('session-id')
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('session-id', sessionId)
    }
    return sessionId
  } catch (error) {
    return `session-${Date.now()}`
  }
}

// 记录访问
export function recordVisit(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const visits = getAllVisitRecords()
    const visitorId = getVisitorId()
    const sessionId = getSessionId()
    
    const newVisit: VisitRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      sessionId,
      userAgent: navigator.userAgent,
      referrer: document.referrer || undefined
    }

    visits.push(newVisit)
    
    // 只保留最新的MAX_RECORDS条
    if (visits.length > MAX_RECORDS) {
      visits.splice(0, visits.length - MAX_RECORDS)
    }

    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visits))
    
    // 记录唯一访客
    const visitorIds = getVisitorIds()
    if (!visitorIds.includes(visitorId)) {
      visitorIds.push(visitorId)
      localStorage.setItem(STORAGE_KEY_VISITOR_IDS, JSON.stringify(visitorIds))
    }
  } catch (error) {
    console.error('记录访问失败:', error)
  }
}

// 获取所有访问记录
export function getAllVisitRecords(): VisitRecord[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const recordsJson = localStorage.getItem(STORAGE_KEY_VISITS)
    if (recordsJson) {
      return JSON.parse(recordsJson)
    }
  } catch (error) {
    console.error('读取访问记录失败:', error)
  }

  return []
}

// 获取所有访客ID
function getVisitorIds(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const idsJson = localStorage.getItem(STORAGE_KEY_VISITOR_IDS)
    if (idsJson) {
      return JSON.parse(idsJson)
    }
  } catch (error) {
    console.error('读取访客ID失败:', error)
  }

  return []
}

// 获取访问统计
export function getVisitStats(): VisitStats {
  const visits = getAllVisitRecords()
  const visitorIds = getVisitorIds()
  
  const now = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const weekStart = now - 7 * 24 * 60 * 60 * 1000
  const monthStart = now - 30 * 24 * 60 * 60 * 1000

  const todayVisits = visits.filter(v => v.timestamp >= todayStart)
  const weeklyVisits = visits.filter(v => v.timestamp >= weekStart)
  const monthlyVisits = visits.filter(v => v.timestamp >= monthStart)

  // 获取今天的唯一访客
  const todaySessions = new Set(todayVisits.map(v => v.sessionId))
  
  // 按日期统计
  const visitsByDayMap = new Map<string, number>()
  visits.forEach(visit => {
    const date = new Date(visit.timestamp).toISOString().split('T')[0]
    visitsByDayMap.set(date, (visitsByDayMap.get(date) || 0) + 1)
  })
  
  const visitsByDay = Array.from(visitsByDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30) // 最近30天

  // 按小时统计（最近24小时）
  const last24Hours = visits.filter(v => v.timestamp >= now - 24 * 60 * 60 * 1000)
  const visitsByHourMap = new Map<number, number>()
  last24Hours.forEach(visit => {
    const hour = new Date(visit.timestamp).getHours()
    visitsByHourMap.set(hour, (visitsByHourMap.get(hour) || 0) + 1)
  })
  
  const visitsByHour = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: visitsByHourMap.get(i) || 0
  }))

  return {
    totalVisits: visits.length,
    uniqueVisitors: visitorIds.length,
    todayVisits: todayVisits.length,
    todayUnique: todaySessions.size,
    weeklyVisits: weeklyVisits.length,
    monthlyVisits: monthlyVisits.length,
    visitsByDay,
    visitsByHour
  }
}

// 清除访问记录
export function clearVisitRecords(): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(STORAGE_KEY_VISITS)
  localStorage.removeItem(STORAGE_KEY_VISITOR_IDS)
}

// 清除旧的访问记录（保留最近N天）
export function cleanOldVisitRecords(days: number = 90): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const visits = getAllVisitRecords()
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const filtered = visits.filter(v => v.timestamp >= cutoff)
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(filtered))
  } catch (error) {
    console.error('清理访问记录失败:', error)
  }
}
