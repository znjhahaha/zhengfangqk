import { NextRequest, NextResponse } from 'next/server'
import { selectCourseWithVerification } from '@/lib/course-api'

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取Cookie
    const cookieHeader = request.headers.get('x-course-cookie')
    
    if (!cookieHeader) {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置'
      }, { status: 400 })
    }

    const body = await request.json()
    const { courses, batchSize = 3, delay = 500 } = body
    
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json({
        success: false,
        error: '课程列表不能为空'
      }, { status: 400 })
    }

    console.log(`🚀 开始批量抢课，共${courses.length}门课程，批次大小: ${batchSize}`)
    
    interface CourseResult {
      success: boolean
      courseKey: string
      courseName: string
      message?: string
      error?: string
      data?: any
    }
    
    const results: CourseResult[] = []
    let successCount = 0
    let failCount = 0

    // 分批处理课程，避免服务器压力
    for (let i = 0; i < courses.length; i += batchSize) {
      const batch = courses.slice(i, i + batchSize)
      console.log(`📦 处理第${Math.floor(i / batchSize) + 1}批，共${batch.length}门课程`)
      
      // 并发处理当前批次
      const batchPromises = batch.map(async (course: any) => {
        const { jxb_id, do_jxb_id, kch_id, jxbzls, kklxdm, kcmc, jxbmc } = course
        
        if (!jxb_id || !do_jxb_id || !kch_id) {
          return {
            success: false,
            courseKey: `${kch_id}_${jxb_id}`,
            courseName: kcmc || '未知课程',
            error: '缺少必要的课程参数'
          }
        }

        try {
          const result = await selectCourseWithVerification({
            jxb_id,
            do_jxb_id,
            kch_id,
            jxbzls: jxbzls || '1',
            kklxdm: kklxdm || '01',
            kcmc: kcmc || '未知课程',
            jxbmc: jxbmc || '未知教学班'
          }, undefined, cookieHeader)

          return {
            success: result.success,
            courseKey: `${kch_id}_${jxb_id}`,
            courseName: kcmc || '未知课程',
            message: result.message,
            data: result
          }
        } catch (error: any) {
          return {
            success: false,
            courseKey: `${kch_id}_${jxb_id}`,
            courseName: kcmc || '未知课程',
            error: error.message || '抢课失败'
          }
        }
      })

      // 等待当前批次完成
      const batchResults = await Promise.allSettled(batchPromises)
      
      // 处理批次结果
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
          if (result.value.success) {
            successCount++
            console.log(`✅ 课程 "${result.value.courseName}" 抢课成功`)
          } else {
            failCount++
            console.log(`❌ 课程 "${result.value.courseName}" 抢课失败: ${result.value.error || result.value.message}`)
          }
        } else {
          failCount++
          console.log(`❌ 抢课异常: ${result.reason}`)
          results.push({
            success: false,
            courseKey: 'unknown',
            courseName: '未知课程',
            error: result.reason
          })
        }
      })

      // 批次间延迟，避免请求过于频繁
      if (i + batchSize < courses.length) {
        console.log(`⏳ 等待${delay}ms后处理下一批...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    console.log(`🎉 批量抢课完成！成功: ${successCount}门，失败: ${failCount}门`)

    return NextResponse.json({
      success: true,
      data: {
        total: courses.length,
        success: successCount,
        failed: failCount,
        results: results
      },
      message: `批量抢课完成！成功: ${successCount}门，失败: ${failCount}门`
    })
  } catch (error: any) {
    console.error('❌ 批量抢课API异常:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '批量抢课失败'
    }, { status: 500 })
  }
}
