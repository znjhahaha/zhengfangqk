/**
 * 浏览器自动化脚本 - 基于51CTO教程的DOM操作方式
 * 直接在浏览器中执行，避免CORS和代理问题
 */

interface AutomationResult {
  success: boolean
  message: string
  cookies?: string
}

export class BrowserAutomation {
  private ssoLoginUrl = "https://sso1.tyust.edu.cn/login"
  private jwglxtInitUrl = "https://newjwc-443.webvpn.tyust.edu.cn/jwglxt/xtgl/index_initMenu.html"

  /**
   * 生成自动登录脚本
   */
  generateLoginScript(username: string, password: string): string {
    return `
      (function() {
        console.log('🚀 开始执行自动登录脚本...');
        
        // 等待页面加载完成
        function waitForElement(selector, timeout = 10000) {
          return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function check() {
              const element = document.querySelector(selector);
              if (element) {
                resolve(element);
              } else if (Date.now() - startTime > timeout) {
                reject(new Error('元素未找到: ' + selector));
              } else {
                setTimeout(check, 100);
              }
            }
            
            check();
          });
        }
        
        // 调试函数 - 显示所有表单元素
        function debugFormElements() {
          console.log('🔍 调试页面表单元素...');
          
          // 显示所有input元素
          const inputs = document.querySelectorAll('input');
          console.log('所有input元素:', inputs.length);
          inputs.forEach((input, index) => {
            console.log(\`Input \${index}:\`, {
              type: input.type,
              name: input.name,
              id: input.id,
              className: input.className,
              placeholder: input.placeholder,
              value: input.value
            });
          });
          
          // 显示所有button元素
          const buttons = document.querySelectorAll('button');
          console.log('所有button元素:', buttons.length);
          buttons.forEach((button, index) => {
            console.log(\`Button \${index}:\`, {
              type: button.type,
              className: button.className,
              textContent: button.textContent?.trim(),
              innerHTML: button.innerHTML
            });
          });
          
          // 显示所有form元素
          const forms = document.querySelectorAll('form');
          console.log('所有form元素:', forms.length);
          forms.forEach((form, index) => {
            console.log(\`Form \${index}:\`, {
              action: form.action,
              method: form.method,
              className: form.className
            });
          });
        }
        
        // 自动填写表单
        async function autoFillForm() {
          try {
            console.log('🔍 查找登录表单元素...');
            
            // 先调试页面元素
            debugFormElements();
            
            // 等待用户名输入框 - 根据实际HTML结构
            const usernameInput = await waitForElement('input[name="username"]');
            console.log('✅ 找到用户名输入框:', usernameInput);
            
            // 填写用户名
            usernameInput.value = '${username}';
            usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
            usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
            usernameInput.dispatchEvent(new Event('blur', { bubbles: true }));
            console.log('✅ 用户名填写完成:', usernameInput.value);
            
            // 等待密码输入框 - 根据实际HTML结构
            const passwordInput = await waitForElement('input[type="password"]');
            console.log('✅ 找到密码输入框:', passwordInput);
            
            // 填写密码
            passwordInput.value = '${password}';
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('blur', { bubbles: true }));
            console.log('✅ 密码填写完成');
            
            // 等待一下让表单验证完成
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 查找并点击登录按钮 - 使用更智能的方式
            let loginButton = null;
            
            // 尝试多种方式查找登录按钮
            const buttonSelectors = [
              'button[type="submit"]',
              'input[type="submit"]',
              '.ant-btn-primary',
              'button.ant-btn-primary',
              'button[class*="login"]',
              'button[class*="submit"]'
            ];
            
            for (const selector of buttonSelectors) {
              try {
                loginButton = await waitForElement(selector, 2000);
                if (loginButton) {
                  console.log('✅ 通过选择器找到登录按钮:', selector, loginButton);
                  break;
                }
              } catch (e) {
                // 继续尝试下一个选择器
              }
            }
            
            // 如果还没找到，尝试通过文本内容查找
            if (!loginButton) {
              const allButtons = document.querySelectorAll('button');
              for (const button of allButtons) {
                const text = button.textContent?.toLowerCase() || '';
                if (text.includes('登录') || text.includes('登陆') || text.includes('login')) {
                  loginButton = button;
                  console.log('✅ 通过文本内容找到登录按钮:', button);
                  break;
                }
              }
            }
            
            if (!loginButton) {
              throw new Error('未找到登录按钮');
            }
            
            // 点击登录按钮
            loginButton.click();
            console.log('✅ 登录按钮已点击');
            
            return { success: true, message: '表单填写完成，正在登录...' };
            
          } catch (error) {
            console.error('❌ 自动填写失败:', error);
            return { success: false, message: error.message };
          }
        }
        
        // 执行自动填写
        autoFillForm().then(result => {
          console.log('自动登录结果:', result);
          
          // 将结果发送回父窗口
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'AUTO_LOGIN_RESULT',
              data: result
            }, '*');
          }
        }).catch(error => {
          console.error('自动登录异常:', error);
          
          // 发送错误结果
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'AUTO_LOGIN_RESULT',
              data: {
                success: false,
                message: error.message || '自动登录异常'
              }
            }, '*');
          }
        });
        
      })();
    `;
  }

  /**
   * 生成Cookie获取脚本
   */
  generateCookieScript(): string {
    return `
      (function() {
        console.log('🍪 获取Cookie...');
        
        const cookies = document.cookie;
        console.log('获取到的Cookie:', cookies);
        
        // 将结果发送回父窗口
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'COOKIE_RESULT',
            data: {
              success: true,
              cookies: cookies
            }
          }, '*');
        }
        
        return cookies;
      })();
    `;
  }

