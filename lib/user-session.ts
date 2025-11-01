// 用户会话管理系统 - 支持多用户同时使用
import { courseAPI } from './api'

export interface UserSession {
  id: string
  cookie: string
  studentInfo?: {
    name: string
    studentId: string
    major: string
    grade: string
    college: string
  }
  lastActive: number
  isActive: boolean
}

class UserSessionManager {
  private sessions: Map<string, UserSession> = new Map()
  private currentSessionId: string | null = null

  // 生成唯一会话ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 创建新会话
  createSession(cookie: string): string {
    const sessionId = this.generateSessionId()
    const session: UserSession = {
      id: sessionId,
      cookie,
      lastActive: Date.now(),
      isActive: true
    }
    
    this.sessions.set(sessionId, session)
    this.currentSessionId = sessionId
    
    // 保存到localStorage
    this.saveToLocalStorage()
    
    console.log('🆕 创建新用户会话:', sessionId)
    return sessionId
  }

  // 获取当前会话
  getCurrentSession(): UserSession | null {
    if (!this.currentSessionId) {
      return null
    }
    return this.sessions.get(this.currentSessionId) || null
  }

  // 获取当前会话的Cookie
  getCurrentCookie(): string {
    const session = this.getCurrentSession()
    return session?.cookie || ''
  }

  // 设置当前会话
  setCurrentSession(sessionId: string): boolean {
    if (this.sessions.has(sessionId)) {
      this.currentSessionId = sessionId
      const session = this.sessions.get(sessionId)!
      session.lastActive = Date.now()
      session.isActive = true
      this.saveToLocalStorage()
      console.log('🔄 切换到会话:', sessionId)
      return true
    }
    return false
  }

  // 更新会话的学生信息
  updateStudentInfo(sessionId: string, studentInfo: UserSession['studentInfo']): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.studentInfo = studentInfo
      session.lastActive = Date.now()
      this.saveToLocalStorage()
      console.log('👤 更新学生信息:', sessionId, studentInfo?.name)
    }
  }

  // 获取所有会话
  getAllSessions(): UserSession[] {
    return Array.from(this.sessions.values())
  }

  // 删除会话
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null
    }
    this.saveToLocalStorage()
    console.log('🗑️ 删除会话:', sessionId)
  }

  // 清理过期会话（超过24小时未活动）
  cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredSessions: string[] = []
    
    const entries = Array.from(this.sessions.entries())
    for (const [sessionId, session] of entries) {
      if (now - session.lastActive > 24 * 60 * 60 * 1000) { // 24小时
        expiredSessions.push(sessionId)
      }
    }
    
    expiredSessions.forEach(sessionId => {
      this.deleteSession(sessionId)
    })
    
    if (expiredSessions.length > 0) {
      console.log('🧹 清理过期会话:', expiredSessions.length)
    }
  }

  // 保存到localStorage
  private saveToLocalStorage(): void {
    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        currentSessionId: this.currentSessionId
      }
      localStorage.setItem('user_sessions', JSON.stringify(data))
    } catch (error) {
      console.error('保存会话到localStorage失败:', error)
    }
  }

  // 从localStorage加载
  loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('user_sessions')
      if (data) {
        const parsed = JSON.parse(data)
        this.sessions = new Map(parsed.sessions || [])
        this.currentSessionId = parsed.currentSessionId || null
        
        // 清理过期会话
        this.cleanupExpiredSessions()
        
        console.log('📂 从localStorage加载会话:', this.sessions.size)
      }
    } catch (error) {
      console.error('从localStorage加载会话失败:', error)
    }
  }

  // 验证Cookie有效性
  async validateCookie(cookie: string): Promise<{ valid: boolean; studentInfo?: any }> {
    try {
      // 临时设置Cookie进行验证
      const originalCookie = this.getCurrentCookie()
      const tempSessionId = this.createSession(cookie)
      
      // 尝试获取学生信息
      const { getCurrentSchool } = require('./global-school-state')
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.getStudentInfo(undefined, currentSchool.id) as any
      const result = {
        valid: response.success && response.data,
        studentInfo: response.data
      }
      
      // 如果验证失败，删除临时会话
      if (!result.valid) {
        this.deleteSession(tempSessionId)
        // 恢复原会话
        if (originalCookie) {
          this.createSession(originalCookie)
        }
      } else {
        // 验证成功，更新学生信息
        this.updateStudentInfo(tempSessionId, result.studentInfo)
      }
      
      return result
    } catch (error) {
      console.error('Cookie验证失败:', error)
      return { valid: false }
    }
  }
}

// 创建全局实例
export const userSessionManager = new UserSessionManager()

// 初始化时加载会话
if (typeof window !== 'undefined') {
  userSessionManager.loadFromLocalStorage()
}
