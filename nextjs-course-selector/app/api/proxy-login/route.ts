import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { login_url, login_data } = await request.json()
    
    if (!login_url || !login_data) {
      return NextResponse.json({
        success: false,
        error: '缺少登录参数'
      }, { status: 400 })
    }

    console.log('🔐 执行登录请求:', login_url)
    console.log('登录数据:', Object.keys(login_data))

    // 构造表单数据
    const formData = new URLSearchParams()
    Object.entries(login_data).forEach(([key, value]) => {
      formData.append(key, value as string)
    })

    const response = await fetch(login_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://sso1.tyust.edu.cn/login',
      },
      body: formData.toString(),
      redirect: 'follow'
    })

    const responseText = await response.text()
    
    console.log('登录响应状态:', response.status)
    console.log('登录响应URL:', response.url)
    console.log('响应内容长度:', responseText.length)
    
    // 检查登录是否成功
    const isSuccess = checkLoginSuccess(responseText, response.url)
    
    return NextResponse.json({
      success: isSuccess,
      status: response.status,
      url: response.url,
      message: isSuccess ? '登录成功' : '登录失败',
      responseLength: responseText.length
    })
  } catch (error: any) {
    console.error('代理登录失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '登录失败'
    }, { status: 500 })
  }
}

function checkLoginSuccess(responseText: string, responseUrl: string): boolean {
  const text = responseText.toLowerCase()
  const ssoLoginUrl = "https://sso1.tyust.edu.cn/login"
  
  console.log('检查登录状态 - 响应URL:', responseUrl)
  console.log('检查登录状态 - 响应内容前200字符:', text.substring(0, 200))
  
  // 常见的登录失败标识
  const failureIndicators = [
    '用户名或密码错误',
    'login failed',
    'authentication failed',
    'invalid credentials',
    '登录失败',
    '密码错误',
    '用户名错误',
    'error',
    '失败'
  ]

  // 检查是否有失败标识
  for (const indicator of failureIndicators) {
    if (text.includes(indicator)) {
      console.log('检测到登录失败标识:', indicator)
      return false
    }
  }

  // 检查是否重定向到了其他页面（通常表示登录成功）
  if (responseUrl !== ssoLoginUrl && !responseUrl.includes('login')) {
    console.log('检测到重定向，可能登录成功')
    return true
  }

  // 检查响应中是否包含成功标识
  const successIndicators = [
    'logout',
    '退出',
    'welcome',
    '欢迎',
    'dashboard',
    '主页面',
    'jwglxt',
    '教务管理',
    '学生信息'
  ]

  for (const indicator of successIndicators) {
    if (text.includes(indicator)) {
      console.log('检测到登录成功标识:', indicator)
      return true
    }
  }

  // 如果响应内容很长，可能是成功页面
  if (responseText.length > 10000) {
    console.log('响应内容较长，可能是成功页面')
    return true
  }

  console.log('未检测到明确的成功或失败标识')
  return false
}
