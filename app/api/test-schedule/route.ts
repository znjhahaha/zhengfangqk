import { NextRequest, NextResponse } from 'next/server'
import { getScheduleData, formatScheduleData } from '@/lib/course-api'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 测试课表API...')
    
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const cookie = searchParams.get('cookie')
    
    if (!cookie) {
      return NextResponse.json({
        success: false,
        error: '缺少Cookie参数',
        message: '请提供Cookie参数进行测试'
      }, { status: 400 })
    }
    
    // 如果提供了学校ID，先更新学校配置
    if (schoolId) {
      const { updateSchoolConfig } = require('@/lib/course-api')
      updateSchoolConfig(schoolId)
    }
    
    console.log('🧪 开始测试课表数据获取...')
    const scheduleData = await getScheduleData(undefined, cookie)
    console.log('🧪 原始课表数据:', scheduleData)
    
    const formattedData = formatScheduleData(scheduleData)
    console.log('🧪 格式化后数据:', formattedData)
    
    return NextResponse.json({
      success: true,
      message: '课表API测试成功',
      data: {
        raw_data: scheduleData,
        formatted_data: formattedData,
        formatted_count: formattedData.length,
        has_kbList: !!scheduleData?.kbList,
        kbList_length: scheduleData?.kbList?.length || 0
      }
    })
  } catch (error: any) {
    console.error('🧪 课表API测试失败:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || '课表API测试失败',
      message: '课表API测试过程中发生错误'
    }, { status: 500 })
  }
}

