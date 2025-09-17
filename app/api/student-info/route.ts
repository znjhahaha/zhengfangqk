import { NextResponse } from 'next/server'
import { getStudentInfo, getGlobalCookie } from '@/lib/course-api'

export async function GET() {
  try {
    const cookie = getGlobalCookie()
    if (!cookie) {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置',
        message: '请先在系统设置页面配置您的登录Cookie',
        action: '请前往"系统设置"页面，输入您的登录Cookie后重试'
      }, { status: 400 })
    }

    const studentInfo = await getStudentInfo()
    
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
