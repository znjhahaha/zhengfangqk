import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取Cookie
    const cookieHeader = request.headers.get('x-course-cookie')
    
    return NextResponse.json({
      success: true,
      data: {
        cookie: cookieHeader || '',
        has_cookie: !!cookieHeader
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

    console.log('📝 收到验证Cookie请求，长度:', cookie?.length || 0)

    if (!cookie) {
      console.log('❌ Cookie参数为空')
      return NextResponse.json({
        success: false,
        error: '缺少cookie参数'
      }, { status: 400 })
    }

    // 不再存储Cookie到服务器，只验证格式
    const isValidFormat = cookie.includes('JSESSIONID') || cookie.includes('SESSION')
    
    console.log('✅ Cookie格式验证完成:', isValidFormat)

    return NextResponse.json({
      success: true,
      message: 'Cookie验证完成',
      data: {
        cookie_length: cookie.length,
        has_cookie: true,
        valid_format: isValidFormat
      }
    })
  } catch (error) {
    console.error('❌ 验证Cookie失败:', error)
    return NextResponse.json({
      success: false,
      error: '验证配置失败'
    }, { status: 500 })
  }
}
