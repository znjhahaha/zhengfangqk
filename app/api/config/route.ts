import { NextRequest, NextResponse } from 'next/server'
import { getGlobalCookie, setGlobalCookie } from '@/lib/course-api'

export async function GET() {
  try {
    const cookie = getGlobalCookie()
    return NextResponse.json({
      success: true,
      data: {
        cookie: cookie,
        has_cookie: !!cookie
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '获取配置失败'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cookie } = body

    console.log('📝 收到保存Cookie请求，长度:', cookie?.length || 0)

    if (!cookie) {
      console.log('❌ Cookie参数为空')
      return NextResponse.json({
        success: false,
        error: '缺少cookie参数'
      }, { status: 400 })
    }

    setGlobalCookie(cookie)
    
    // 验证保存是否成功
    const savedCookie = getGlobalCookie()
    console.log('✅ Cookie保存完成，验证长度:', savedCookie.length)

    return NextResponse.json({
      success: true,
      message: '配置已保存',
      data: {
        cookie_length: savedCookie.length,
        has_cookie: !!savedCookie
      }
    })
  } catch (error) {
    console.error('❌ 保存Cookie失败:', error)
    return NextResponse.json({
      success: false,
      error: '保存配置失败'
    }, { status: 500 })
  }
}
