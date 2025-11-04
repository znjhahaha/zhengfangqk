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
    const { userId, sessionId, schoolId, courses, cookie, activationCode } = body

    // 验证激活码
    if (activationCode) {
      const verifyResponse = await fetch(`${request.nextUrl.origin}/api/activation/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activationCode, userId })
      })
      
      const verifyResult = await verifyResponse.json()
      if (!verifyResult.success || !verifyResult.activated) {
        return NextResponse.json({
          success: false,
          error: '激活码无效',
          message: verifyResult.message || '激活码验证失败'
        }, { status: 401 })
      }
    } else {
      // 检查用户是否已激活
      const checkResponse = await fetch(`${request.nextUrl.origin}/api/activation/verify?userId=${userId}`)
      const checkResult = await checkResponse.json()
      
      if (!checkResult.success || !checkResult.activated) {
        return NextResponse.json({
          success: false,
          error: '未激活',
          message: '请先激活服务器端抢课功能'
        }, { status: 401 })
      }

      // 检查课程数限制
      if (checkResult.data?.maxCourses !== undefined) {
        const maxCourses = checkResult.data.maxCourses
        const usedCourses = checkResult.data.usedCourses || 0
        const requestedCourses = courses.length

        if (usedCourses + requestedCourses > maxCourses) {
          return NextResponse.json({
            success: false,
            error: '课程数超限',
            message: `激活码可抢课程数不足。已使用 ${usedCourses}/${maxCourses}，本次请求 ${requestedCourses} 门课程`
          }, { status: 400 })
        }
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
    const task: ServerSelectionTask = {
      id: taskId,
      userId,
      sessionId,
      schoolId: schoolId || getCurrentSchool().id, // 如果没提供schoolId，使用默认学校（但应该从客户端传入）
      courses: courses.map((c: any) => ({
        kch: c.kch,
        kxh: c.kxh,
        name: c.name
      })),
      cookie, // 使用用户自己的Cookie，确保用户隔离
      status: 'pending',
      createdAt: Date.now(),
      attemptCount: 0,
      maxAttempts: 1000 // 默认最大尝试次数
    }

    addTask(task)
    console.log(`✅ 任务已创建: ${taskId}, 用户: ${userId}, 学校: ${task.schoolId}, Cookie长度: ${cookie.length}`)

    // 启动任务处理（异步，不阻塞响应）
    processTask(task).catch(error => {
      console.error('处理任务失败:', error)
    })

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
      // 获取用户的所有任务
      const tasks = getUserTasks(userId)
      return NextResponse.json({
        success: true,
        data: tasks
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

  // 循环尝试抢课
  while (task.status === 'running') {
    try {
      for (const course of task.courses) {
        const currentTask = getTask(task.id)
        if (!currentTask || currentTask.status !== 'running') break

        // 调用抢课API - 使用任务中的用户Cookie和学校ID，确保用户隔离
        // 注意：每个任务使用自己的cookie和schoolId，不会使用服务器默认值，确保用户隔离
        try {
          const result = await selectCourseWithVerification(
            {
              kch_id: course.kch,
              jxb_id: course.kxh,
              do_jxb_id: course.kxh,
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
            
            return
          }
        } catch (error: any) {
          console.error(`❌ 任务 ${task.id} 抢课错误:`, error)
        }

        // 等待一段时间再尝试
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error: any) {
      console.error(`❌ 任务 ${task.id} 执行错误:`, error)
      // 继续尝试，不立即失败
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // 检查是否超过最大尝试次数
    const currentTask = getTask(task.id)
    if (!currentTask || currentTask.status !== 'running') {
      break
    }
  }

  // 如果任务仍在运行但未成功，标记为失败
  const finalTask = getTask(task.id)
  if (finalTask && finalTask.status === 'running') {
    completeTask(task.id, false, '达到最大尝试次数或任务超时', undefined)
  }
}