  /**
   * 生成页面状态检查脚本
   */
  generateStatusCheckScript(): string {
    return `
      (function() {
        console.log('🔍 检查页面状态...');
        
        const currentUrl = window.location.href;
        const pageTitle = document.title;
        const bodyText = document.body.innerText.toLowerCase();
        
        let status = 'unknown';
        let message = '';
        
        // 检查是否在登录页面
        if (currentUrl.includes('login') || bodyText.includes('登录') || bodyText.includes('用户名') || bodyText.includes('学工号')) {
          status = 'login_page';
          message = '当前在登录页面';
        }
        // 检查是否在教务系统
        else if (currentUrl.includes('jwglxt') || bodyText.includes('教务管理') || bodyText.includes('学生信息') || bodyText.includes('教学管理')) {
          status = 'jwglxt_page';
          message = '已成功进入教务系统';
        }
        // 检查是否有错误信息
        else if (bodyText.includes('错误') || bodyText.includes('失败') || bodyText.includes('error') || bodyText.includes('用户名或密码错误')) {
          status = 'error';
          message = '检测到错误信息';
        }
        // 检查是否在重定向页面
        else if (bodyText.includes('正在跳转') || bodyText.includes('redirect') || bodyText.includes('跳转')) {
          status = 'redirecting';
          message = '页面正在跳转中';
        }
        
        console.log('页面状态:', status, message);
        
        // 将结果发送回父窗口
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'STATUS_CHECK_RESULT',
            data: {
              success: true,
              status: status,
              message: message,
              url: currentUrl,
              title: pageTitle
            }
          }, '*');
        }
        
        return { status, message, url: currentUrl, title: pageTitle };
      })();
    `;
  }

  /**
   * 创建自动化窗口
   */
  createAutomationWindow(username: string, password: string): Promise<AutomationResult> {
    return new Promise((resolve, reject) => {
      // 创建新窗口
      const automationWindow = window.open(
        this.ssoLoginUrl,
        'autoLogin',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );

      if (!automationWindow) {
        reject(new Error('无法打开新窗口，请检查浏览器弹窗设置'));
        return;
      }

      let isResolved = false;

      // 监听来自自动化窗口的消息
      const messageHandler = (event: MessageEvent) => {
        if (event.source !== automationWindow) return;

        const { type, data } = event.data;

        switch (type) {
          case 'AUTO_LOGIN_RESULT':
            console.log('自动登录结果:', data);
            if (data.success) {
              // 等待页面跳转后获取Cookie
              setTimeout(() => {
                this.executeScript(automationWindow, this.generateCookieScript());
              }, 3000);
            } else {
              if (!isResolved) {
                isResolved = true;
                window.removeEventListener('message', messageHandler);
                automationWindow.close();
                resolve({ success: false, message: data.message });
              }
            }
            break;

          case 'COOKIE_RESULT':
            console.log('Cookie获取结果:', data);
            if (!isResolved) {
              isResolved = true;
              window.removeEventListener('message', messageHandler);
              automationWindow.close();
              resolve({
                success: true,
                message: '自动登录成功',
                cookies: data.cookies
              });
            }
            break;

          case 'STATUS_CHECK_RESULT':
            console.log('状态检查结果:', data);
            break;
        }
      };

      window.addEventListener('message', messageHandler);

      // 等待窗口加载完成后执行脚本
      automationWindow.addEventListener('load', () => {
        console.log('🔄 窗口加载完成，开始执行自动化脚本...');
        
        // 等待更长时间确保页面完全加载
        setTimeout(() => {
          console.log('🔍 检查页面状态...');
          // 先检查页面状态
          this.executeScript(automationWindow, this.generateStatusCheckScript());
          
          // 等待更长时间再执行自动登录
          setTimeout(() => {
            console.log('🚀 开始执行自动登录脚本...');
            this.executeScript(automationWindow, this.generateLoginScript(username, password));
          }, 3000);
        }, 5000);
      });

      // 设置超时
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          window.removeEventListener('message', messageHandler);
          automationWindow.close();
          resolve({ success: false, message: '操作超时' });
        }
      }, 30000);
    });
  }

  /**
   * 在指定窗口中执行脚本
   */
  private executeScript(targetWindow: Window, script: string): void {
    try {
      (targetWindow as any).eval(script);
    } catch (error) {
      console.error('执行脚本失败:', error);
    }
  }

  /**
   * 执行自动登录
   */
  async performAutoLogin(username: string, password: string): Promise<AutomationResult> {
    try {
      console.log('🚀 开始浏览器自动化登录...');
      
      const result = await this.createAutomationWindow(username, password);
      
      if (result.success && result.cookies) {
        console.log('✅ 自动登录成功，获取到Cookie');
        return result;
      } else {
        console.error('❌ 自动登录失败:', result.message);
        return result;
      }
    } catch (error: any) {
      console.error('❌ 自动化登录异常:', error);
      return {
        success: false,
        message: error.message || '自动化登录失败'
      };
    }
  }
}

// 导出单例实例
export const browserAutomation = new BrowserAutomation();

// 导出便捷函数
export async function performBrowserAutoLogin(username: string, password: string): Promise<AutomationResult> {
  return browserAutomation.performAutoLogin(username, password);
}
