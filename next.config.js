/** @type {import('next').NextConfig} */
const nextConfig = {
  // 性能优化配置
  swcMinify: true,
  compress: true,
  
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
    esmExternals: 'loose',
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // 解决undici模块解析问题
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // 忽略undici的某些模块
    config.externals = config.externals || []
    config.externals.push({
      'undici': 'commonjs undici'
    })
    
    // 生产环境优化
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
            },
            lucide: {
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              name: 'lucide',
              chunks: 'all',
            },
          },
        },
      }
    }
    
    return config
  },
  
  // 输出配置
  output: 'standalone',
  
  // 移除不需要的rewrites
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/python/:path*',
  //       destination: 'http://localhost:5000/:path*',
  //     },
  //   ]
  // },
}

module.exports = nextConfig
