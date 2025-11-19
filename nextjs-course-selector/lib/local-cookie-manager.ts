// 本地Cookie管理器 - 实现真正的多设备独立使用
interface UserInfo {
  name: string
  studentId: string
  major: string
  grade: string
  college: string
}

class LocalCookieManager {
  private static COOKIE_KEY = 'course_selector_cookie'
  private static USER_INFO_KEY = 'course_selector_user_info'
  private static LAST_USED_KEY = 'course_selector_last_used'

  // 保存Cookie到本地存储
  static setCookie(cookie: string): void {
    try {
      localStorage.setItem(this.COOKIE_KEY, cookie)
      localStorage.setItem(this.LAST_USED_KEY, Date.now().toString())
      console.log('💾 Cookie已保存到本地存储')
    } catch (error) {
      console.error('保存Cookie失败:', error)
    }
  }

  // 从本地存储获取Cookie
  static getCookie(): string | null {
    try {
      const cookie = localStorage.getItem(this.COOKIE_KEY)
      if (cookie) {
        // 更新最后使用时间
        localStorage.setItem(this.LAST_USED_KEY, Date.now().toString())
      }
      return cookie
    } catch (error) {
      console.error('获取Cookie失败:', error)
      return null
    }
  }

  // 保存用户信息到本地存储
  static setUserInfo(userInfo: UserInfo): void {
    try {
      localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo))
      console.log('💾 用户信息已保存到本地存储')
    } catch (error) {
      console.error('保存用户信息失败:', error)
    }
  }

  // 从本地存储获取用户信息
  static getUserInfo(): UserInfo | null {
    try {
      const userInfo = localStorage.getItem(this.USER_INFO_KEY)
      return userInfo ? JSON.parse(userInfo) : null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  }

  // 清除所有本地存储的数据
  static clear(): void {
    try {
      localStorage.removeItem(this.COOKIE_KEY)
      localStorage.removeItem(this.USER_INFO_KEY)
      localStorage.removeItem(this.LAST_USED_KEY)
      console.log('🗑️ 本地Cookie和用户信息已清除')
    } catch (error) {
      console.error('清除本地数据失败:', error)
    }
  }

  // 检查Cookie是否存在
  static hasCookie(): boolean {
    const cookie = this.getCookie()
    return !!(cookie && cookie.trim().length > 0)
  }

  // 检查用户信息是否存在
  static hasUserInfo(): boolean {
    const userInfo = this.getUserInfo()
    return !!(userInfo && userInfo.name)
  }

  // 获取最后使用时间
  static getLastUsed(): number {
    try {
      const lastUsed = localStorage.getItem(this.LAST_USED_KEY)
      return lastUsed ? parseInt(lastUsed) : 0
    } catch (error) {
      return 0
    }
  }

  // 检查Cookie是否过期（超过24小时未使用）
  static isExpired(): boolean {
    const lastUsed = this.getLastUsed()
    if (!lastUsed) return true
    
    const now = Date.now()
    const twentyFourHours = 24 * 60 * 60 * 1000
    return (now - lastUsed) > twentyFourHours
  }

  // 创建设备唯一标识
  static getDeviceId(): string {
    const key = 'course_selector_device_id'
    try {
      let deviceId = localStorage.getItem(key)
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem(key, deviceId)
      }
      return deviceId
    } catch (error) {
      // 如果localStorage不可用，使用临时ID
      return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  // 获取设备信息
  static getDeviceInfo(): { id: string; name: string; lastUsed: number } {
    const id = this.getDeviceId()
    const lastUsed = this.getLastUsed()
    
    // 生成设备名称
    const userAgent = navigator.userAgent
    let deviceName = '未知设备'
    
    if (userAgent.includes('Mobile')) {
      deviceName = '移动设备'
    } else if (userAgent.includes('Tablet')) {
      deviceName = '平板设备'
    } else {
      deviceName = '桌面设备'
    }
    
    // 添加浏览器信息
    if (userAgent.includes('Chrome')) {
      deviceName += ' (Chrome)'
    } else if (userAgent.includes('Firefox')) {
      deviceName += ' (Firefox)'
    } else if (userAgent.includes('Safari')) {
      deviceName += ' (Safari)'
    } else if (userAgent.includes('Edge')) {
      deviceName += ' (Edge)'
    }

    return { id, name: deviceName, lastUsed }
  }
}

export default LocalCookieManager
