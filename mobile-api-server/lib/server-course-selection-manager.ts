/**
 * 服务器端抢课任务管理模块
 */

export interface ServerSelectionTask {
  id: string // 任务ID
  userId: string // 用户标识
  sessionId?: string // 会话ID
  schoolId: string // 学校ID
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
const taskQueue: Map<string, ServerSelectionTask> = new Map()
const runningTasks: Set<string> = new Set()

// 并发限制
let maxConcurrentTasks = 5

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
  taskQueue.set(task.id, task)
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
 * 获取等待中的任务
 */
export function getPendingTasks(): ServerSelectionTask[] {
  return Array.from(taskQueue.values()).filter(
    task => task.status === 'pending' && !runningTasks.has(task.id)
  )
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
}

/**
 * 取消任务
 */
export function cancelTask(taskId: string): boolean {
  const task = taskQueue.get(taskId)
  if (!task) return false

  if (task.status === 'running') {
    runningTasks.delete(taskId)
  }

  task.status = 'cancelled'
  task.completedAt = Date.now()
  return true
}

/**
 * 删除任务
 */
export function removeTask(taskId: string): boolean {
  runningTasks.delete(taskId)
  return taskQueue.delete(taskId)
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
 * 获取任务统计信息
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
  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length
  }
}

