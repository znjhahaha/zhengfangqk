'use client'

import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage?: number
  cacheHitRate?: number
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 只在开发环境显示性能监控
    if (process.env.NODE_ENV !== 'development') return

    const startTime = performance.now()
    
    // 监控页面加载时间
    const handleLoad = () => {
      const loadTime = performance.now() - startTime
      
      // 获取内存使用情况（如果支持）
      const memoryInfo = (performance as any).memory
      
      setMetrics({
        loadTime: Math.round(loadTime),
        renderTime: Math.round(performance.now() - startTime),
        memoryUsage: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : undefined
      })
    }

    // 监听页面加载完成
    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
    }

    // 键盘快捷键显示/隐藏性能监控
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    return () => {
      window.removeEventListener('load', handleLoad)
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  if (!isVisible || !metrics) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="mb-2 font-bold">性能监控 (Ctrl+Shift+P)</div>
      <div>加载时间: {metrics.loadTime}ms</div>
      <div>渲染时间: {metrics.renderTime}ms</div>
      {metrics.memoryUsage && (
        <div>内存使用: {metrics.memoryUsage}MB</div>
      )}
    </div>
  )
}
