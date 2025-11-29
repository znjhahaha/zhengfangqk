/**
 * 请求去重器 - 防止相同参数的并发请求
 */
export class RequestDeduplicator {
    private pendingRequests: Map<string, Promise<any>> = new Map()

    /**
     * 生成请求的唯一键
     */
    private generateKey(url: string, params?: any): string {
        const paramsStr = params ? JSON.stringify(params) : ''
        return `${url}:${paramsStr}`
    }

    /**
     * 执行去重的请求
     * @param url 请求URL
     * @param requestFn 实际的请求函数
     * @param params 请求参数(用于生成唯一键)
     * @returns Promise
     */
    async dedupe<T>(
        url: string,
        requestFn: () => Promise<T>,
        params?: any
    ): Promise<T> {
        const key = this.generateKey(url, params)

        // 如果已有相同的请求正在进行，直接返回该Promise
        if (this.pendingRequests.has(key)) {
            console.log(`🔄 Request deduped: ${key}`)
            return this.pendingRequests.get(key) as Promise<T>
        }

        // 执行新请求
        const promise = requestFn()
            .finally(() => {
                // 请求完成后清理
                this.pendingRequests.delete(key)
            })

        this.pendingRequests.set(key, promise)
        return promise
    }

    /**
     * 清除所有待处理的请求
     */
    clear(): void {
        this.pendingRequests.clear()
    }

    /**
     * 获取当前待处理请求数量
     */
    getPendingCount(): number {
        return this.pendingRequests.size
    }
}

// 导出单例实例
export const requestDeduplicator = new RequestDeduplicator()
