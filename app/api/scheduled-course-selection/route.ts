import { NextRequest, NextResponse } from 'next/server'
import {
    addTask,
    getTask,
    getUserTasks,
    startTask,
    completeTask,
    updateTaskAttempt,
    registerScheduledTaskTimer,
    cancelScheduledTaskTimer,
    ServerSelectionTask
} from '@/lib/server-course-selection-manager'
import { getAvailableCourses, selectCourseWithVerification } from '@/lib/course-api'
import { getDataDir, loadDataFromFile, saveDataToFile } from '@/lib/data-storage'
import path from 'path'
import { ActivationCode } from '@/lib/activation-code-manager'

// 强制动态渲染
export const dynamic = 'force-dynamic'

// 计算字符串相似度（Levenshtein距离）
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase()
    const s2 = str2.toLowerCase()

    // 包含匹配（权重更高）
    if (s1.includes(s2) || s2.includes(s1)) {
        return 0.9 + (Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length)) * 0.1
    }

    // Levenshtein距离
    const len1 = s1.length
    const len2 = s2.length
    const matrix: number[][] = []

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                )
            }
        }
    }

    const maxLen = Math.max(len1, len2)
    return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen
}

// 根据关键词匹配课程
function findBestMatchingCourse(courses: any[], keywords: string[]): any | null {
    if (!courses || courses.length === 0 || !keywords || keywords.length === 0) {
        return null
    }

    let bestMatch: any = null
    let bestScore = 0

    for (const course of courses) {
        const courseName = course.kcmc || course.name || ''
        let maxScore = 0

        for (const keyword of keywords) {
            const score = calculateSimilarity(courseName, keyword.trim())
            if (score > maxScore) {
                maxScore = score
            }
        }

        if (maxScore > bestScore) {
            bestScore = maxScore
            bestMatch = course
        }
    }

    // 只有相似度大于0.3才返回
    return bestScore >= 0.3 ? { course: bestMatch, score: bestScore } : null
}

// POST: 创建定时抢课任务
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, cookie, schoolId, keywords, scheduledTime, activationCode, studentInfo } = body

        // 验证必填参数
        if (!userId || !cookie || !schoolId || !keywords || !scheduledTime) {
            return NextResponse.json({
                success: false,
                error: '参数错误',
                message: '用户ID、Cookie、学校、关键词和定时时间都是必填项'
            }, { status: 400 })
        }

        // 验证关键词
        if (!Array.isArray(keywords) || keywords.length === 0) {
            return NextResponse.json({
                success: false,
                error: '参数错误',
                message: '请至少提供一个课程关键词'
            }, { status: 400 })
        }

        // 验证定时时间
        const scheduledTimestamp = Number(scheduledTime)
        if (scheduledTimestamp <= Date.now()) {
            return NextResponse.json({
                success: false,
                error: '时间错误',
                message: '定时时间必须是未来时间'
            }, { status: 400 })
        }

        const maxDelay = 24 * 60 * 60 * 1000
        if (scheduledTimestamp - Date.now() > maxDelay) {
            return NextResponse.json({
                success: false,
                error: '时间错误',
                message: '定时时间不能超过24小时'
            }, { status: 400 })
        }

        // 验证激活码（如果提供）
        if (activationCode) {
            try {
                const { validateActivationCode } = await import('@/lib/activation-code-manager')
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
                        message: '该激活码已被其他用户绑定'
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
        }

        // 检查用户是否已有正在运行的任务
        const userTasks = getUserTasks(userId)
        const runningTasks = userTasks.filter(t => t.status === 'pending' || t.status === 'running')
        if (runningTasks.length >= 3) {
            return NextResponse.json({
                success: false,
                error: '任务过多',
                message: `您已有 ${runningTasks.length} 个任务正在运行，请等待完成后再创建新任务`
            }, { status: 400 })
        }

        // 创建任务
        const taskId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const task: ServerSelectionTask = {
            id: taskId,
            userId,
            sessionId: undefined,
            schoolId,
            priority: 'normal',
            courses: [], // 初始为空，到时间再获取
            cookie,
            status: 'pending',
            createdAt: Date.now(),
            attemptCount: 0,
            maxAttempts: undefined,
            scheduledTime: scheduledTimestamp,
            // 扩展字段存储关键词信息
            metadata: {
                type: 'scheduled-keyword',
                keywords,
                studentInfo
            }
        } as any

        addTask(task)
        console.log(`⏰ 定时抢课任务已创建: ${taskId}, 用户: ${userId}, 学校: ${schoolId}, 关键词: ${keywords.join(', ')}, 定时时间: ${new Date(scheduledTimestamp).toLocaleString('zh-CN')}`)

        // 设置定时器
        const delay = scheduledTimestamp - Date.now()
        const timer = setTimeout(async () => {
            try {
                await processScheduledTask(task)
            } catch (error) {
                console.error('处理定时抢课任务失败:', error)
            }
            cancelScheduledTaskTimer(taskId)
        }, delay)

        registerScheduledTaskTimer(taskId, timer)

        return NextResponse.json({
            success: true,
            message: '定时抢课任务已创建',
            data: {
                taskId,
                scheduledTime: new Date(scheduledTimestamp).toLocaleString('zh-CN'),
                keywords,
                delay: Math.round(delay / 1000)
            }
        })
    } catch (error: any) {
        console.error('创建定时抢课任务失败:', error)
        return NextResponse.json({
            success: false,
            error: error.message || '创建任务失败'
        }, { status: 500 })
    }
}

