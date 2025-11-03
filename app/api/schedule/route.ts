import { NextRequest, NextResponse } from 'next/server'
import { getScheduleData, formatScheduleData } from '@/lib/course-api'

export async function GET(request: NextRequest) {
  try {
    console.log('📅 API: 开始获取课表数据')
    
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    
    // 从请求头获取Cookie
    const cookieHeader = request.headers.get('x-course-cookie')
    
    if (!cookieHeader) {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置',
        message: '请先在设置页面配置Cookie',
        action: 'go_to_settings'
      }, { status: 400 })
    }
    
    // 直接传递schoolId参数，不再修改服务器端状态
    const scheduleData = await getScheduleData(undefined, cookieHeader, schoolId || undefined)
    const formattedData = formatScheduleData(scheduleData)
    
    console.log(`📅 API: 课表数据获取成功，共 ${formattedData.length} 门课程`)
    
    return NextResponse.json({
      success: true,
      data: formattedData,
      raw_data: scheduleData
    })
  } catch (error: any) {
    console.error('📅 API: 获取课表数据失败:', error)
    
    if (error.message === 'Cookie未设置') {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置',
        message: '请先在设置页面配置Cookie',
        action: 'go_to_settings'
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || '获取课表数据失败',
      message: '获取课表数据时发生错误，请检查网络连接或稍后重试'
    }, { status: 500 })
  }
}
