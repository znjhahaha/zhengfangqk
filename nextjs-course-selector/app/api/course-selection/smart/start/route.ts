import { NextRequest, NextResponse } from 'next/server'
import { getGlobalSelector } from '@/lib/smart-course-selector'
import { getGlobalCookie } from '@/lib/course-api'

export async function POST(request: NextRequest) {
  try {
    const cookie = getGlobalCookie()
    if (!cookie) {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置'
      }, { status: 400 })
    }

    const body = await request.json()
    const { courses, max_attempts = 100, interval = 1000 } = body

    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json({
        success: false,
        error: '课程列表不能为空'
      }, { status: 400 })
    }

    const selector = getGlobalSelector()
    selector.setParams(max_attempts, interval)

    // 在后台启动选课
    const threadId = `selection_${Date.now()}`
    
    // 异步执行选课，不等待结果
    selector.startSelection(courses).then(result => {
      console.log('智能选课完成:', result)
    }).catch(error => {
      console.error('智能选课失败:', error)
    })

    return NextResponse.json({
      success: true,
      thread_id: threadId,
      message: '智能选课已启动'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '启动智能选课失败'
    }, { status: 500 })
  }
}
