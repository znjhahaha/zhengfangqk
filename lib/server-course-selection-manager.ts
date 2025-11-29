/**
 * 服务器端抢课任务管理模块
 * 支持本地文件和 COS 双重持久化
 */

import fs from 'fs'
import path from 'path'
import { saveToCos, loadFromCos, isCosEnabled } from './cos-storage'
import {
  detectErrorType,
  calculateRetryDelay,
  shouldRetry as shouldRetryByError,
  ErrorType
} from './utils/retry-strategy'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'server-tasks.json')
const COS_KEY = 'server-tasks.json'

export interface ServerSelectionTask {
  id: string // 任务ID
  userId: string // 用户标识
  sessionId?: string // 会话ID
  schoolId: string // 学校ID
  priority: 'high' | 'normal' | 'low' // 任务优先级
  courses: Array<{
    kch: string // 课程号
    kxh: string // 课程序号
    name?: string // 课程名称
    // 完整的课程数据（用于选课时传递参数）
    jxb_id?: string
    do_jxb_id?: string
    kch_id?: string
    jxbzls?: string
    kklxdm?: string
    kcmc?: string
    jxbmc?: string
    _rwlx?: string
    _xklc?: string
    _xkly?: string
    _xkkz_id?: string
    [key: string]: any // 允许其他属性
  }>
  cookie: string // 用户Cookie
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  createdAt: number // 创建时间
  startedAt?: number // 开始时间
  completedAt?: number // 完成时间
  lastAttemptAt?: number // 最后尝试时间
  attemptCount: number // 尝试次数
  maxAttempts?: number // 最大尝试次数（设为undefined表示无限重试直到成功）
  scheduledTime?: number // 定时执行时间（时间戳）
  errorType?: string // 最后一次错误的类型（用于智能重试）
  result?: {
    success: boolean
    message: string
    course?: {
      kch: string
      kxh: string
    }
    data?: any // 保存完整的响应数据，包括flag字段
  }
  error?: string // 错误信息
}

// 任务队列
// 任务队列 - 使用 globalThis 确保在开发环境下模块重载时保持单例
const globalForTasks = globalThis as unknown as {
  serverTaskQueue: Map<string, ServerSelectionTask>
  serverRunningTasks: Set<string>
  serverScheduledTaskTimers: Map<string, NodeJS.Timeout>
}

const taskQueue = globalForTasks.serverTaskQueue || new Map<string, ServerSelectionTask>()
const runningTasks = globalForTasks.serverRunningTasks || new Set<string>()
const scheduledTaskTimers = globalForTasks.serverScheduledTaskTimers || new Map<string, NodeJS.Timeout>()

if (process.env.NODE_ENV !== 'production') {
  globalForTasks.serverTaskQueue = taskQueue
  globalForTasks.serverRunningTasks = runningTasks
  globalForTasks.serverScheduledTaskTimers = scheduledTaskTimers
}

// 并发限制
let maxConcurrentTasks = 5

// 自动清理间隔（30分钟）
const CLEANUP_INTERVAL = 30 * 60 * 1000
// 任务保留数量（每个用户最多保留最近50个已完成任务）
const MAX_COMPLETED_TASKS_PER_USER = 50
// 任务最大保留时间（7天）
const MAX_TASK_AGE = 7 * 24 * 60 * 60 * 1000

// 启动自动清理任务
let cleanupInterval: NodeJS.Timeout | null = null

function startAutoCleanup() {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    try {
      const removed = cleanupOldTasks()
      if (removed > 0) {
        console.log(`🧹 自动清理: 删除了 ${removed} 个旧任务`)
      }
    } catch (error) {
      console.error('自动清理任务失败:', error)
    }
  }, CLEANUP_INTERVAL)

  // 立即执行一次清理
  setTimeout(() => {
    try {
      const removed = cleanupOldTasks()
      if (removed > 0) {
        console.log(`🧹 启动时清理: 删除了 ${removed} 个旧任务`)
      }
    } catch (error) {
      console.error('启动清理失败:', error)
    }
  }, 5000) // 启动5秒后执行第一次清理
}

