import { NextRequest, NextResponse } from 'next/server'
import { getStudentInfo } from '@/lib/course-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const schoolId = searchParams.get('schoolId')
    
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

    // 直接传递schoolId参数，不再修改服务器端状态
    const studentInfo = await getStudentInfo(sessionId || undefined, cookieHeader, schoolId || undefined)
    
    return NextResponse.json({
      success: true,
      data: studentInfo
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '获取学生信息失败'
    }, { status: 500 })
  }
}
