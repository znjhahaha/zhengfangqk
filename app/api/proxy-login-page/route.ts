import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const ssoLoginUrl = "https://sso1.tyust.edu.cn/login"
    
    const response = await fetch(ssoLoginUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow' // 跟随重定向
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }, { status: response.status })
    }

    const html = await response.text()
    const finalUrl = response.url
    
    // 检查是否是重定向页面
    if (html.includes('sso_redirect') || html.includes('统一身份认证平台')) {
      // 这是一个重定向页面，需要等待JavaScript执行
      return NextResponse.json({
        success: true,
        html: html,
        isRedirectPage: true,
        finalUrl: finalUrl
      })
    }
    
    return NextResponse.json({
      success: true,
      html: html,
      isRedirectPage: false,
      finalUrl: finalUrl
    })
  } catch (error: any) {
    console.error('代理获取登录页面失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取登录页面失败'
    }, { status: 500 })
  }
}
