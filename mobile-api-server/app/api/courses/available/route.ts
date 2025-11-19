import { NextRequest, NextResponse } from 'next/server'
import { getAvailableCourses } from '@/lib/course-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const forceRefreshParam = searchParams.get('forceRefresh')
    const forceRefresh = forceRefreshParam === '1' || forceRefreshParam === 'true'
    
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

    // 预加载URL配置到缓存（确保服务器端能获取到新添加的学校配置）
    if (schoolId) {
      try {
        const { getApiUrlsAsync } = await import('@/lib/global-school-state')
        await getApiUrlsAsync(schoolId)
      } catch (error) {
        console.warn('预加载URL配置失败，继续使用默认配置:', error)
      }
    }

    // 直接传递schoolId参数，不再修改服务器端状态
    const courses = await getAvailableCourses(
      undefined,
      cookieHeader,
      schoolId || undefined,
      { skipCache: forceRefresh }
    )
    
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
