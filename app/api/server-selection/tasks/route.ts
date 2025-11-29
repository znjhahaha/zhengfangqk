import { NextRequest, NextResponse } from 'next/server'
import {
  addTask,
  getTask,
  getUserTasks,
  getAllTasks,
  cancelTask,
  getTaskStats,
  startTask,
  ServerSelectionTask
} from '@/lib/server-course-selection-manager'
import { selectCourseWithVerification } from '@/lib/course-api'
import { getCurrentSchool } from '@/lib/global-school-state'
import { getDataDir, loadDataFromFile } from '@/lib/data-storage'
import path from 'path'
import { ActivationCode } from '@/lib/activation-code-manager'

// POST: 提交服务器端抢课任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, sessionId, schoolId, courses, cookie, activationCode, scheduledTime } = body

    // 验证激活码（优化：直接调用函数而不是HTTP请求）
    if (activationCode) {
      try {
        const { validateActivationCode } = await import('@/lib/activation-code-manager')
        const { loadDataFromFile, getDataDir, saveDataToFile } = await import('@/lib/data-storage')
        const dataDir = await getDataDir()
        const activationCodesFile = path.join(dataDir, 'activation-codes.json')
        const activationRecordsFile = path.join(dataDir, 'activation-records.json')

        const trimmedCode = activationCode.trim().replace(/\s+/g, '')
        const codes = await loadDataFromFile<ActivationCode>(activationCodesFile, 'activationCodes', [])
        const records = await loadDataFromFile<any>(activationRecordsFile, 'activationRecords', [])

        const activationCodeObj = codes.find(c => c.code === trimmedCode || c.code === activationCode)
        if (!activationCodeObj) {
          return NextResponse.json({
            success: false,
            error: '激活码无效',
            message: '激活码不存在'
          }, { status: 401 })
        }

        const validation = validateActivationCode(trimmedCode, activationCodeObj, userId)
        if (!validation.valid) {
          return NextResponse.json({
            success: false,
            error: '激活码无效',
            message: validation.message || '激活码验证失败'
          }, { status: 401 })
        }

        // 检查是否已被其他用户绑定
        const existingRecordForCode = records.find((r: any) => r.code === activationCodeObj.code && r.userId !== userId)
        if (existingRecordForCode && existingRecordForCode.expiresAt > Date.now()) {
          return NextResponse.json({
            success: false,
            error: '激活码已被绑定',
            message: '该激活码已被其他用户绑定，无法重复绑定'
          }, { status: 400 })
        }
      } catch (error: any) {
        console.error('激活码验证失败:', error)
        return NextResponse.json({
          success: false,
          error: '激活码验证失败',
          message: error.message || '验证过程出错'
        }, { status: 500 })
      }
    } else {
      // 检查用户是否已激活（优化：直接调用函数而不是HTTP请求）
      try {
        const { loadDataFromFile, getDataDir } = await import('@/lib/data-storage')
        const dataDir = await getDataDir()
        const activationRecordsFile = path.join(dataDir, 'activation-records.json')
        const activationCodesFile = path.join(dataDir, 'activation-codes.json')

        const records = await loadDataFromFile<any>(activationRecordsFile, 'activationRecords', [])
        const userRecord = records.find((r: any) => r.userId === userId && r.expiresAt > Date.now())

        if (!userRecord) {
          return NextResponse.json({
            success: false,
            error: '未激活',
            message: '请先激活服务器端抢课功能'
          }, { status: 401 })
        }

        // 检查课程数限制
        const codes = await loadDataFromFile<ActivationCode>(activationCodesFile, 'activationCodes', [])
        const activationCode = codes.find(c => c.code === userRecord.code)

        if (activationCode && activationCode.maxCourses !== undefined) {
          const maxCourses = activationCode.maxCourses
          const usedCourses = activationCode.usedCourses || 0
          const requestedCourses = courses.length

          if (usedCourses + requestedCourses > maxCourses) {
            return NextResponse.json({
              success: false,
              error: '课程数超限',
              message: `激活码可抢课程数不足。已使用 ${usedCourses}/${maxCourses}，本次请求 ${requestedCourses} 门课程`
            }, { status: 400 })
          }
        }
      } catch (error: any) {
        console.error('检查激活状态失败:', error)
        return NextResponse.json({
          success: false,
          error: '检查激活状态失败',
          message: error.message || '检查过程出错'
        }, { status: 500 })
      }

      // 检查该激活码是否已经有正在运行的抢课任务（一个激活码只能有一个抢课进程）
      const { getUserTasks } = await import('@/lib/server-course-selection-manager')
      const userTasks = getUserTasks(userId)
      const runningTasks = userTasks.filter(t => t.status === 'pending' || t.status === 'running')

      if (runningTasks.length > 0) {
        return NextResponse.json({
          success: false,
          error: '已有任务运行中',
          message: `该激活码已有 ${runningTasks.length} 个任务正在运行，请等待完成或取消后再提交新任务`
        }, { status: 400 })
      }
    }

    if (!userId || !courses || !Array.isArray(courses) || courses.length === 0 || !cookie) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '用户ID、课程列表和Cookie不能为空'
      }, { status: 400 })
    }

    // 创建任务
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 确定任务优先级：定时任务为 normal，立即执行的任务为 high（用户主动触发）
    const priority: 'high' | 'normal' | 'low' = scheduledTime ? 'normal' : 'high'

    const task: ServerSelectionTask = {
      id: taskId,
      userId,
      sessionId,
      schoolId: schoolId || getCurrentSchool().id, // 如果没提供schoolId，使用默认学校（但应该从客户端传入）
      priority, // 添加优先级
      courses: courses.map((c: any) => ({
        kch: c.kch || c.kch_id,
        kxh: c.kxh || c.jxb_id,
        name: c.name || c.kcmc,
        // 保存完整的课程数据，包括选课所需的参数
        jxb_id: c.jxb_id || c.kxh,
        do_jxb_id: c.do_jxb_id || c.jxb_id || c.kxh,
        kch_id: c.kch_id || c.kch,
        jxbzls: c.jxbzls || '1',
        kklxdm: c.kklxdm || '01',
        kcmc: c.kcmc || c.name,
        jxbmc: c.jxbmc || c.jsxm,
        _rwlx: c._rwlx,
        _xklc: c._xklc,
        _xkly: c._xkly,
        _xkkz_id: c._xkkz_id,
        ...c // 保留其他所有属性
      })),
      cookie, // 使用用户自己的Cookie，确保用户隔离
      status: 'pending',
      createdAt: Date.now(),
      attemptCount: 0,
      maxAttempts: undefined, // 设为undefined表示无限重试直到成功
      scheduledTime: scheduledTime ? Number(scheduledTime) : undefined // 定时执行时间
    }

    addTask(task)
    console.log(`✅ 任务已创建: ${taskId}, 用户: ${userId}, 学校: ${task.schoolId}, Cookie长度: ${cookie.length}${task.scheduledTime ? `, 定时时间: ${new Date(task.scheduledTime).toLocaleString('zh-CN')}` : ''}`)

    // 如果有定时时间，等待到指定时间再启动；否则立即启动
    if (task.scheduledTime && task.scheduledTime > Date.now()) {
      const delay = task.scheduledTime - Date.now()
      // 限制最大延迟时间（不超过24小时）
      const maxDelay = 24 * 60 * 60 * 1000
      if (delay > maxDelay) {
        return NextResponse.json({
          success: false,
          error: '定时时间超出限制',
          message: '定时时间不能超过24小时'
        }, { status: 400 })
      }

      console.log(`⏰ 任务 ${taskId} 将在 ${Math.round(delay / 1000)} 秒后启动`)
      const timer = setTimeout(() => {
        processTask(task).catch(error => {
          console.error('处理任务失败:', error)
        })
        // 清理定时器引用
        const { cancelScheduledTaskTimer } = require('@/lib/server-course-selection-manager')
        cancelScheduledTaskTimer(taskId)
      }, delay)

      // 注册定时器，以便可以取消
      const { registerScheduledTaskTimer } = require('@/lib/server-course-selection-manager')
      registerScheduledTaskTimer(taskId, timer)
    } else {
      // 启动任务处理（异步，不阻塞响应）
      processTask(task).catch(error => {
        console.error('处理任务失败:', error)
      })
    }

    return NextResponse.json({
      success: true,
      message: '任务已提交',
      data: {
        taskId: task.id,
        status: task.status
      }
    })
  } catch (error: any) {
    console.error('提交任务失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '提交任务失败'
    }, { status: 500 })
  }
}

