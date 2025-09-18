// API缓存系统
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // 生存时间（毫秒）
}

class APICache {
  private cache = new Map<string, CacheItem<any>>()
  
  // 设置缓存
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
  
  // 获取缓存
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }
  
  // 删除缓存
  delete(key: string): void {
    this.cache.delete(key)
  }
  
  // 清空所有缓存
  clear(): void {
    this.cache.clear()
  }
  
  // 获取缓存大小
  size(): number {
    return this.cache.size
  }
  
  // 清理过期缓存
  cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    for (const [key, item] of entries) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// 创建全局缓存实例
export const apiCache = new APICache()

// 缓存键生成器
export const cacheKeys = {
  studentInfo: 'student_info',
  availableCourses: (type: string) => `available_courses_${type}`,
  selectedCourses: 'selected_courses',
  scheduleData: 'schedule_data',
  courseParams: 'course_params'
}

// 带缓存的API请求包装器
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 2 * 60 * 1000 // 默认2分钟，减少缓存时间
): Promise<T> {
  // 尝试从缓存获取
  const cached = apiCache.get<T>(key)
  if (cached) {
    console.log(`📦 缓存命中: ${key}`)
    return cached
  }
  
  // 缓存未命中，执行请求
  console.log(`🔄 缓存未命中，执行请求: ${key}`)
  const data = await fetcher()
  
  // 存储到缓存
  apiCache.set(key, data, ttl)
  console.log(`💾 数据已缓存: ${key}`)
  
  return data
}

// 定期清理过期缓存
setInterval(() => {
  apiCache.cleanup()
}, 60 * 1000) // 每分钟清理一次
