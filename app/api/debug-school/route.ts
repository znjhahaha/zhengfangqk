import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSchool, SUPPORTED_SCHOOLS } from '@/lib/school-config'
import { getUrlConfig } from '@/lib/url-config'

export async function GET() {
  try {
    const currentSchool = getCurrentSchool()
    const urlConfig = getUrlConfig()
    
    return NextResponse.json({
      success: true,
      data: {
        currentSchool: {
          id: currentSchool.id,
          name: currentSchool.name,
          domain: currentSchool.domain,
          protocol: currentSchool.protocol
        },
        urlConfig: {
          baseUrl: urlConfig.baseUrl,
          domain: urlConfig.domain,
          courseSelectionIndexUrl: urlConfig.courseSelectionIndexUrl
        },
        allSchools: SUPPORTED_SCHOOLS.map(school => ({
          id: school.id,
          name: school.name,
          domain: school.domain,
          protocol: school.protocol
        }))
      }
    })
  } catch (error: any) {
    console.error('❌ 调试学校配置失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '调试失败'
    }, { status: 500 })
  }
}
