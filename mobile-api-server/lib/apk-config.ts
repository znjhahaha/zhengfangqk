/**
 * 检测是否为 APK 运行环境
 */
export function isApkEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  
  // 检测 Capacitor 环境
  if ((window as any).Capacitor) {
    return true
  }
  
  // 检测自定义环境变量
  if (process.env.NEXT_PUBLIC_IS_APK === 'true') {
    return true
  }
  
  // 检测 User-Agent（Capacitor 应用通常有特定的 User-Agent）
  const userAgent = navigator.userAgent || ''
  if (userAgent.includes('Capacitor') || userAgent.includes('Android')) {
    // 进一步检查是否在原生容器中（而不是浏览器）
    if (!userAgent.includes('Chrome') && !userAgent.includes('Firefox')) {
      return true
    }
  }
  
  return false
}

/**
 * 获取 API 基础 URL
 * 在 APK 环境中使用环境变量配置的 URL，否则使用相对路径
 */
export function getApiBaseUrl(): string {
  // 如果是 APK 环境，使用环境变量配置的 API 服务器地址
  if (isApkEnvironment()) {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_MOBILE_API_URL
    if (apiUrl) {
      return apiUrl.replace(/\/$/, '') // 移除末尾的斜杠
    }
  }
  
  // 默认使用相对路径（网页版）
  return '/api'
}

