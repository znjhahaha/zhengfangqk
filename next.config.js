/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基本配置
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false, // 移除 X-Powered-By 头，提高安全性
  
  // 静态导出配置（用于打包APK）
  // 只在构建APK时启用静态导出，开发模式下禁用以支持API路由
  // 构建APK时设置环境变量: BUILD_APK=true npm run build
  ...(process.env.BUILD_APK === 'true' ? { output: 'export' } : {}),
  
  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 静态导出时需要禁用图片优化
    unoptimized: process.env.BUILD_APK === 'true',
    // 生产环境图片域名配置
    domains: process.env.NEXT_PUBLIC_IMAGE_DOMAINS?.split(',') || [],
  },
  
  // 编译器优化
  compiler: {
    // 生产环境移除console.log
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // 保留error和warn
    } : false,
  },
  
  // 实验性功能
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    // 服务器组件优化
    serverComponentsExternalPackages: ['cheerio'],
  },
  
  // 压缩配置
  compress: true,
  
  // 生产环境优化
  ...(process.env.NODE_ENV === 'production' && {
    // 启用静态页面生成优化
    generateEtags: true,
    // 优化字体加载
    optimizeFonts: true,
  }),
  
  // 输出配置
  output: process.env.BUILD_APK === 'true' ? 'export' : undefined,
  
  // 简化的webpack配置
  webpack: (config, { isServer, dev }) => {
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
    
    // 生产环境优化
    if (!dev && !isServer) {
      // 代码分割优化
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    
    return config
  },
  
  // 头部配置（安全性和性能）
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