// 处理定时抢课任务
async function processScheduledTask(task: ServerSelectionTask) {
    console.log(`🚀 开始处理定时抢课任务: ${task.id}`)

    // 启动任务
    if (!startTask(task.id)) {
        console.log(`⚠️ 任务 ${task.id} 无法启动`)
        return
    }

    const metadata = (task as any).metadata as { keywords: string[]; studentInfo: any }

    // 获取课程列表的重试次数
    const MAX_FETCH_RETRIES = 5
    const FETCH_RETRY_DELAY = 10000 // 10秒

    let courses: any[] = []
    let fetchAttempt = 0

    // 1. 获取可选课程列表（失败重试5次，每次间隔10秒）
    while (fetchAttempt < MAX_FETCH_RETRIES) {
        fetchAttempt++
        console.log(`📚 获取课程列表 (第${fetchAttempt}/${MAX_FETCH_RETRIES}次), 学校: ${task.schoolId}`)

        try {
            const result = await getAvailableCourses(
                undefined,
                task.cookie,
                task.schoolId,
                { skipCache: true }
            )

            if (result && result.length > 0) {
                courses = result
                console.log(`✅ 获取到 ${courses.length} 门课程`)
                break
            } else {
                console.log(`⚠️ 获取课程列表为空 (第${fetchAttempt}次)`)
            }
        } catch (error: any) {
            console.error(`❌ 获取课程列表失败 (第${fetchAttempt}次):`, error.message)
        }

        // 检查任务是否被取消
        const currentTask = getTask(task.id)
        if (!currentTask || currentTask.status !== 'running') {
            console.log(`⏹️ 任务 ${task.id} 已被取消`)
            return
        }

        // 未到达最大重试次数，等待10秒后重试
        if (fetchAttempt < MAX_FETCH_RETRIES) {
            console.log(`⏳ 等待 ${FETCH_RETRY_DELAY / 1000} 秒后重试获取课程列表...`)
            await new Promise(resolve => setTimeout(resolve, FETCH_RETRY_DELAY))
        }
    }

    // 如果5次都获取失败，退出任务
    if (courses.length === 0) {
        console.log(`❌ 连续 ${MAX_FETCH_RETRIES} 次获取课程列表失败，任务终止`)
        completeTask(task.id, false, `连续${MAX_FETCH_RETRIES}次获取课程列表失败`, undefined)
        return
    }

    // 2. 匹配关键词
    const match = findBestMatchingCourse(courses, metadata.keywords)
    if (!match) {
        console.log(`❌ 未找到匹配的课程, 关键词: ${metadata.keywords.join(', ')}`)
        completeTask(task.id, false, '未找到匹配的课程', undefined)
        return
    }

    const targetCourse = match.course
    console.log(`🎯 匹配到课程: ${targetCourse.kcmc}, 相似度: ${(match.score * 100).toFixed(1)}%`)

    // 3. 开始抢课循环（无限重试直到成功）
    while (true) {
        const currentTask = getTask(task.id)
        if (!currentTask || currentTask.status !== 'running') {
            console.log(`⏹️ 任务 ${task.id} 已停止`)
            break
        }

        try {
            const result = await selectCourseWithVerification(
                {
                    kch_id: targetCourse.kch_id || targetCourse.kch,
                    jxb_id: targetCourse.jxb_id || targetCourse.kxh,
                    do_jxb_id: targetCourse.do_jxb_id || targetCourse.jxb_id,
                    jxbzls: targetCourse.jxbzls || '1',
                    kklxdm: targetCourse.kklxdm || '01',
                    kcmc: targetCourse.kcmc,
                    jxbmc: targetCourse.jxbmc,
                    _rwlx: targetCourse._rwlx,
                    _xklc: targetCourse._xklc,
                    _xkly: targetCourse._xkly,
                    _xkkz_id: targetCourse._xkkz_id,
                    _sfkxq: targetCourse._sfkxq,
                    _xkxskcgskg: targetCourse._xkxskcgskg,
                    _completeParams: targetCourse._completeParams
                },
                undefined,
                task.cookie,
                task.schoolId
            )

            const isSuccess = result.success || (result.data && result.data.flag === '1')

            if (isSuccess) {
                console.log(`✅ 定时抢课成功: ${targetCourse.kcmc}`)
                completeTask(task.id, true, '抢课成功', targetCourse, result.data)
                return
            } else {
                // flag=0 表示选课失败，继续重试
                updateTaskAttempt(task.id)
                const taskAfterAttempt = getTask(task.id)
                console.log(`⚠️ 选课失败（第${taskAfterAttempt?.attemptCount || 0}次）: ${result.message || result.data?.msg || '未知错误'}，1秒后继续尝试...`)
            }
        } catch (error: any) {
            updateTaskAttempt(task.id)
            const taskAfterAttempt = getTask(task.id)
            console.error(`❌ 抢课请求异常（第${taskAfterAttempt?.attemptCount || 0}次）:`, error.message, '，1秒后继续尝试...')
        }

        // 等待1秒后重试选课
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
}

// GET: 获取定时抢课任务状态
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const taskId = searchParams.get('taskId')

        if (taskId) {
            const task = getTask(taskId)
            if (!task) {
                return NextResponse.json({
                    success: false,
                    error: '任务不存在'
                }, { status: 404 })
            }

            return NextResponse.json({
                success: true,
                data: task
            })
        }

        if (userId) {
            const tasks = getUserTasks(userId)
            const scheduledTasks = tasks.filter((t: any) => t.metadata?.type === 'scheduled-keyword')

            return NextResponse.json({
                success: true,
                data: scheduledTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            })
        }

        return NextResponse.json({
            success: false,
            error: '需要提供userId或taskId'
        }, { status: 400 })
    } catch (error: any) {
        console.error('获取定时任务失败:', error)
        return NextResponse.json({
            success: false,
            error: error.message || '获取任务失败'
        }, { status: 500 })
    }
}
