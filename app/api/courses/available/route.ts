import { NextRequest, NextResponse } from 'next/server'
import { getAvailableCourses } from '@/lib/course-api'

export async function GET(request: NextRequest) {
  try {
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

    const courses = await getAvailableCourses(undefined, cookieHeader)
    
    return NextResponse.json({
      success: true,
      data: courses
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '获取可选课程失败'
    }, { status: 500 })
  }
}
