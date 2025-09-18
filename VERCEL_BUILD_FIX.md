# Vercel 部署构建错误修复指南

## 问题描述

在Vercel部署时遇到以下错误：
- `Error occurred prerendering page "/404"`
- `Error occurred prerendering page "/500"`
- `Cannot find module 'critters'`
- `TypeError: t is not a constructor`

## 解决方案

### 1. 移除critters依赖
```bash
npm uninstall critters
```

### 2. 修复viewport元数据警告
在 `app/layout.tsx` 中：
```typescript
// 修改前
export const metadata: Metadata = {
  // ... 其他配置
  viewport: 'width=device-width, initial-scale=1',
}

// 修改后
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  // ... 其他配置（移除viewport）
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}
```

### 3. 简化Next.js配置
在 `next.config.js` 中移除复杂的webpack配置，只保留必要的：

```javascript
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
```

### 4. 创建自定义错误页面
创建以下文件来解决404和500错误：

#### `app/not-found.tsx`
```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <span className="text-4xl">404</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            页面未找到
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            抱歉，您访问的页面不存在或已被移动。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            请检查URL是否正确，或返回首页继续浏览。
          </div>
          <div className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="javascript:history.back()">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回上页
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### `app/error.tsx`
```typescript
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            出现错误
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            应用程序遇到了意外错误，请稍后重试。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
              <div className="text-sm text-red-800 dark:text-red-200">
                <strong>错误信息:</strong> {error.message}
              </div>
              {error.digest && (
                <div className="text-xs text-red-600 dark:text-red-300 mt-1">
                  错误ID: {error.digest}
                </div>
              )}
            </div>
          )}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            如果问题持续存在，请联系技术支持。
          </div>
          <div className="flex flex-col space-y-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### `app/global-error.tsx`
```typescript
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                系统错误
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                应用程序遇到了严重错误，请刷新页面重试。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <strong>错误信息:</strong> {error.message}
                  </div>
                  {error.digest && (
                    <div className="text-xs text-red-600 dark:text-red-300 mt-1">
                      错误ID: {error.digest}
                    </div>
                  )}
                </div>
              )}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                如果问题持续存在，请联系技术支持。
              </div>
              <div className="flex flex-col space-y-2">
                <Button onClick={reset} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  刷新页面
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  返回首页
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
```

## 验证修复

运行以下命令验证构建成功：
```bash
npm run build
```

应该看到：
```
✓ Creating an optimized production build    
✓ Compiled successfully
✓ Linting and checking validity of types    
✓ Collecting page data    
✓ Generating static pages (17/17)
✓ Collecting build traces    
✓ Finalizing page optimization
```

## 部署到Vercel

现在可以成功部署到Vercel了：

1. 将代码推送到GitHub仓库
2. 在Vercel中导入项目
3. 部署应该成功完成

## 注意事项

- 移除了复杂的webpack配置，只保留必要的
- 排除了undici模块以避免语法错误
- 创建了自定义错误页面来处理404和500错误
- 修复了viewport元数据警告
- 简化了Next.js配置以提高兼容性
