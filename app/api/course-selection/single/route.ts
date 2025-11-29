import { NextRequest, NextResponse } from 'next/server'
import { selectCourseWithVerification } from '@/lib/course-api'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    // 从请求头获取Cookie
    const cookieHeader = request.headers.get('x-course-cookie')

    if (!cookieHeader) {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置'
      }, { status: 400 })
    }

    // 直接传递schoolId参数，不再修改服务器端状态
    const courseData = await request.json()

    if (!courseData || typeof courseData !== 'object') {
      return NextResponse.json({
        success: false,
        error: '课程数据格式错误'
      }, { status: 400 })
    }

    const {
      jxb_id,
      do_jxb_id,
      kch_id,
      jxbzls,
      kklxdm,
      kcmc,
      jxbmc,
      _rwlx,
      _xklc,
      _xkly,
      _xkkz_id,
      _sfkxq,
      _xkxskcgskg,
      _completeParams
    } = courseData

    if (!jxb_id || !do_jxb_id || !kch_id) {
      return NextResponse.json({
        success: false,
        error: '缺少必要的课程参数'
      }, { status: 400 })
    }

    // 使用带验证的选课功能（传入schoolId）
    // 传递获取课程列表时使用的参数，确保选课时使用相同的参数
    const result = await selectCourseWithVerification({
      jxb_id,
      do_jxb_id,
      kch_id,
      jxbzls: jxbzls || '1',
      kklxdm: kklxdm || '01', // 课程类型代码 (01=必修, 10=选修)
      kcmc: kcmc || '未知课程',
      jxbmc: jxbmc || '未知教学班',
      _rwlx,
      _xklc,
      _xkly,
      _xkkz_id,
      _sfkxq,
      _xkxskcgskg,
      _completeParams
    }, undefined, cookieHeader, schoolId || undefined)

    return NextResponse.json({
      success: result.success,
      data: result,
      message: result.message
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '选课失败'
    }, { status: 500 })
  }
}
