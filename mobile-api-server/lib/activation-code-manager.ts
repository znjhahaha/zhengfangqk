/**
 * 激活码管理模块
 */

export interface ActivationCode {
  code: string
  name?: string
  description?: string
  expiresAt: number // 过期时间戳（毫秒）
  maxUses?: number // 最大使用次数，undefined表示无限制
  usedCount: number // 已使用次数
  maxCourses?: number // 可抢课程数，undefined表示无限制
  usedCourses?: number // 已使用课程数
  createdAt: number // 创建时间戳
  createdBy?: string // 创建者
  isActive: boolean // 是否激活
}

export interface ActivationRecord {
  code: string
  userId: string // 用户标识（可以是sessionId或其他唯一标识）
  activatedAt: number
  expiresAt: number
}

/**
 * 验证激活码
 */
export function validateActivationCode(
  code: string,
  activationCode: ActivationCode,
  userId: string
): { valid: boolean; message: string; expiresAt?: number } {
  if (!activationCode.isActive) {
    return { valid: false, message: '激活码已被禁用' }
  }

  if (activationCode.expiresAt < Date.now()) {
    return { valid: false, message: '激活码已过期' }
  }

  if (activationCode.maxUses && activationCode.usedCount >= activationCode.maxUses) {
    return { valid: false, message: '激活码已达到最大使用次数' }
  }

  return {
    valid: true,
    message: '激活码有效',
    expiresAt: activationCode.expiresAt
  }
}

