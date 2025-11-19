/** @type {import('next').NextConfig} */
const nextConfig = {
  // API服务器专用配置，不导出静态文件
  output: undefined,
  
  // 只保留API路由，不渲染页面
  async rewrites() {
    return []
  },
  
  // 禁用图片优化（API服务器不需要）
  images: {
    unoptimized: true,
  },
  
  // 允许CORS（用于APK访问）
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-admin-token, x-course-cookie' },
        ],
      },
    ]
  },
  
  // 环境变量
  env: {
    CUSTOM_KEY: 'mobile-api-server',
  },
}

module.exports = nextConfig