// 启动自动清理
if (typeof process !== 'undefined') {
  // 确保数据目录存在
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    } catch (error) {
      console.error('创建数据目录失败:', error)
    }
  }

  // 启动时加载任务
  loadTasks()

  startAutoCleanup()

  // 进程退出时清理定时器
  process.on('SIGTERM', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
    // 清理所有定时任务
    scheduledTaskTimers.forEach(timer => clearTimeout(timer))
    scheduledTaskTimers.clear()
    // 退出前保存
    saveTasks()
  })

  process.on('SIGINT', () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
    // 清理所有定时任务
    scheduledTaskTimers.forEach(timer => clearTimeout(timer))
    scheduledTaskTimers.clear()
    // 退出前保存
    saveTasks()
  })
}

/**
 * 保存任务到持久化存储
 */
async function saveTasks() {
  try {
    const tasks = Array.from(taskQueue.values())
    const data = {
      tasks,
      updatedAt: Date.now()
    }

    // 1. 保存到本地文件
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')

    // 2. 保存到 COS (如果启用)
    if (isCosEnabled()) {
      // 异步保存，不阻塞主流程
      saveToCos(COS_KEY, data).catch(err => {
        console.error('保存任务到 COS 失败:', err)
      })
    }
  } catch (error) {
    console.error('保存任务失败:', error)
  }
}

/**
 * 从持久化存储加载任务
 */
async function loadTasks() {
  // 如果队列中已有任务（说明是模块重载），则跳过加载，避免覆盖内存中的最新状态
  if (taskQueue.size > 0) {
    console.log(`🔄 模块重载检测：保留内存中现有的 ${taskQueue.size} 个任务`)
    return
  }

  try {
    let data: { tasks: ServerSelectionTask[], updatedAt: number } | null = null

    // 1. 尝试从本地加载
    if (fs.existsSync(DATA_FILE)) {
      try {
        const content = fs.readFileSync(DATA_FILE, 'utf-8')
        data = JSON.parse(content)
        console.log(`📂 从本地文件加载了 ${data?.tasks?.length || 0} 个任务`)
      } catch (err) {
        console.error('读取本地任务文件失败:', err)
      }
    }

    // 2. 如果本地没有或启用 COS，尝试从 COS 加载 (作为备份或同步)
    // 注意：这里简化逻辑，优先使用本地，如果本地没有才尝试 COS
    // 实际生产中可能需要对比 updatedAt
    if (!data && isCosEnabled()) {
      try {
        const cosData = await loadFromCos(COS_KEY)
        if (cosData) {
          data = cosData
          console.log(`☁️ 从 COS 加载了 ${data?.tasks?.length || 0} 个任务`)
          // 同步到本地
          fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
        }
      } catch (err) {
        console.error('从 COS 加载任务失败:', err)
      }
    }

    if (data && Array.isArray(data.tasks)) {
      // 恢复任务
      taskQueue.clear()
      runningTasks.clear()

      const now = Date.now()

      for (const task of data.tasks) {
        // 恢复状态逻辑
        if (task.status === 'running') {
          // 如果任务之前是运行中，重启后重置为 pending
          // 或者如果任务太旧，标记为 failed
          if (now - (task.startedAt || 0) > 24 * 60 * 60 * 1000) {
            task.status = 'failed'
            task.error = '服务器重启，任务超时终止'
          } else {
            task.status = 'pending'
            console.log(`🔄 恢复任务 ${task.id} 状态: running -> pending`)
          }
        }

        taskQueue.set(task.id, task)

        // 恢复定时任务
        if (task.status === 'pending' && task.scheduledTime && task.scheduledTime > now) {
          // 这里需要重新注册定时器，但由于循环引用问题，可能需要外部调用或简单的 setTimeout
          // 暂时简化：不自动恢复定时器逻辑，依靠外部轮询或手动触发
          // 或者：
          const delay = task.scheduledTime - now
          if (delay > 0) {
            // 注意：这里不能直接调用 startTask，因为那是立即执行
            // 我们需要一种机制来重新调度
            // 暂时略过，等待调度系统处理
          }
        }
      }

      console.log(`✅ 已恢复 ${taskQueue.size} 个任务`)
    }
  } catch (error) {
    console.error('加载任务失败:', error)
  }
}