// GET: 获取任务信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const userId = searchParams.get('userId')
    const adminToken = request.headers.get('x-admin-token')
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'

    if (taskId) {
      // 获取单个任务
      const task = getTask(taskId)
      if (!task) {
        return NextResponse.json({
          success: false,
          error: '任务不存在'
        }, { status: 404 })
      }

      // 检查权限
      if (task.userId !== userId && (!adminToken || adminToken !== validToken)) {
        return NextResponse.json({
          success: false,
          error: '未授权',
          message: '无权访问该任务'
        }, { status: 403 })
      }

      return NextResponse.json({
        success: true,
        data: task
      })
    }

    if (userId) {
      // 获取用户的所有任务（优化：限制返回数量，避免内存问题）
      const tasks = getUserTasks(userId)
      // 只返回最近100个任务，按创建时间倒序
      const sortedTasks = tasks
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 100)

      return NextResponse.json({
        success: true,
        data: sortedTasks,
        total: tasks.length,
        returned: sortedTasks.length
      })
    }

    // 管理员获取所有任务
    if (adminToken && adminToken === validToken) {
      const stats = getTaskStats()
      const tasks = getAllTasks()
      return NextResponse.json({
        success: true,
        data: tasks,
        stats
      })
    }

    return NextResponse.json({
      success: false,
      error: '参数错误',
      message: '需要提供taskId或userId，或管理员权限'
    }, { status: 400 })
  } catch (error: any) {
    console.error('获取任务失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取任务失败'
    }, { status: 500 })
  }
}

