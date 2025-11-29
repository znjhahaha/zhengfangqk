import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'
import { SpeedInsights } from '@vercel/speed-insights/next'

// 优化字体加载
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
})

export const metadata: Metadata = {
  title: '正方教务工具 - 现代化界面',
  description: '正方教务工具 - Next.js现代化界面',
  keywords: ['选课', '正方教务', '教务系统', '课程选择'],
  authors: [{ name: '正方教务工具' }],
  robots: 'noindex, nofollow', // 私有应用，不索引
  manifest: '/manifest.json', // PWA支持
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 relative overflow-hidden">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent animate-pulse-slow"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent animate-pulse-slow" style={{ animationDelay: '1s' }}></div>

          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]"></div>

          {children}
        </div>
        <ToastProvider />
        <SpeedInsights />
      </body>
    </html>
  )
}