/**
 * 设置最大并发任务数
 */
export function setMaxConcurrentTasks(max: number): void {
  maxConcurrentTasks = Math.max(1, max)
}

/**
 * 获取最大并发任务数
 */
export function getMaxConcurrentTasks(): number {
  return maxConcurrentTasks
}

/**
 * 添加任务到队列
 */
export function addTask(task: ServerSelectionTask): void {
  // 如果没有指定优先级，默认为 normal
  if (!task.priority) {
    task.priority = 'normal'
  }
  taskQueue.set(task.id, task)
  saveTasks()
}

/**
 * 获取任务
 */
export function getTask(taskId: string): ServerSelectionTask | undefined {
  return taskQueue.get(taskId)
}

/**
 * 获取用户的所有任务
 */
export function getUserTasks(userId: string): ServerSelectionTask[] {
  return Array.from(taskQueue.values()).filter(task => task.userId === userId)
}

/**
 * 获取所有任务
 */
export function getAllTasks(): ServerSelectionTask[] {
  return Array.from(taskQueue.values())
}

/**
 * 获取运行中的任务
 */
export function getRunningTasks(): ServerSelectionTask[] {
  return Array.from(runningTasks).map(id => taskQueue.get(id)!).filter(Boolean)
}

/**
 * 获取等待中的任务（按优先级排序）
 */
export function getPendingTasks(): ServerSelectionTask[] {
  const pending = Array.from(taskQueue.values()).filter(
    task => task.status === 'pending' && !runningTasks.has(task.id)
  )

  // 按优先级排序: high > normal > low
  // 同优先级按创建时间排序（先创建的先执行）
  const priorityOrder = { high: 0, normal: 1, low: 2 }
  return pending.sort((a, b) => {
    const priorityA = priorityOrder[a.priority || 'normal']
    const priorityB = priorityOrder[b.priority || 'normal']

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    return a.createdAt - b.createdAt
  })
}

/**
 * 开始任务（标记为运行中）
 */
export function startTask(taskId: string): boolean {
  const task = taskQueue.get(taskId)
  if (!task || task.status !== 'pending') {
    return false
  }

  // 检查并发限制
  if (runningTasks.size >= maxConcurrentTasks) {
    return false
  }

  task.status = 'running'
  task.startedAt = Date.now()
  runningTasks.add(taskId)
  saveTasks()
  return true
}

/**
 * 完成任务
 */
export function completeTask(taskId: string, success: boolean, message: string, course?: { kch: string; kxh: string }, data?: any): void {
  const task = taskQueue.get(taskId)
  if (!task) return

  task.status = success ? 'completed' : 'failed'
  task.completedAt = Date.now()
  task.result = { success, message, course, data } // 保存完整的数据，包括flag
  runningTasks.delete(taskId)
  saveTasks()
}

/**
 * 取消任务
 */
export function cancelTask(taskId: string): boolean {
  const task = taskQueue.get(taskId)
  if (!task) return false

  // 取消定时任务定时器
  cancelScheduledTaskTimer(taskId)

  if (task.status === 'running') {
    runningTasks.delete(taskId)
  }

  task.status = 'cancelled'
  task.completedAt = Date.now()
  saveTasks()
  return true
}

/**
 * 删除任务
 */
