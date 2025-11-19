'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'error' | 'success'
  priority: 'low' | 'normal' | 'high'
  createdAt: number
  expiresAt?: number
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const response = await fetch('/api/admin/announcements?activeOnly=true')
        const result = await response.json()
        if (result.success && result.data) {
          setAnnouncements(result.data)
        }
      } catch (error) {
        console.warn('加载公告失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnnouncements()

    // 定期更新公告（每5分钟）
    const interval = setInterval(loadAnnouncements, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // 从localStorage读取已关闭的公告ID
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dismissed-announcements')
      if (saved) {
        setDismissedIds(new Set(JSON.parse(saved)))
      }
    } catch (error) {
      console.warn('读取已关闭公告失败:', error)
    }
  }, [])

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => {
      const newSet = new Set(Array.from(prev).concat([id]))
      try {
        localStorage.setItem('dismissed-announcements', JSON.stringify(Array.from(newSet)))
      } catch (error) {
        console.warn('保存已关闭公告失败:', error)
      }
      return newSet
    })
  }

  // 过滤已关闭和已过期的公告
  const activeAnnouncements = announcements.filter(a => {
    if (dismissedIds.has(a.id)) return false
    if (a.expiresAt && a.expiresAt < Date.now()) return false
    return true
  })

  if (isLoading || activeAnnouncements.length === 0) {
    return null
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
      case 'error':
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
      default:
        return <Info className="h-4 w-4 sm:h-5 sm:w-5" />
    }
  }

  const getColors = (type: string, priority: string) => {
    const baseColors = {
      info: 'from-blue-500/20 to-blue-600/20 border-blue-500/50 text-blue-100',
      success: 'from-green-500/20 to-green-600/20 border-green-500/50 text-green-100',
      warning: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50 text-yellow-100',
      error: 'from-red-500/20 to-red-600/20 border-red-500/50 text-red-100'
    }

    const priorityStyles = {
      high: 'border-2 shadow-lg shadow-red-500/20',
      normal: 'border',
      low: 'border border-dashed'
    }

    return `${baseColors[type as keyof typeof baseColors]} ${priorityStyles[priority as keyof typeof priorityStyles]}`
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        <AnimatePresence>
          {activeAnnouncements.slice(0, 3).map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className={`pointer-events-auto mb-2 sm:mb-3 rounded-lg bg-gradient-to-r backdrop-blur-md p-3 sm:p-4 ${getColors(announcement.type, announcement.priority)}`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(announcement.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm mb-1 sm:mb-2">{announcement.title}</h3>
                  <p className="text-[10px] sm:text-xs leading-relaxed whitespace-pre-wrap break-words">
                    {announcement.content}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(announcement.id)}
                  className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                  aria-label="关闭公告"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

