/**
 * 错误追踪和日志系统
 * 用于记录和追踪应用中的错误和用户操作
 */

export interface ErrorContext {
    userId?: string
    schoolId?: string
    action: string
    component?: string
    timestamp?: number
    userAgent?: string
    url?: string
    additionalData?: any
}

export interface ErrorLog {
    id: string
    error: {
        message: string
        stack?: string
        name: string
    }
    context: ErrorContext
    timestamp: number
    resolved: boolean
}

export interface ActionLog {
    id: string
    action: string
    data?: any
    timestamp: number
    userId?: string
    schoolId?: string
}

class ErrorTracker {
    private static readonly MAX_LOGS = 100
    private static readonly STORAGE_KEY_ERRORS = 'error_tracker_logs'
    private static readonly STORAGE_KEY_ACTIONS = 'action_tracker_logs'

    /**
     * 记录错误
     */
    static captureError(error: Error, context: ErrorContext): void {
        const errorLog: ErrorLog = {
            id: this.generateId(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context: {
                ...context,
                timestamp: Date.now(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                url: typeof window !== 'undefined' ? window.location.href : 'unknown'
            },
            timestamp: Date.now(),
            resolved: false
        }

        // 保存到本地存储
        this.saveErrorLog(errorLog)

        // 在开发环境打印详细信息
        if (process.env.NODE_ENV === 'development') {
            console.group('🔴 Error Captured')
            console.error('Error:', error)
            console.log('Context:', context)
            console.groupEnd()
        }

        // 云端环境可以发送到远程服务（预留接口）
        if (process.env.NODE_ENV === 'production') {
            this.sendToRemote(errorLog).catch(console.error)
        }
    }

    /**
     * 记录用户操作
     */
    static logAction(action: string, data?: any, userId?: string, schoolId?: string): void {
        const actionLog: ActionLog = {
            id: this.generateId(),
            action,
            data,
            timestamp: Date.now(),
            userId,
            schoolId
        }

        this.saveActionLog(actionLog)

        if (process.env.NODE_ENV === 'development') {
            console.log('📝 Action:', action, data)
        }
    }

    /**
     * 获取错误历史
     */
    static getErrorHistory(limit = 50): ErrorLog[] {
        if (typeof window === 'undefined') return []

        try {
            const stored = localStorage.getItem(this.STORAGE_KEY_ERRORS)
            if (!stored) return []

            const logs: ErrorLog[] = JSON.parse(stored)
            return logs.slice(0, limit)
        } catch (error) {
            console.error('Failed to get error history:', error)
            return []
        }
    }

    /**
     * 获取操作历史
     */
    static getActionHistory(limit = 50): ActionLog[] {
        if (typeof window === 'undefined') return []

        try {
            const stored = localStorage.getItem(this.STORAGE_KEY_ACTIONS)
            if (!stored) return []

            const logs: ActionLog[] = JSON.parse(stored)
            return logs.slice(0, limit)
        } catch (error) {
            console.error('Failed to get action history:', error)
            return []
        }
    }

    /**
     * 清除所有日志
     */
    static clearLogs(): void {
        if (typeof window === 'undefined') return

        localStorage.removeItem(this.STORAGE_KEY_ERRORS)
        localStorage.removeItem(this.STORAGE_KEY_ACTIONS)
    }

    /**
     * 标记错误为已解决
     */
    static resolveError(errorId: string): void {
        if (typeof window === 'undefined') return

        try {
            const stored = localStorage.getItem(this.STORAGE_KEY_ERRORS)
            if (!stored) return

            const logs: ErrorLog[] = JSON.parse(stored)
            const updated = logs.map(log =>
                log.id === errorId ? { ...log, resolved: true } : log
            )

            localStorage.setItem(this.STORAGE_KEY_ERRORS, JSON.stringify(updated))
        } catch (error) {
            console.error('Failed to resolve error:', error)
        }
    }

    /**
     * 保存错误日志
     */
    private static saveErrorLog(errorLog: ErrorLog): void {
        if (typeof window === 'undefined') return

        try {
            const stored = localStorage.getItem(this.STORAGE_KEY_ERRORS)
            const logs: ErrorLog[] = stored ? JSON.parse(stored) : []

            // 添加新日志到开头
            logs.unshift(errorLog)

            // 限制日志数量
            if (logs.length > this.MAX_LOGS) {
                logs.splice(this.MAX_LOGS)
            }

            localStorage.setItem(this.STORAGE_KEY_ERRORS, JSON.stringify(logs))
        } catch (error) {
            console.error('Failed to save error log:', error)
        }
    }

    /**
     * 保存操作日志
     */
    private static saveActionLog(actionLog: ActionLog): void {
        if (typeof window === 'undefined') return

        try {
            const stored = localStorage.getItem(this.STORAGE_KEY_ACTIONS)
            const logs: ActionLog[] = stored ? JSON.parse(stored) : []

            logs.unshift(actionLog)

            if (logs.length > this.MAX_LOGS) {
                logs.splice(this.MAX_LOGS)
            }

            localStorage.setItem(this.STORAGE_KEY_ACTIONS, JSON.stringify(logs))
        } catch (error) {
            console.error('Failed to save action log:', error)
        }
    }

    /**
     * 生成唯一ID
     */
    private static generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * 发送日志到远程服务（预留接口）
     */
    private static async sendToRemote(errorLog: ErrorLog): Promise<void> {
        // 这里可以集成 Sentry、LogRocket 等服务
        // 或者发送到自己的后端API
        try {
            // 示例：发送到自定义API
            // await fetch('/api/error-tracking', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(errorLog)
            // })
        } catch (error) {
            // 静默失败，避免递归错误
            console.warn('Failed to send error to remote:', error)
        }
    }

    /**
     * 获取错误统计
     */
    static getErrorStats(): {
        total: number
        resolved: number
        unresolved: number
        byComponent: Record<string, number>
    } {
        const errors = this.getErrorHistory()

        const stats = {
            total: errors.length,
            resolved: errors.filter(e => e.resolved).length,
            unresolved: errors.filter(e => !e.resolved).length,
            byComponent: {} as Record<string, number>
        }

        errors.forEach(error => {
            const component = error.context.component || 'Unknown'
            stats.byComponent[component] = (stats.byComponent[component] || 0) + 1
        })

        return stats
    }
}

export default ErrorTracker
