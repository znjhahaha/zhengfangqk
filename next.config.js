/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基本配置
  swcMinify: true,
  
  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
