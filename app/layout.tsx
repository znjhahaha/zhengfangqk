import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'

// 优化字体加载
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
})

export const metadata: Metadata = {
  title: 'TYUST选课工具 - 现代化界面',
  description: '太原科技大学选课工具 - Next.js现代化界面',
  keywords: ['选课', 'TYUST', '太原科技大学', '课程选择'],
  authors: [{ name: 'TYUST Course Selector' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'noindex, nofollow', // 私有应用，不索引
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {children}
        </div>
        <ToastProvider />
      </body>
    </html>
  )
}