// DELETE: 取消任务
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, userId } = body

    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '任务ID不能为空'
      }, { status: 400 })
    }

    const task = getTask(taskId)
    if (!task) {
      return NextResponse.json({
        success: false,
        error: '任务不存在'
      }, { status: 404 })
    }

    // 检查权限
    const adminToken = request.headers.get('x-admin-token')
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'

    if (task.userId !== userId && (!adminToken || adminToken !== validToken)) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '无权取消该任务'
      }, { status: 403 })
    }

    const cancelled = cancelTask(taskId)
    if (!cancelled) {
      return NextResponse.json({
        success: false,
        error: '取消任务失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '任务已取消'
    })
  } catch (error: any) {
    console.error('取消任务失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '取消任务失败'
    }, { status: 500 })
  }
}

// 处理任务（异步执行抢课）
async function processTask(task: ServerSelectionTask) {
  const { completeTask, updateTaskAttempt } = await import('@/lib/server-course-selection-manager')

  // 尝试启动任务
  if (!startTask(task.id)) {
    console.log(`⚠️ 任务 ${task.id} 无法启动（可能达到并发限制）`)
    return
  }

  console.log(`🚀 开始处理任务 ${task.id}`)

  // 循环尝试抢课（失败后间隔1秒重试，直到成功）
  while (true) {
    // 检查任务状态
    const currentTask = getTask(task.id)
    if (!currentTask || currentTask.status !== 'running') {
      console.log(`⏹️ 任务 ${task.id} 已停止，状态: ${currentTask?.status || '不存在'}`)
      break
    }

    // 检查是否达到最大尝试次数（如果设置了的话）
    if (currentTask.maxAttempts && currentTask.attemptCount >= currentTask.maxAttempts) {
      console.log(`⛔ 任务 ${task.id} 达到最大尝试次数 ${currentTask.maxAttempts}，停止尝试`)
      completeTask(task.id, false, '达到最大尝试次数', undefined)
      break
    }

    try {
      // 遍历所有课程，每个课程都尝试抢课
      for (const course of task.courses) {
        // 再次检查任务状态（可能在循环过程中被取消）
        const checkTask = getTask(task.id)
        if (!checkTask || checkTask.status !== 'running') {
          console.log(`⏹️ 任务 ${task.id} 在循环中被停止`)
          break
        }

        // 调用抢课API - 使用任务中的用户Cookie和学校ID，确保用户隔离
        // 注意：每个任务使用自己的cookie和schoolId，不会使用服务器默认值，确保用户隔离
        try {
          const result = await selectCourseWithVerification(
            {
              kch_id: course.kch_id || course.kch,
              jxb_id: course.jxb_id || course.kxh,
              do_jxb_id: course.do_jxb_id || course.jxb_id || course.kxh,
              jxbzls: course.jxbzls || '1',
              kklxdm: course.kklxdm || '01',
              kcmc: course.kcmc || course.name,
              jxbmc: course.jxbmc || course.jsxm,
              // 传递获取课程列表时使用的参数，确保选课时使用相同的参数
              _rwlx: course._rwlx,
              _xklc: course._xklc,
              _xkly: course._xkly,
              _xkkz_id: course._xkkz_id,
              _sfkxq: course._sfkxq,
              _xkxskcgskg: course._xkxskcgskg,
              _completeParams: course._completeParams
            },
            task.sessionId,      // 使用任务的sessionId（如果有）
            task.cookie,         // 使用任务的Cookie（用户自己的Cookie，确保用户隔离）
            task.schoolId        // 使用任务的schoolId（用户自己的schoolId，确保用户隔离）
          )

          // 检查结果：flag=1 表示成功
          const isSuccess = result.success || (result.data && result.data.flag === '1')

          if (isSuccess) {
            completeTask(task.id, true, result.message || '抢课成功 (flag=1)', course, result.data)
            console.log(`✅ 任务 ${task.id} 成功：${course.kch}-${course.kxh}，flag=${result.data?.flag || 'N/A'}`)

            // 更新激活码的已使用课程数
            try {
              const { getDataDir, loadDataFromFile, saveDataToFile } = await import('@/lib/data-storage')
              const dataDir = await getDataDir()
              const activationCodesFile = path.join(dataDir, 'activation-codes.json')
              const activationRecordsFile = path.join(dataDir, 'activation-records.json')

              // 加载激活记录找到用户对应的激活码
              const records = await loadDataFromFile<any>(activationRecordsFile, 'activationRecords', [])
              const userRecord = records.find((r: any) => r.userId === task.userId && r.expiresAt > Date.now())

              if (userRecord) {
                const codes = await loadDataFromFile<ActivationCode>(activationCodesFile, 'activationCodes', [])
                const activationCode = codes.find(c => c.code === userRecord.code)

                if (activationCode) {
                  if (activationCode.usedCourses === undefined) {
                    activationCode.usedCourses = 0
                  }
                  activationCode.usedCourses++
                  await saveDataToFile(activationCodesFile, 'activationCodes', codes, dataDir)
                  console.log(`✅ 更新激活码 ${activationCode.code} 已使用课程数: ${activationCode.usedCourses}`)
                }
              }
            } catch (error) {
              console.error('更新激活码课程数失败:', error)
            }

            return // 成功，退出整个函数
          } else {
            // 失败，记录尝试次数，继续重试
            updateTaskAttempt(task.id)
            const taskAfterAttempt = getTask(task.id)
            console.log(`⚠️ 任务 ${task.id} 尝试失败（第${taskAfterAttempt?.attemptCount || 0}次）：${course.kch}-${course.kxh}，${result.message || '未知错误'}，1秒后重试...`)
          }
        } catch (error: any) {
          // 请求失败，记录尝试次数，继续重试
          updateTaskAttempt(task.id)
          const taskAfterAttempt = getTask(task.id)
          console.error(`❌ 任务 ${task.id} 请求异常（第${taskAfterAttempt?.attemptCount || 0}次）：${course.kch}-${course.kxh}`, error.message, '，1秒后重试...')
        }

        // 等待1秒后重试（失败后间隔1秒再次尝试）
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error: any) {
      console.error(`❌ 任务 ${task.id} 执行错误:`, error)
      // 继续尝试，等待2秒后继续
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

