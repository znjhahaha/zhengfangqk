import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 这里应该从实际的登录会话中获取Cookie
    // 由于我们使用的是代理方式，Cookie可能不会自动传递
    // 我们需要一个更简单的方法来获取Cookie
    
    // 尝试访问教务系统来获取Cookie
    const jwglxtInitUrl = "https://newjwc-443.webvpn.tyust.edu.cn/jwglxt/xtgl/index_initMenu.html"
    
    const response = await fetch(jwglxtInitUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })

    // 从响应头中提取Cookie
    const setCookieHeader = response.headers.get('set-cookie')
    let cookies = ''
    
    if (setCookieHeader) {
      // 解析Set-Cookie头
      const cookiePairs = setCookieHeader.split(',').map(cookie => {
        const [nameValue] = cookie.split(';')
        return nameValue.trim()
      })
      cookies = cookiePairs.join('; ')
    }

    // 如果从响应头获取不到Cookie，尝试从请求中获取
    if (!cookies) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        cookies = cookieHeader
      }
    }

    return NextResponse.json({
      success: true,
      cookies: cookies,
      message: cookies ? '成功获取Cookie' : '未获取到Cookie'
    })
  } catch (error: any) {
    console.error('获取Cookie失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取Cookie失败'
    }, { status: 500 })
  }
}
