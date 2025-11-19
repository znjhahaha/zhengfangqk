import { NextRequest, NextResponse } from 'next/server'
import { getSelectedCourses, formatSelectedCoursesData } from '@/lib/course-api'

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

    console.log('🔍 API路由：开始获取已选课程...')
    const rawData = await getSelectedCourses(undefined, cookieHeader)
    console.log('📊 API路由：已选课程原始数据:', rawData)
    
    // 使用格式化函数处理数据
    const formattedData = formatSelectedCoursesData(rawData)
    console.log('📊 API路由：已选课程格式化数据:', formattedData)
    
    return NextResponse.json({
      success: true,
      data: formattedData
    })
  } catch (error: any) {
    console.error('❌ API路由：获取已选课程失败:', error)
    
    // 处理特殊状态码
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
      error: error.message || '获取已选课程失败'
    }, { status: 500 })
  }
}
