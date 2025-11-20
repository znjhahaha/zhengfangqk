// EdgeOne Pages Functions 入口文件
// 此文件用于 EdgeOne Pages 的边缘函数

/**
 * EdgeOne Pages Worker 入口
 * 如果不需要边缘函数功能，可以返回空响应
 */
export default {
  async fetch(request) {
    // 默认处理：返回空响应或重定向到主页面
    // 如果需要自定义处理逻辑，可以在这里添加
    
    const url = new URL(request.url)
    
    // 示例：处理特定路径
    if (url.pathname.startsWith('/api/edge/')) {
      return new Response('EdgeOne Pages Function', {
        headers: { 'content-type': 'text/plain' }
      })
    }
    
    // 默认：让请求继续到 Next.js 应用
    return new Response(null, {
      status: 404
    })
  }
}

