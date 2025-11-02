'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'
import { Button } from './button'

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  priority: 'low' | 'medium' | 'high'
  startTime: number
  endTime?: number
  createdAt: number
  createdBy: string
  isActive: boolean
}

interface AnnouncementBannerProps {
  announcements?: Announcement[]
}

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle
}

const typeColors = {
  info: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  success: 'from-green-500/20 to-green-600/20 border-green-500/30',
  warning: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  error: 'from-red-500/20 to-red-600/20 border-red-500/30'
}

const typeIconColors = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400'
}

export default function AnnouncementBanner({ announcements: propAnnouncements }: AnnouncementBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadAnnouncements = async () => {
      if (propAnnouncements) {
        setAnnouncements(propAnnouncements)
        return
      }

      try {
        const response = await fetch('/api/admin/announcements')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setAnnouncements(result.data)
          }
        }
      } catch (error) {
        console.error('加载公告失败:', error)
      }
    }

    loadAnnouncements()
    
    // 从localStorage读取已关闭的公告ID
    const dismissed = localStorage.getItem('dismissed-announcements')
    if (dismissed) {
      try {
        setDismissedIds(new Set(JSON.parse(dismissed)))
      } catch (e) {
        // 忽略解析错误
      }
    }
  }, [propAnnouncements])

  // 过滤已关闭和过期的公告
  const visibleAnnouncements = announcements.filter(ann => {
    if (dismissedIds.has(ann.id)) return false
    const now = Date.now()
    if (ann.startTime > now) return false
    if (ann.endTime && ann.endTime < now) return false
    return true
  })

  // 如果没有可见的公告，不渲染
  if (visibleAnnouncements.length === 0) {
    return null
  }

  const currentAnnouncement = visibleAnnouncements[currentIndex]
  if (!currentAnnouncement) return null

  const Icon = typeIcons[currentAnnouncement.type]
  const colorClass = typeColors[currentAnnouncement.type]
  const iconColorClass = typeIconColors[currentAnnouncement.type]

  const handleDismiss = () => {
    const newDismissed = new Set(dismissedIds)
    newDismissed.add(currentAnnouncement.id)
    setDismissedIds(newDismissed)
    localStorage.setItem('dismissed-announcements', JSON.stringify(Array.from(newDismissed)))

    // 如果有下一个公告，切换到下一个
    if (currentIndex < visibleAnnouncements.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : visibleAnnouncements.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < visibleAnnouncements.length - 1 ? prev + 1 : 0))
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentAnnouncement.id}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative w-full mb-4 rounded-lg border bg-gradient-to-r ${colorClass} backdrop-blur-sm p-3 sm:p-4`}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 ${iconColorClass}`} />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-semibold text-white mb-1">
              {currentAnnouncement.title}
            </h4>
            <p className="text-xs sm:text-sm text-white/80 whitespace-pre-wrap break-words">
              {currentAnnouncement.content}
            </p>
            {currentAnnouncement.createdBy && (
              <p className="text-[10px] sm:text-xs text-white/60 mt-1">
                来自：{currentAnnouncement.createdBy}
              </p>
            )}
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-end gap-2 mt-2">
          {visibleAnnouncements.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                className="h-6 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
              >
                上一个
              </Button>
              <span className="text-[10px] text-white/60">
                {currentIndex + 1} / {visibleAnnouncements.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="h-6 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
              >
                下一个
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

