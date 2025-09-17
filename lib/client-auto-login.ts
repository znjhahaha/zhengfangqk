/**
 * 客户端自动登录模块
 * 在浏览器环境中执行自动登录
 */

interface AutoLoginResult {
  success: boolean
  cookies?: string
  error?: string
}

export class ClientAutoLoginManager {
  private ssoLoginUrl = "https://sso1.tyust.edu.cn/login"
  private jwglxtBaseUrl = "https://newjwc-443.webvpn.tyust.edu.cn"
  private jwglxtInitUrl = "https://newjwc-443.webvpn.tyust.edu.cn/jwglxt/xtgl/index_initMenu.html"

  /**
   * 获取SSO登录页面
   */
  private async getLoginPage(): Promise<string> {
    try {
      console.log("🔍 正在获取SSO登录页面...")
      
      // 首先尝试获取实际登录页面
      const response = await fetch('/api/get-actual-login-page', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '获取登录页面失败')
      }

      console.log("✅ 成功获取登录页面")
      if (data.isMock) {
        console.log("⚠️ 使用模拟登录表单")
      }
      return data.html
    } catch (error) {
      console.error("❌ 获取登录页面失败:", error)
      throw error
    }
  }

  /**
   * 解析登录表单
   */
  private parseLoginForm(htmlContent: string): any {
    console.log("🔍 开始解析登录表单...")
    console.log("HTML内容长度:", htmlContent.length)
    console.log("HTML内容前200字符:", htmlContent.substring(0, 200))
    
    try {
      // 使用正则表达式解析HTML表单
      const formMatch = htmlContent.match(/<form[^>]*action=["']([^"']*)["'][^>]*>([\s\S]*?)<\/form>/i)
      if (!formMatch) {
        // 如果没有找到表单，使用默认值
        console.log("⚠️ 未找到登录表单，使用默认配置")
        return {
          login_url: this.ssoLoginUrl,
          username_field: 'username',
          password_field: 'password',
          hidden_fields: {}
        }
      }

      const action = formMatch[1]
      const formContent = formMatch[2]
      
      // 构造登录URL
      const loginUrl = action.startsWith('http') ? action : new URL(action, this.ssoLoginUrl).href

      // 提取隐藏字段
      const hiddenFields: Record<string, string> = {}
      const hiddenInputRegex = /<input[^>]*type=["']hidden["'][^>]*name=["']([^"']*)["'][^>]*value=["']([^"']*)["'][^>]*>/gi
      let match
      while ((match = hiddenInputRegex.exec(formContent)) !== null) {
        hiddenFields[match[1]] = match[2]
      }

      // 查找用户名和密码输入框
      const usernameMatch = formContent.match(/<input[^>]*name=["']([^"']*(?:username|user|account)[^"']*)["'][^>]*>/i)
      const passwordMatch = formContent.match(/<input[^>]*type=["']password["'][^>]*name=["']([^"']*)["'][^>]*>/i)
      
      // 如果没有找到密码字段的name属性，尝试其他方式
      let passwordField = 'password' // 默认值
      if (passwordMatch) {
        passwordField = passwordMatch[1]
      } else {
        // 查找type="password"的输入框，即使没有name属性
        const passwordInputMatch = formContent.match(/<input[^>]*type=["']password["'][^>]*>/i)
        if (passwordInputMatch) {
          // 尝试从输入框中提取name属性
          const nameMatch = passwordInputMatch[0].match(/name=["']([^"']*)["']/)
          if (nameMatch) {
            passwordField = nameMatch[1]
          } else {
            // 如果没有name属性，使用默认值
            passwordField = 'password'
          }
        }
      }

      // 如果找不到特定的字段名，使用默认值
      const usernameField = usernameMatch ? usernameMatch[1] : 'username'

      console.log("✅ 成功解析登录表单")
      console.log("   登录URL:", loginUrl)
      console.log("   用户名字段:", usernameField)
      console.log("   密码字段:", passwordField)
      console.log("   隐藏字段:", hiddenFields)

      return {
        login_url: loginUrl,
        username_field: usernameField,
        password_field: passwordField,
        hidden_fields: hiddenFields
      }
    } catch (error) {
      console.error("❌ 解析登录表单失败:", error)
      // 返回默认配置而不是抛出错误
      return {
        login_url: this.ssoLoginUrl,
        username_field: 'username',
        password_field: 'password',
        hidden_fields: {}
      }
    }
  }

  /**
   * 执行登录操作
   */
  private async performLogin(username: string, password: string): Promise<boolean> {
    try {
      // 获取登录页面
      const loginPageHtml = await this.getLoginPage()
      
      // 解析登录表单
      const formData = this.parseLoginForm(loginPageHtml)
      
      // 构造登录数据
      const loginData = new URLSearchParams()
      Object.entries(formData.hidden_fields).forEach(([key, value]) => {
        loginData.append(key, String(value))
      })
      loginData.append(formData.username_field, username)
      loginData.append(formData.password_field, password)

      console.log("🔐 正在执行登录...")

      // 发送登录请求
      const response = await fetch('/api/proxy-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_url: formData.login_url,
          login_data: Object.fromEntries(loginData.entries())
        })
      })

      const result = await response.json()
      console.log("登录响应状态码:", response.status)
      console.log("登录结果:", result)

      // 检查登录是否成功
      return result.success || false
    } catch (error) {
      console.error("❌ 登录过程出错:", error)
      return false
    }
  }

  /**
   * 检查登录是否成功
   */
  private async checkLoginSuccess(response: Response): Promise<boolean> {
    try {
      const responseText = (await response.text()).toLowerCase()
      
      // 常见的登录失败标识
      const failureIndicators = [
        '用户名或密码错误',
        'login failed',
        'authentication failed',
        'invalid credentials',
        '登录失败',
        '密码错误',
        '用户名错误'
      ]

      // 检查是否有失败标识
      for (const indicator of failureIndicators) {
        if (responseText.includes(indicator)) {
          console.error("检测到登录失败标识:", indicator)
          return false
        }
      }

      // 检查是否重定向到了其他页面（通常表示登录成功）
      if (response.url !== this.ssoLoginUrl) {
        console.log("登录后重定向到:", response.url)
        return true
      }

      // 检查响应中是否包含成功标识
      const successIndicators = [
        'logout',
        '退出',
        'welcome',
        '欢迎',
        'dashboard',
        '主页面'
      ]

      for (const indicator of successIndicators) {
        if (responseText.includes(indicator)) {
          console.log("检测到登录成功标识:", indicator)
          return true
        }
      }

      return false
    } catch (error) {
      console.error("检查登录状态时出错:", error)
      return false
    }
  }

  /**
   * 导航到教务系统
   */
  private async navigateToJwglxt(): Promise<boolean> {
    try {
      console.log("🎯 正在导航到教务系统...")

      // 使用代理API访问教务系统
      const response = await fetch('/api/proxy-jwglxt', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      console.log("教务系统响应状态码:", response.status)
      console.log("教务系统访问结果:", result)

      // 检查是否成功访问教务系统
      return result.success || false
    } catch (error) {
      console.error("❌ 导航到教务系统失败:", error)
      return false
    }
  }

  /**
   * 检查是否成功访问教务系统
   */
  private async checkJwglxtAccess(response: Response): Promise<boolean> {
    try {
      const responseText = (await response.text()).toLowerCase()
      
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
        if (responseText.includes(indicator)) {
          console.log("检测到教务系统标识:", indicator)
          return true
        }
      }

      // 检查URL是否包含教务系统域名
      if (response.url.includes('newjwc') || response.url.includes('jwglxt')) {
        console.log("URL包含教务系统域名")
        return true
      }

      return false
    } catch (error) {
      console.error("检查教务系统访问状态时出错:", error)
      return false
    }
  }

  /**
   * 获取Cookie字符串
   */
  private async getCookiesString(): Promise<string> {
    try {
      // 通过代理API获取Cookie
      const response = await fetch('/api/get-cookies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      if (result.success && result.cookies) {
        return result.cookies
      }
      return ''
    } catch (error) {
      console.error("获取Cookie失败:", error)
      return ''
    }
  }

  /**
   * 完整的自动登录流程
   */
  async autoLogin(username: string, password: string): Promise<AutoLoginResult> {
    try {
      console.log("🚀 开始自动登录流程...")
      console.log("用户名:", username)

      // 步骤1: SSO登录
      const loginSuccess = await this.performLogin(username, password)
      if (!loginSuccess) {
        return {
          success: false,
          error: "SSO登录失败，请检查用户名和密码"
        }
      }

      // 步骤2: 导航到教务系统
      const navigationSuccess = await this.navigateToJwglxt()
      if (!navigationSuccess) {
        return {
          success: false,
          error: "无法访问教务系统"
        }
      }

      // 步骤3: 获取Cookie
      const cookies = await this.getCookiesString()
      if (cookies) {
        console.log("✅ 自动登录完成！获取到Cookie")
        return {
          success: true,
          cookies: cookies
        }
      } else {
        return {
          success: false,
          error: "未能获取到有效的Cookie"
        }
      }
    } catch (error) {
      console.error("❌ 自动登录流程失败:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误"
      }
    }
  }
}

// 导出单例实例
export const clientAutoLoginManager = new ClientAutoLoginManager()

// 导出便捷函数
export async function performClientAutoLogin(username: string, password: string): Promise<AutoLoginResult> {
  return clientAutoLoginManager.autoLogin(username, password)
}
