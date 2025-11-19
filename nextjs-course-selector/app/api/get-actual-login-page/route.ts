import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 尝试直接访问可能的登录页面URL
    const possibleUrls = [
      "https://sso1.tyust.edu.cn/login",
      "https://sso1.tyust.edu.cn/login?service=https://newjwc-443.webvpn.tyust.edu.cn/jwglxt/xtgl/index_initMenu.html",
      "https://sso1.tyust.edu.cn/login?service=https://newjwc.tyust.edu.cn/jwglxt/xtgl/index_initMenu.html"
    ]
    
    for (const url of possibleUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          },
          redirect: 'follow'
        })

        if (response.ok) {
          const html = await response.text()
          
          // 检查是否包含登录表单
          if (html.includes('<form') && (html.includes('username') || html.includes('password'))) {
            return NextResponse.json({
              success: true,
              html: html,
              url: response.url
            })
          }
        }
      } catch (error) {
        console.log(`尝试URL ${url} 失败:`, error)
        continue
      }
    }
    
    // 如果所有URL都失败，返回一个模拟的登录表单（基于真实表单结构）
    const mockLoginForm = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>登录</title>
      </head>
      <body>
        <form method="post" action="https://sso1.tyust.edu.cn/login">
          <input type="hidden" name="lt" value="mock_lt_value">
          <input type="hidden" name="execution" value="mock_execution_value">
          <input type="hidden" name="_eventId" value="submit">
          <input _ngcontent-ohr-c300="" trim="" autocomplete="new-password" maxlength="200" nz-input="" name="username" class="ant-input ng-valid ng-star-inserted ng-dirty ng-touched" placeholder="请输入学工号">
          <input _ngcontent-ohr-c300="" trim="" libnochinese="" autocomplete="new-password" maxlength="200" nz-input="" class="ant-input ng-valid ng-star-inserted ng-dirty ng-touched" type="password" placeholder="请输入密码">
          <button type="submit">登录</button>
        </form>
      </body>
      </html>
    `
    
    return NextResponse.json({
      success: true,
      html: mockLoginForm,
      url: "https://sso1.tyust.edu.cn/login",
      isMock: true
    })
  } catch (error: any) {
    console.error('获取实际登录页面失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取登录页面失败'
    }, { status: 500 })
  }
}
