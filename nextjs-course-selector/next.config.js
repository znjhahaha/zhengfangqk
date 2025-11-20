/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基本配置
  swcMinify: true,
  
  // 静态导出配置（用于打包APK和EdgeOne Pages）
  // 只在构建APK或EdgeOne Pages时启用静态导出，开发模式下禁用以支持API路由
  // 构建APK时设置环境变量: BUILD_APK=true npm run build
  // EdgeOne Pages 构建时会自动启用静态导出
  ...(process.env.BUILD_APK === 'true' || process.env.EDGEONE === 'true' ? { output: 'export' } : {}),
  
  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 静态导出时需要禁用图片优化
    unoptimized: process.env.BUILD_APK === 'true' || process.env.EDGEONE === 'true',
  },
  
  // 编译器优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 实验性功能
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // 简化的webpack配置
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        undici: false,
      }
    }
    
    // 完全排除undici模块
    config.externals = config.externals || []
    if (Array.isArray(config.externals)) {
      config.externals.push('undici')
    } else {
      config.externals = [config.externals, 'undici']
    }
    
    return config
  },
}

module.exports = nextConfig
