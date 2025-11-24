/**
 * 数据缓存管理器
 * 用于在 localStorage 中缓存应用数据，提供缓存优先加载策略
 * 支持多用户数据隔离
 */

interface CacheItem<T> {
    data: T
    timestamp: number
    expiresAt: number
}

interface CacheConfig {
    ttl?: number // Time to live in milliseconds, default: 30 minutes
}

class DataCacheManager {
    private static readonly DEFAULT_TTL = 30 * 60 * 1000 // 30 minutes
    private static readonly CACHE_PREFIX = 'app_cache_'

    /**
     * 构建缓存键
     * @param key 基础键名
     * @param userId 用户ID (可选)
     * @param schoolId 学校ID (可选)
     */
    private static buildKey(key: string, userId?: string, schoolId?: string): string {
        const parts = [this.CACHE_PREFIX, key]
        if (schoolId) parts.push(schoolId)
        if (userId) parts.push(userId)
        return parts.join('_')
    }

    /**
     * 获取缓存数据
     * @param key 缓存键
     * @param userId 用户ID (可选，用于多用户隔离)
     * @param schoolId 学校ID (可选，用于多学校隔离)
     */
    static get<T>(key: string, userId?: string, schoolId?: string): T | null {
        try {
            const fullKey = this.buildKey(key, userId, schoolId)
            const cached = localStorage.getItem(fullKey)

            if (!cached) {
                return null
            }

            const cacheItem: CacheItem<T> = JSON.parse(cached)

            // 检查是否过期
            if (Date.now() > cacheItem.expiresAt) {
                console.log(`🗑️ 缓存已过期: ${key}`)
                localStorage.removeItem(fullKey)
                return null
            }

            console.log(`✅ 使用缓存数据: ${key}`)
            return cacheItem.data
        } catch (error) {
            console.error('读取缓存失败:', error)
            return null
        }
    }

    /**
     * 设置缓存数据
     * @param key 缓存键
     * @param data 要缓存的数据
     * @param userId 用户ID (可选，用于多用户隔离)
     * @param schoolId 学校ID (可选，用于多学校隔离)
     * @param config 缓存配置
     */
    static set<T>(
        key: string,
        data: T,
        userId?: string,
        schoolId?: string,
        config?: CacheConfig
    ): void {
        try {
            const fullKey = this.buildKey(key, userId, schoolId)
            const ttl = config?.ttl || this.DEFAULT_TTL
            const timestamp = Date.now()

            const cacheItem: CacheItem<T> = {
                data,
                timestamp,
                expiresAt: timestamp + ttl
            }

            localStorage.setItem(fullKey, JSON.stringify(cacheItem))
            console.log(`💾 已缓存数据: ${key}, 过期时间: ${new Date(cacheItem.expiresAt).toLocaleString('zh-CN')}`)
        } catch (error) {
            console.error('保存缓存失败:', error)
        }
    }

    /**
     * 清除特定缓存
     * @param key 缓存键
     * @param userId 用户ID (可选)
     * @param schoolId 学校ID (可选)
     */
    static clear(key: string, userId?: string, schoolId?: string): void {
        try {
            const fullKey = this.buildKey(key, userId, schoolId)
            localStorage.removeItem(fullKey)
            console.log(`🗑️ 已清除缓存: ${key}`)
        } catch (error) {
            console.error('清除缓存失败:', error)
        }
    }

    /**
     * 清除所有应用缓存
     */
    static clearAll(): void {
        try {
            const keys = Object.keys(localStorage)
            const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX))

            cacheKeys.forEach(key => localStorage.removeItem(key))
            console.log(`🗑️ 已清除所有缓存 (${cacheKeys.length} 项)`)
        } catch (error) {
            console.error('清除所有缓存失败:', error)
        }
    }

    /**
     * 清除过期缓存
     */
    static clearExpired(): void {
        try {
            const keys = Object.keys(localStorage)
            const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX))
            let expiredCount = 0

            cacheKeys.forEach(key => {
                try {
                    const cached = localStorage.getItem(key)
                    if (cached) {
                        const cacheItem: CacheItem<any> = JSON.parse(cached)
                        if (Date.now() > cacheItem.expiresAt) {
                            localStorage.removeItem(key)
                            expiredCount++
                        }
                    }
                } catch (error) {
                    // 如果解析失败，删除该项
                    localStorage.removeItem(key)
                    expiredCount++
                }
            })

            if (expiredCount > 0) {
                console.log(`🗑️ 已清除 ${expiredCount} 项过期缓存`)
            }
        } catch (error) {
            console.error('清除过期缓存失败:', error)
        }
    }

    /**
     * 检查缓存是否存在且有效
     * @param key 缓存键
     * @param userId 用户ID (可选)
     * @param schoolId 学校ID (可选)
     */
    static has(key: string, userId?: string, schoolId?: string): boolean {
        return this.get(key, userId, schoolId) !== null
    }

    /**
     * 获取缓存信息（用于调试）
     * @param key 缓存键
     * @param userId 用户ID (可选)
     * @param schoolId 学校ID (可选)
     */
    static getInfo(key: string, userId?: string, schoolId?: string): { timestamp: number; expiresAt: number; size: number } | null {
        try {
            const fullKey = this.buildKey(key, userId, schoolId)
            const cached = localStorage.getItem(fullKey)

            if (!cached) {
                return null
            }

            const cacheItem: CacheItem<any> = JSON.parse(cached)
            return {
                timestamp: cacheItem.timestamp,
                expiresAt: cacheItem.expiresAt,
                size: new Blob([cached]).size
            }
        } catch (error) {
            return null
        }
    }
}

// 定期清理过期缓存（每10分钟）
if (typeof window !== 'undefined') {
    setInterval(() => {
        DataCacheManager.clearExpired()
    }, 10 * 60 * 1000)
}

export default DataCacheManager

// 导出常用的缓存键常量
export const CACHE_KEYS = {
    COURSES_AVAILABLE: 'courses_available',
    COURSES_SELECTED: 'courses_selected',
    GRADES: 'grades',
    SCHEDULE: 'schedule',
    SERVER_TASKS: 'server_tasks',
    ADMIN_TASKS: 'admin_tasks',
    STUDENT_INFO: 'student_info',
    ACTIVATION_STATUS: 'activation_status'
} as const