export function removeTask(taskId: string): boolean {
  // 取消定时任务定时器
  cancelScheduledTaskTimer(taskId)
  runningTasks.delete(taskId)
  const result = taskQueue.delete(taskId)
  if (result) {
    saveTasks()
  }
  return result
}

/**
 * 更新任务尝试信息
 */
export function updateTaskAttempt(taskId: string): void {
  const task = taskQueue.get(taskId)
  if (!task) return

  task.lastAttemptAt = Date.now()
  task.attemptCount++

  // 检查是否超过最大尝试次数
  if (task.maxAttempts && task.attemptCount >= task.maxAttempts) {
    task.status = 'failed'
    task.error = '达到最大尝试次数'
    task.completedAt = Date.now()
    runningTasks.delete(taskId)
  }
  saveTasks()
}

/**
 * 清理已完成的任务（保留最近N个）
 */
export function cleanupCompletedTasks(keepCount: number = 100): number {
  const completedTasks = Array.from(taskQueue.values())
    .filter(task => task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled')
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))

  if (completedTasks.length <= keepCount) {
    return 0
  }

  const toRemove = completedTasks.slice(keepCount)
  let removed = 0
  for (const task of toRemove) {
    if (removeTask(task.id)) {
      removed++
    }
  }

  return removed
}

/**
 * 清理旧任务（按用户分组，每个用户保留最近N个，并删除超过最大保留时间的任务）
 */
function cleanupOldTasks(): number {
  const now = Date.now()
  let removed = 0

  // 按用户分组任务
  const tasksByUser = new Map<string, ServerSelectionTask[]>()
  for (const task of taskQueue.values()) {
    if (!tasksByUser.has(task.userId)) {
      tasksByUser.set(task.userId, [])
    }
    tasksByUser.get(task.userId)!.push(task)
  }

  // 清理每个用户的任务
  for (const [userId, tasks] of tasksByUser.entries()) {
    // 分离已完成和未完成的任务
    const completed = tasks.filter(t =>
      t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
    )
    const active = tasks.filter(t =>
      t.status === 'pending' || t.status === 'running'
    )

    // 删除超过最大保留时间的已完成任务
    for (const task of completed) {
      const age = now - (task.completedAt || task.createdAt)
      if (age > MAX_TASK_AGE) {
        if (removeTask(task.id)) {
          removed++
        }
      }
    }

    // 每个用户最多保留最近N个已完成任务
    const remainingCompleted = completed
      .filter(t => {
        const age = now - (t.completedAt || t.createdAt)
        return age <= MAX_TASK_AGE
      })
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))

    if (remainingCompleted.length > MAX_COMPLETED_TASKS_PER_USER) {
      const toRemove = remainingCompleted.slice(MAX_COMPLETED_TASKS_PER_USER)
      for (const task of toRemove) {
        if (removeTask(task.id)) {
          removed++
        }
      }
    }
  }

  return removed
}

/**
 * 注册定时任务定时器（用于清理）
 */
export function registerScheduledTaskTimer(taskId: string, timer: NodeJS.Timeout): void {
  scheduledTaskTimers.set(taskId, timer)
}

/**
 * 取消定时任务定时器
 */
export function cancelScheduledTaskTimer(taskId: string): void {
  const timer = scheduledTaskTimers.get(taskId)
  if (timer) {
    clearTimeout(timer)
    scheduledTaskTimers.delete(taskId)
  }
}

/**
 * 获取任务统计信息（优化：使用单次遍历）
 */
export function getTaskStats(): {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
} {
  const tasks = Array.from(taskQueue.values())
  const stats = {
    total: tasks.length,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0
  }

  // 单次遍历统计所有状态
  for (const task of tasks) {
    switch (task.status) {
      case 'pending':
        stats.pending++
        break
      case 'running':
        stats.running++
        break
      case 'completed':
        stats.completed++
        break
      case 'failed':
        stats.failed++
        break
      case 'cancelled':
        stats.cancelled++
        break
    }
  }

  return stats
}

