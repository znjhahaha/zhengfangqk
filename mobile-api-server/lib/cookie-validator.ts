// Cookie验证和清理机制
import { apiCache, cacheKeys } from './api-cache'
import { useStudentStore } from './student-store'
import { useCourseStore } from './course-store'
import { userSessionManager } from './user-session'

export class CookieValidator {
  // 验证Cookie是否有效
  static async validateCookie(cookie: string): Promise<boolean> {
    if (!cookie || cookie.trim() === '') {
      return false
    }

    try {
      // 尝试获取学生信息来验证Cookie
      const response = await fetch('/api/student-info', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return false
      }

      const result = await response.json()
      return result.success && result.data
    } catch (error) {
      console.error('Cookie验证失败:', error)
      return false
    }
  }

  // 清理所有缓存数据
  static clearAllCache(): void {
    console.log('🧹 清理所有缓存数据...')
    
    // 清理API缓存
    apiCache.clear()
    
    // 清理学生信息
    const studentStore = useStudentStore.getState()
    studentStore.clearStudentInfo()
    
    // 清理课程数据
    const courseStore = useCourseStore.getState()
    courseStore.clearData()
    
    // 清理用户会话
    userSessionManager.loadFromLocalStorage()
    const sessions = userSessionManager.getAllSessions()
    sessions.forEach(session => {
      userSessionManager.deleteSession(session.id)
    })
    
    // 清理localStorage中的相关数据
    try {
      localStorage.removeItem('student-store')
      localStorage.removeItem('course-store')
      localStorage.removeItem('user_sessions')
      console.log('✅ 所有缓存数据已清理')
    } catch (error) {
      console.error('清理localStorage失败:', error)
    }
  }

  // 检查并清理无效数据
  static async checkAndCleanInvalidData(): Promise<void> {
    try {
      // 检查是否有Cookie配置
      const configResponse = await fetch('/api/config')
      if (!configResponse.ok) {
        this.clearAllCache()
        return
      }

      const config = await configResponse.json()
      if (!config.success || !config.data.has_cookie) {
        console.log('❌ 没有有效的Cookie配置，清理所有数据')
        this.clearAllCache()
        return
      }

      // 验证Cookie是否仍然有效
      const isValid = await this.validateCookie(config.data.cookie)
      if (!isValid) {
        console.log('❌ Cookie已失效，清理所有数据')
        this.clearAllCache()
        return
      }

      console.log('✅ Cookie验证通过，数据有效')
    } catch (error) {
      console.error('检查Cookie有效性失败:', error)
      this.clearAllCache()
    }
  }

  // 初始化时检查数据有效性
  static async initialize(): Promise<void> {
    console.log('🔍 初始化Cookie验证...')
    await this.checkAndCleanInvalidData()
  }
}

// 导出单例实例
export const cookieValidator = new CookieValidator()
