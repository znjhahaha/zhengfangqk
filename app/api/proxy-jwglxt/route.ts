import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const jwglxtInitUrl = "https://newjwc-443.webvpn.tyust.edu.cn/jwglxt/xtgl/index_initMenu.html"
    
    const response = await fetch(jwglxtInitUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow'
    })

    const responseText = await response.text()
    
    // 检查是否成功访问教务系统
    const isSuccess = checkJwglxtAccess(responseText, response.url)
    
    return NextResponse.json({
      success: isSuccess,
      status: response.status,
      url: response.url,
      message: isSuccess ? '成功访问教务系统' : '无法访问教务系统'
    })
  } catch (error: any) {
    console.error('代理访问教务系统失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '访问教务系统失败'
    }, { status: 500 })
  }
}

function checkJwglxtAccess(responseText: string, responseUrl: string): boolean {
  const text = responseText.toLowerCase()
  
  // 检查是否包含教务系统的标识
  const jwglxtIndicators = [
    'jwglxt',
    '教务管理',
    '学生信息',
    '课程信息',
    '选课系统',
    'index_initmenu'
  ]

  for (const indicator of jwglxtIndicators) {
    if (text.includes(indicator)) {
      return true
    }
  }

  // 检查URL是否包含教务系统域名
  if (responseUrl.includes('newjwc') || responseUrl.includes('jwglxt')) {
    return true
  }

  return false
}
