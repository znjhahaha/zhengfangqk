import { NextRequest, NextResponse } from 'next/server'
import { getMaxConcurrentTasks, setMaxConcurrentTasks, getTaskStats } from '@/lib/server-course-selection-manager'

// 强制动态渲染（避免静态导出问题）
export const dynamic = 'force-dynamic'

// GET: 获取服务器端抢课配置
export async function GET(request: NextRequest) {
  try {
    const adminToken = request.headers.get('x-admin-token')
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'
    
    if (!adminToken || adminToken !== validToken) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '需要管理员权限'
      }, { status: 401 })
    }

    const stats = getTaskStats()
    const maxConcurrent = getMaxConcurrentTasks()

    return NextResponse.json({
      success: true,
      data: {
        maxConcurrentTasks: maxConcurrent,
        stats
      }
    })
  } catch (error: any) {
    console.error('获取配置失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取配置失败'
    }, { status: 500 })
  }
}

// POST: 更新服务器端抢课配置
export async function POST(request: NextRequest) {
  try {
    const adminToken = request.headers.get('x-admin-token')
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'
    
    if (!adminToken || adminToken !== validToken) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '需要管理员权限'
      }, { status: 401 })
    }

    const body = await request.json()
    const { maxConcurrentTasks } = body

    if (maxConcurrentTasks !== undefined) {
      if (typeof maxConcurrentTasks !== 'number' || maxConcurrentTasks < 1) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '最大并发任务数必须大于0'
        }, { status: 400 })
      }

      setMaxConcurrentTasks(maxConcurrentTasks)
    }

    return NextResponse.json({
      success: true,
      message: '配置已更新',
      data: {
        maxConcurrentTasks: getMaxConcurrentTasks()
      }
    })
  } catch (error: any) {
    console.error('更新配置失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '更新配置失败'
    }, { status: 500 })
  }
}

