/**
 * 错误类型枚举
 */
export enum ErrorType {
    NETWORK_ERROR = 'NETWORK_ERROR',           // 网络错误
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR', // 认证失败
    COURSE_FULL = 'COURSE_FULL',              // 课程已满
    COURSE_CONFLICT = 'COURSE_CONFLICT',       // 课程冲突
    SYSTEM_ERROR = 'SYSTEM_ERROR',            // 系统错误
    UNKNOWN = 'UNKNOWN'                       // 未知错误
}

/**
 * 重试配置
 */
export interface RetryConfig {
    maxAttempts: number      // 最大重试次数
    baseDelay: number        // 基础延迟(毫秒)
    maxDelay: number         // 最大延迟(毫秒)
    exponentialBase: number  // 指数基数
}

/**
 * 错误类型检测配置
 */
const ERROR_TYPE_PATTERNS: Record<ErrorType, RegExp[]> = {
    [ErrorType.NETWORK_ERROR]: [
        /network/i,
        /timeout/i,
        /fetch failed/i,
        /ECONNREFUSED/i,
        /ETIMEDOUT/i
    ],
    [ErrorType.AUTHENTICATION_ERROR]: [
        /unauthorized/i,
        /authentication/i,
        /cookie/i,
        /session/i,
        /401/,
        /403/
    ],
    [ErrorType.COURSE_FULL]: [
        /已满/,
        /人数已满/,
        /容量不足/,
        /full/i
    ],
    [ErrorType.COURSE_CONFLICT]: [
        /冲突/,
        /时间冲突/,
        /conflict/i
    ],
    [ErrorType.SYSTEM_ERROR]: [
        /500/,
        /503/,
        /系统错误/,
        /服务器错误/
    ],
    [ErrorType.UNKNOWN]: []
}

/**
 * 不同错误类型的重试配置
 */
const RETRY_CONFIGS: Record<ErrorType, RetryConfig> = {
    [ErrorType.NETWORK_ERROR]: {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 10000,
        exponentialBase: 1.5
    },
    [ErrorType.AUTHENTICATION_ERROR]: {
        maxAttempts: 0, // 认证失败不重试
        baseDelay: 0,
        maxDelay: 0,
        exponentialBase: 1
    },
    [ErrorType.COURSE_FULL]: {
        maxAttempts: Infinity, // 课程已满持续重试
        baseDelay: 2000,
        maxDelay: 30000,
        exponentialBase: 2
    },
    [ErrorType.COURSE_CONFLICT]: {
        maxAttempts: 0, // 冲突不重试
        baseDelay: 0,
        maxDelay: 0,
        exponentialBase: 1
    },
    [ErrorType.SYSTEM_ERROR]: {
        maxAttempts: 3,
        baseDelay: 3000,
        maxDelay: 15000,
        exponentialBase: 2
    },
    [ErrorType.UNKNOWN]: {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 10000,
        exponentialBase: 1.5
    }
}

/**
 * 检测错误类型
 */
export function detectErrorType(error: any): ErrorType {
    const errorMessage = error?.message || error?.toString() || ''

    for (const [type, patterns] of Object.entries(ERROR_TYPE_PATTERNS)) {
        if (type === ErrorType.UNKNOWN) continue

        for (const pattern of patterns) {
            if (pattern.test(errorMessage)) {
                return type as ErrorType
            }
        }
    }

    return ErrorType.UNKNOWN
}

/**
 * 计算重试延迟
 * @param attemptCount 当前尝试次数(从1开始)
 * @param errorType 错误类型
 * @returns 延迟毫秒数，如果返回Infinity表示不应该重试
 */
export function calculateRetryDelay(
    attemptCount: number,
    errorType: ErrorType
): number {
    const config = RETRY_CONFIGS[errorType]

    // 检查是否应该重试
    if (attemptCount > config.maxAttempts) {
        return Infinity // 超过最大重试次数
    }

    // 计算指数退避延迟
    const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attemptCount - 1)

    // 添加随机抖动(±20%)，避免惊群效应
    const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1)

    // 应用上限
    return Math.min(exponentialDelay + jitter, config.maxDelay)
}

/**
 * 获取错误类型的重试配置
 */
export function getRetryConfig(errorType: ErrorType): RetryConfig {
    return RETRY_CONFIGS[errorType]
}

/**
 * 判断是否应该重试
 */
export function shouldRetry(attemptCount: number, error: any): boolean {
    const errorType = detectErrorType(error)
    const config = RETRY_CONFIGS[errorType]
    return attemptCount < config.maxAttempts
}
