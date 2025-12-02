/**
 * API 请求队列管理器
 * 控制并发请求数量，避免同时发送过多请求导致服务器拒绝
 * 支持优先级、请求去重、智能重试等功能
 */

interface RequestTask<T = any> {
    id: string
    fn: () => Promise<T>
    priority: number
    dedupeKey?: string
    resolve: (value: T) => void
    reject: (error: any) => void
    retries: number
    maxRetries: number
}

interface RetryStrategy {
    maxRetries: number
    baseDelay: number
    maxDelay: number
    shouldRetry?: (error: any) => boolean
}

class RequestQueue {
    private static instance: RequestQueue
    private queue: RequestTask[] = []
    private running: Set<string> = new Set()
    private dedupeMap: Map<string, Promise<any>> = new Map()
    private maxConcurrent = 3
    private retryStrategy: RetryStrategy = {
        maxRetries: 2,
        baseDelay: 500,
        maxDelay: 2000,
        shouldRetry: (error) => {
            // 网络错误或超时可以重试
            return (
                error.name === 'TypeError' ||
                error.name === 'NetworkError' ||
                error.message?.includes('timeout') ||
                error.message?.includes('fetch')
            )
        }
    }

    private constructor() { }

    static getInstance(): RequestQueue {
        if (!RequestQueue.instance) {
            RequestQueue.instance = new RequestQueue()
        }
        return RequestQueue.instance
    }

    /**
     * 添加请求到队列
     */
    async add<T>(
        fn: () => Promise<T>,
        options?: {
            priority?: number
            dedupeKey?: string
            maxRetries?: number
        }
    ): Promise<T> {
        const { priority = 0, dedupeKey, maxRetries = this.retryStrategy.maxRetries } = options || {}

        // 请求去重：如果已经有相同的请求在进行中，直接返回该Promise
        if (dedupeKey && this.dedupeMap.has(dedupeKey)) {
            console.log(`📎 请求去重: ${dedupeKey}`)
            return this.dedupeMap.get(dedupeKey)!
        }

        return new Promise<T>((resolve, reject) => {
            const task: RequestTask<T> = {
                id: this.generateId(),
                fn,
                priority,
                dedupeKey,
                resolve,
                reject,
                retries: 0,
                maxRetries
            }

            // 添加到队列（按优先级排序）
            this.queue.push(task)
            this.queue.sort((a, b) => b.priority - a.priority)

            // 如果有去重key，记录Promise
            if (dedupeKey) {
                const promise = new Promise<T>((res, rej) => {
                    task.resolve = res
                    task.reject = rej
                })
                this.dedupeMap.set(dedupeKey, promise)
            }

            // 尝试执行队列中的请求
            this.processQueue()
        })
    }

    /**
     * 处理队列
     */
    private async processQueue(): Promise<void> {
        // 如果已达到最大并发数，或队列为空，则返回
        if (this.running.size >= this.maxConcurrent || this.queue.length === 0) {
            return
        }

        // 取出队列中的第一个任务
        const task = this.queue.shift()
        if (!task) return

        // 标记为正在运行
        this.running.add(task.id)

        try {
            // 执行请求
            const result = await this.executeWithRetry(task)
            task.resolve(result)

            // 清除去重记录
            if (task.dedupeKey) {
                this.dedupeMap.delete(task.dedupeKey)
            }
        } catch (error) {
            task.reject(error)

            // 清除去重记录
            if (task.dedupeKey) {
                this.dedupeMap.delete(task.dedupeKey)
            }
        } finally {
            // 移除运行标记
            this.running.delete(task.id)

            // 继续处理队列
            this.processQueue()
        }
    }

    /**
     * 执行请求（带重试）
     */
    private async executeWithRetry<T>(task: RequestTask<T>): Promise<T> {
        let lastError: any

        for (let attempt = 0; attempt <= task.maxRetries; attempt++) {
            try {
                const result = await task.fn()
                if (attempt > 0) {
                    console.log(`✅ 请求重试成功 (尝试 ${attempt + 1}/${task.maxRetries + 1})`)
                }
                return result
            } catch (error: any) {
                lastError = error

                // 判断是否应该重试
                const shouldRetry =
                    attempt < task.maxRetries &&
                    (!this.retryStrategy.shouldRetry || this.retryStrategy.shouldRetry(error))

                if (shouldRetry) {
                    // 计算延迟时间（指数退避 + 随机jitter）
                    const delay = this.calculateDelay(attempt)
                    console.warn(
                        `⚠️ 请求失败，${delay}ms后重试 (尝试 ${attempt + 1}/${task.maxRetries + 1}):`,
                        error.message
                    )
                    await this.sleep(delay)
                } else {
                    // 不重试，直接抛出错误
                    throw error
                }
            }
        }

        throw lastError
    }

    /**
     * 计算延迟时间（指数退避 + jitter）
     */
    private calculateDelay(attempt: number): number {
        const { baseDelay, maxDelay } = this.retryStrategy

        // 指数退避
        const exponentialDelay = baseDelay * Math.pow(2, attempt)

        // 添加随机jitter（±25%）
        const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1)

        // 限制最大延迟
        return Math.min(Math.max(exponentialDelay + jitter, 0), maxDelay)
    }

    /**
     * 延迟函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    /**
     * 生成唯一ID
     */
    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * 设置最大并发数
     */
    setMaxConcurrent(max: number): void {
        this.maxConcurrent = max
    }

    /**
     * 设置重试策略
     */
    setRetryStrategy(strategy: Partial<RetryStrategy>): void {
        this.retryStrategy = { ...this.retryStrategy, ...strategy }
    }

    /**
     * 清空队列
     */
    clear(): void {
        this.queue.forEach(task => {
            task.reject(new Error('Queue cleared'))
        })
        this.queue = []
        this.dedupeMap.clear()
    }

    /**
     * 获取队列状态
     */
    getStatus(): {
        queueLength: number
        runningCount: number
        maxConcurrent: number
    } {
        return {
            queueLength: this.queue.length,
            runningCount: this.running.size,
            maxConcurrent: this.maxConcurrent
        }
    }

    /**
     * 取消指定请求
     */
    cancel(dedupeKey: string): boolean {
        const index = this.queue.findIndex(task => task.dedupeKey === dedupeKey)
        if (index !== -1) {
            const task = this.queue.splice(index, 1)[0]
            task.reject(new Error('Request cancelled'))
            this.dedupeMap.delete(dedupeKey)
            return true
        }
        return false
    }
}

// 导出单例
export default RequestQueue.getInstance()

// 也导出类以便测试
export { RequestQueue }
