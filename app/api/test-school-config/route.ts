import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 模拟客户端环境来获取学校配置
    const { getCurrentSchool, getApiUrls } = require('@/lib/global-school-state')
    
    // 获取当前学校配置
    const currentSchool = getCurrentSchool()
    const urls = getApiUrls()
    
    return NextResponse.json({
      success: true,
      currentSchool: {
        id: currentSchool.id,
        name: currentSchool.name,
        domain: currentSchool.domain,
        protocol: currentSchool.protocol
      },
      urls: {
        studentInfo: urls.studentInfo,
        courseSelectionParams: urls.courseSelectionParams,
        availableCourses: urls.availableCourses,
        scheduleData: urls.scheduleData
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('测试学校配置失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}