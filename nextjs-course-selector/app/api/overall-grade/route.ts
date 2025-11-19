import { NextRequest, NextResponse } from 'next/server'
import { getOverallGrades } from '@/lib/course-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, schoolId } = body

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
      // 直接传递schoolId参数，不再修改服务器端状态
      const result = await getOverallGrades(sessionId || undefined, cookieHeader, schoolId || undefined)
      
      return NextResponse.json({
        success: true,
        data: result.grades,
        gpa: result.gpa,
        message: `成功获取 ${result.grades.length} 条总体成绩记录${result.gpa ? `，总体GPA: ${result.gpa}` : ''}`
      })
    } catch (error: any) {
      console.error('获取总体成绩失败:', error)
      
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
        error: error.message || '获取总体成绩失败',
        message: error.message || '获取总体成绩时发生未知错误'
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

