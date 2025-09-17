// 智能选课模块 - 完全独立的Next.js实现
import { selectCourseWithVerification } from './course-api'

interface CourseData {
  jxb_id: string
  do_jxb_id: string
  kch_id: string
  jxbzls: string
  kcmc: string
  jxbmc?: string
}

interface SelectionResult {
  success: boolean
  message: string
  attempts: number
  timestamp: string
}

interface SelectionStatus {
  status: 'running' | 'completed' | 'stopped' | 'error'
  attempts: number
  success_count: number
  failed_count: number
  current_course?: string
  error?: string
  timestamp: string
}

class SmartCourseSelector {
  private isRunning = false
  private shouldStop = false
  private attemptCount = 0
  private successCount = 0
  private failCount = 0
  private currentCourse = ''
  private maxAttempts = 100
  private interval = 1000 // 1秒
  private statusCallbacks: ((status: SelectionStatus) => void)[] = []

  constructor() {
    this.reset()
  }

  // 重置状态
  reset() {
    this.isRunning = false
    this.shouldStop = false
    this.attemptCount = 0
    this.successCount = 0
    this.failCount = 0
    this.currentCourse = ''
  }

  // 设置参数
  setParams(maxAttempts: number = 100, interval: number = 1000) {
    this.maxAttempts = maxAttempts
    this.interval = interval
  }

  // 添加状态回调
  onStatusUpdate(callback: (status: SelectionStatus) => void) {
    this.statusCallbacks.push(callback)
  }

  // 触发状态更新
  private emitStatusUpdate() {
    const status: SelectionStatus = {
      status: this.isRunning ? 'running' : 'completed',
      attempts: this.attemptCount,
      success_count: this.successCount,
      failed_count: this.failCount,
      current_course: this.currentCourse,
      timestamp: new Date().toISOString()
    }

    this.statusCallbacks.forEach(callback => callback(status))
  }

  // 开始智能选课
  async startSelection(courses: CourseData[]): Promise<SelectionResult> {
    if (this.isRunning) {
      throw new Error('选课正在进行中')
    }

    this.reset()
    this.isRunning = true
    this.shouldStop = false

    try {
      for (const course of courses) {
        if (this.shouldStop) {
          break
        }

        this.currentCourse = course.kcmc
        this.emitStatusUpdate()

        const result = await this.selectCourseWithRetry(course)
        
        if (result.success) {
          this.successCount++
          console.log(`✅ 选课成功: ${course.kcmc}`)
        } else {
          this.failCount++
          console.log(`❌ 选课失败: ${course.kcmc} - ${result.message}`)
        }

        this.emitStatusUpdate()

        // 如果选课成功，可以选择继续或停止
        if (result.success) {
          // 这里可以根据需要决定是否继续选其他课程
          // break // 如果只想选一门课，可以取消注释
        }
      }

      this.isRunning = false
      this.emitStatusUpdate()

      return {
        success: this.successCount > 0,
        message: `选课完成，成功: ${this.successCount}，失败: ${this.failCount}`,
        attempts: this.attemptCount,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.isRunning = false
      this.emitStatusUpdate()

      return {
        success: false,
        message: `选课异常: ${error}`,
        attempts: this.attemptCount,
        timestamp: new Date().toISOString()
      }
    }
  }

  // 单门课程重试选课
  private async selectCourseWithRetry(course: CourseData): Promise<SelectionResult> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (this.shouldStop) {
        return {
          success: false,
          message: '选课已停止',
          attempts: this.attemptCount,
          timestamp: new Date().toISOString()
        }
      }

      this.attemptCount++
      this.emitStatusUpdate()

      try {
        const result = await this.executeSingleSelection(course)
        
        if (result.success) {
          return {
            success: true,
            message: `选课成功 (尝试${attempt}次)`,
            attempts: this.attemptCount,
            timestamp: new Date().toISOString()
          }
        }

        // 如果失败，等待间隔时间后重试
        if (attempt < this.maxAttempts) {
          await this.sleep(this.interval)
        }
      } catch (error) {
        console.error(`选课尝试${attempt}失败:`, error)
        
        if (attempt < this.maxAttempts) {
          await this.sleep(this.interval)
        }
      }
    }

    return {
      success: false,
      message: `选课失败，已尝试${this.maxAttempts}次`,
      attempts: this.attemptCount,
      timestamp: new Date().toISOString()
    }
  }

  // 执行单次选课（使用带验证的选课功能）
  private async executeSingleSelection(course: CourseData): Promise<{ success: boolean; message: string }> {
    try {
      // 使用带验证的选课功能
      const result = await selectCourseWithVerification({
        jxb_id: course.jxb_id,
        do_jxb_id: course.do_jxb_id,
        kch_id: course.kch_id,
        jxbzls: course.jxbzls,
        kcmc: course.kcmc,
        jxbmc: course.jxbmc
      })

      if (result.success) {
        return { 
          success: true, 
          message: `选课成功 - API标志: ${result.flag}, 验证: ${result.verification.verification_message}` 
        }
      } else {
        return { 
          success: false, 
          message: `选课失败 - API标志: ${result.flag}, 消息: ${result.message}, 验证: ${result.verification.verification_message}` 
        }
      }
    } catch (error) {
      return { success: false, message: `选课异常: ${error}` }
    }
  }

  // 停止选课
  stop() {
    this.shouldStop = true
    this.isRunning = false
    this.emitStatusUpdate()
  }

  // 获取当前状态
  getStatus(): SelectionStatus {
    return {
      status: this.isRunning ? 'running' : 'completed',
      attempts: this.attemptCount,
      success_count: this.successCount,
      failed_count: this.failCount,
      current_course: this.currentCourse,
      timestamp: new Date().toISOString()
    }
  }

  // 睡眠函数
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 全局选课器实例
let globalSelector: SmartCourseSelector | null = null

// 获取全局选课器
export function getGlobalSelector(): SmartCourseSelector {
  if (!globalSelector) {
    globalSelector = new SmartCourseSelector()
  }
  return globalSelector
}

// 重置全局选课器
export function resetGlobalSelector() {
  globalSelector = null
}

export { SmartCourseSelector, type CourseData, type SelectionResult, type SelectionStatus }