import { NextRequest, NextResponse } from 'next/server'
import { updateSchoolConfig, getCurrentSchoolInfo } from '@/lib/course-api'

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await request.json()
    
    if (!schoolId) {
      return NextResponse.json({ 
        success: false, 
        error: '学校ID不能为空' 
      }, { status: 400 })
    }

    // 更新学校配置
    updateSchoolConfig(schoolId)
    
    // 获取当前学校信息
    const currentSchool = getCurrentSchoolInfo()
    
    return NextResponse.json({
      success: true,
      data: {
        school: currentSchool,
        message: `已切换到 ${currentSchool.name}`
      }
    })
  } catch (error: any) {
    console.error('❌ 学校切换失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '学校切换失败'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const currentSchool = getCurrentSchoolInfo()
    
    return NextResponse.json({
      success: true,
      data: {
        school: currentSchool
      }
    })
  } catch (error: any) {
    console.error('❌ 获取当前学校信息失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取学校信息失败'
    }, { status: 500 })
  }
}
