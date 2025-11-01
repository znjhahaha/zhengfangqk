import { NextRequest, NextResponse } from 'next/server'
import { getGrades } from '@/lib/course-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { xnm, xqm, sessionId } = body

    if (!xnm || !xqm) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '学年(xnm)和学期(xqm)参数必填'
      }, { status: 400 })
    }

    // 从请求头获取Cookie
    const cookieHeader = request.headers.get('x-course-cookie')
    
    if (!cookieHeader) {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置',
        message: '请先在系统设置页面配置您的登录Cookie',
        action: '请前往"系统设置"页面，输入您的登录Cookie后重试'
      }, { status: 400 })
    }

    try {
      const grades = await getGrades(xnm, xqm, sessionId || undefined, cookieHeader)
      
      return NextResponse.json({
        success: true,
        data: grades,
        message: `成功获取 ${grades.length} 条成绩记录`
      })
    } catch (error: any) {
      console.error('获取成绩失败:', error)
      
      // 处理Cookie过期错误
      if (error.message?.includes('Cookie已过期') || error.message?.includes('需要重新登录')) {
        return NextResponse.json({
          success: false,
          error: 'Cookie已过期',
          message: 'Cookie已过期，请重新登录',
          action: '请前往"系统设置"页面，重新输入您的登录Cookie'
        }, { status: 401 })
      }
      
      return NextResponse.json({
        success: false,
        error: error.message || '获取成绩失败',
        message: error.message || '获取成绩时发生未知错误'
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('API错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      message: error.message || '处理请求时发生错误'
    }, { status: 500 })
  }
}

