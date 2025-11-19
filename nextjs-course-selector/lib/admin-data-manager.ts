// 后台管理 - 数据管理工具

export interface StorageInfo {
  key: string
  size: number
  value: string
}

// Cookie相关的key（隐私数据，不显示）
const PRIVATE_KEYS = [
  'course_selector_cookie',
  'cookie_expiry_time',
  '_webvpn_key',
  'JSESSIONID',
  'route',
  'webvpn_username'
]

// 检查是否是隐私数据
function isPrivateKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return PRIVATE_KEYS.some(privateKey => 
    lowerKey.includes(privateKey.toLowerCase()) || 
    lowerKey.includes('cookie') ||
    lowerKey.includes('session')
  )
}

// 获取所有 localStorage 数据（排除隐私数据）
export function getAllLocalStorageData(): StorageInfo[] {
  if (typeof window === 'undefined') {
    return []
  }

  const data: StorageInfo[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && !isPrivateKey(key)) {
      const value = localStorage.getItem(key) || ''
      data.push({
        key,
        size: new Blob([value]).size,
        value
      })
    }
  }
  return data
}

// 获取存储空间使用情况
export function getStorageUsage(): { used: number; total: number; percentage: number } {
  if (typeof window === 'undefined') {
    return { used: 0, total: 0, percentage: 0 }
  }

  let used = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key) || ''
      used += new Blob([value]).size + key.length
    }
  }

  // 通常 localStorage 限制为 5-10MB
  const total = 5 * 1024 * 1024 // 5MB
  const percentage = (used / total) * 100

  return { used, total, percentage }
}

// 清除所有Cookie相关数据（隐私数据，仅管理员可用）
export function clearAllCookieData(): void {
  if (typeof window === 'undefined') {
    return
  }

  // 清除所有cookie相关的key
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && isPrivateKey(key)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })

  console.log(`✅ 已清除 ${keysToRemove.length} 个隐私数据项`)
}

// 清除所有缓存数据
export function clearAllCacheData(): void {
  if (typeof window === 'undefined') {
    return
  }

  const keys = Array.from({ length: localStorage.length }, (_, i) => 
    localStorage.key(i)
  ).filter((key): key is string => {
    if (!key) return false
    return key.includes('cache') || 
           key.includes('Cache') || 
           key.includes('_cache_') ||
           key.startsWith('cache_')
  })

  keys.forEach(key => {
    localStorage.removeItem(key)
  })

  console.log('✅ 所有缓存数据已清除')
}

// 清除后台管理数据（保留默认学校）
export function clearAdminData(): void {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem('admin-custom-schools')
  localStorage.removeItem('admin-school-url-config')
  console.log('✅ 后台管理数据已清除')
}

// 导出所有配置数据（不包含隐私数据）
export function exportAllConfig(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && !isPrivateKey(key) && (key.startsWith('admin-') || 
                key.startsWith('course_selector_user_info') || 
                key === 'selected-school-id')) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          data[key] = JSON.parse(value)
        } catch {
          data[key] = value
        }
      }
    }
  }

  return JSON.stringify(data, null, 2)
}

// 导入配置数据
export function importConfig(jsonData: string): { success: boolean; message: string } {
  if (typeof window === 'undefined') {
    return { success: false, message: '只能在客户端环境中导入配置' }
  }

  try {
    const data = JSON.parse(jsonData)
    
    // 验证数据格式
    if (typeof data !== 'object') {
      return { success: false, message: '配置文件格式错误' }
    }

    // 导入数据
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        localStorage.setItem(key, value)
      } else {
        localStorage.setItem(key, JSON.stringify(value))
      }
    })

    return { success: true, message: '配置导入成功，请刷新页面' }
  } catch (error: any) {
    return { success: false, message: `导入失败: ${error.message}` }
  }
}

// 清除指定 key 的数据
export function clearStorageKey(key: string): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(key)
  console.log(`✅ 已清除: ${key}`)
}
