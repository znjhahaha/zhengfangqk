'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, Info, CheckCircle, AlertTriangle, History, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'error' | 'success'
  priority: 'low' | 'normal' | 'high'
  createdAt: number
  updatedAt?: number
  expiresAt?: number
  isActive: boolean
}

interface AnnouncementModalProps {
  forceShowHistory?: boolean
  onCloseHistory?: () => void
}

export default function AnnouncementModal({ forceShowHistory = false, onCloseHistory }: AnnouncementModalProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  // 获取或生成用户ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('user-id')
      if (!id) {
        id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('user-id', id)
      }
      setUserId(id)
      
      // 加载已确认的公告
      const confirmed = localStorage.getItem('confirmed-announcements')
      if (confirmed) {
        try {
          setConfirmedIds(new Set(JSON.parse(confirmed)))
        } catch (error) {
          console.warn('读取已确认公告失败:', error)
        }
      }
    }
  }, [])

  // 如果外部强制显示历史公告，则显示
  useEffect(() => {
    if (forceShowHistory) {
      console.log('📢 强制显示历史公告')
      setShowHistory(true)
    }
    // 注意：我们不在这里自动关闭，因为用户可能想要通过点击关闭按钮来关闭
  }, [forceShowHistory])

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        // 添加时间戳防止缓存
        const response = await fetch(`/api/admin/announcements?activeOnly=true&t=${Date.now()}`)
        const result = await response.json()
        if (result.success && result.data) {
          const newAnnouncements = result.data
          console.log('📢 加载公告:', newAnnouncements.length, '条活跃公告')
          setAnnouncements(newAnnouncements)
        } else {
          console.warn('📢 加载公告失败:', result)
        }
      } catch (error) {
        console.warn('加载公告失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnnouncements()

    // 定期更新公告（每30秒，更快地同步新公告）
    const interval = setInterval(loadAnnouncements, 30 * 1000)
    return () => clearInterval(interval)
  }, [])

  // 从localStorage读取已关闭和已查看的公告ID
  useEffect(() => {
    try {
      const savedDismissed = localStorage.getItem('dismissed-announcements')
      const savedViewed = localStorage.getItem('viewed-announcements')
      if (savedDismissed) {
        setDismissedIds(new Set(JSON.parse(savedDismissed)))
      }
      if (savedViewed) {
        setViewedIds(new Set(JSON.parse(savedViewed)))
      }
    } catch (error) {
      console.warn('读取已关闭/已查看公告失败:', error)
    }
  }, [])

  // 过滤已关闭和已过期的公告（包含 isActive 检查）
  const activeAnnouncements = announcements.filter(a => {
    if (!a.isActive) return false // 只显示活跃的公告
    if (dismissedIds.has(a.id)) return false
    if (a.expiresAt && a.expiresAt < Date.now()) return false
    return true
  })

  // 未查看的公告（需要弹出的）
  const unviewedAnnouncements = activeAnnouncements.filter(a => !viewedIds.has(a.id))

  // 当前显示的公告
  const currentAnnouncement = unviewedAnnouncements[currentIndex] || unviewedAnnouncements[0]

  // 当未查看公告列表变化时，重置索引（如果有新公告）
  useEffect(() => {
    if (unviewedAnnouncements.length > 0 && currentIndex >= unviewedAnnouncements.length) {
      setCurrentIndex(0)
    }
  }, [unviewedAnnouncements.length, currentIndex])

  // 所有公告（包括已查看的，用于历史记录）- 只过滤过期的，不过滤已查看和已关闭
  const allActiveAnnouncements = announcements.filter(a => {
    if (!a.isActive) return false // 只显示活跃的公告
    if (a.expiresAt && a.expiresAt < Date.now()) return false
    return true
  })

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
    
    // 同时标记为已查看
    markAsViewed(id)
    
    // 如果还有下一个未查看的公告，显示下一个
    if (currentIndex < unviewedAnnouncements.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  const markAsViewed = (id: string) => {
    setViewedIds(prev => {
      const newSet = new Set(Array.from(prev).concat([id]))
      try {
        localStorage.setItem('viewed-announcements', JSON.stringify(Array.from(newSet)))
      } catch (error) {
        console.warn('保存已查看公告失败:', error)
      }
      return newSet
    })
  }

  // 确认收到公告
  const handleConfirm = async (id: string) => {
    if (!userId) {
      toast.error('用户ID未初始化')
      return
    }

    try {
      const response = await fetch('/api/admin/announcements/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          announcementId: id,
          userId: userId
        })
      })

      const result = await response.json()
      if (result.success) {
        setConfirmedIds(prev => {
          const newSet = new Set(Array.from(prev).concat([id]))
          try {
            localStorage.setItem('confirmed-announcements', JSON.stringify(Array.from(newSet)))
          } catch (error) {
            console.warn('保存已确认公告失败:', error)
          }
          return newSet
        })
        markAsViewed(id)
        toast.success('确认收到')
      } else {
        toast.error(result.message || '确认失败')
      }
    } catch (error) {
      console.error('确认公告失败:', error)
      toast.error('确认失败')
    }
  }

  const handleNext = () => {
    if (currentAnnouncement) {
      markAsViewed(currentAnnouncement.id)
      handleDismiss(currentAnnouncement.id)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8" />
      case 'error':
        return <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8" />
      default:
        return <Info className="h-6 w-6 sm:h-8 sm:w-8" />
    }
  }

  const getColors = (type: string, priority: string) => {
    const baseColors = {
      info: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
      success: 'from-green-500/20 to-green-600/20 border-green-500/50',
      warning: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50',
      error: 'from-red-500/20 to-red-600/20 border-red-500/50'
    }

    const priorityStyles = {
      high: 'border-2 shadow-2xl shadow-red-500/30',
      normal: 'border shadow-xl',
      low: 'border border-dashed'
    }

    return `${baseColors[type as keyof typeof baseColors]} ${priorityStyles[priority as keyof typeof priorityStyles]}`
  }

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-100'
      case 'warning':
        return 'text-yellow-100'
      case 'error':
        return 'text-red-100'
      default:
        return 'text-blue-100'
    }
  }

  // 如果有未查看的公告，显示公告弹窗
  // 无论是否有未查看的公告，都要渲染历史公告弹窗（如果 showHistory 为 true）

  return (
    <>
      {/* 公告弹窗 */}
      <AnimatePresence mode="wait">
        {currentAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleNext()
              }
            }}
          >
            <motion.div
              key={currentAnnouncement.id}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              className={`relative w-full max-w-2xl rounded-2xl bg-gradient-to-br backdrop-blur-md p-6 sm:p-8 ${getColors(currentAnnouncement.type, currentAnnouncement.priority)} ${getTextColor(currentAnnouncement.type)}`}
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => handleDismiss(currentAnnouncement.id)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="关闭公告"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              {/* 公告内容 */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(currentAnnouncement.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg sm:text-2xl mb-3 sm:mb-4 pr-8">
                    {currentAnnouncement.title}
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words mb-4 sm:mb-6">
                    {currentAnnouncement.content}
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs sm:text-sm opacity-75">
                      {new Date(currentAnnouncement.createdAt).toLocaleString('zh-CN')}
                    </p>
                    {unviewedAnnouncements.length > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevious}
                          disabled={currentIndex === 0}
                          className="text-xs sm:text-sm"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs sm:text-sm">
                          {currentIndex + 1} / {unviewedAnnouncements.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNext}
                          className="text-xs sm:text-sm"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="flex gap-3 mt-6">
                {!confirmedIds.has(currentAnnouncement.id) && (
                  <Button
                    onClick={() => handleConfirm(currentAnnouncement.id)}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/30 backdrop-blur-sm border border-green-500/50 text-green-100"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    确定收到
                  </Button>
                )}
                <Button
                  onClick={() => {
                    markAsViewed(currentAnnouncement.id)
                    handleDismiss(currentAnnouncement.id)
                  }}
                  className={`${confirmedIds.has(currentAnnouncement.id) ? 'flex-1' : 'flex-1'} bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20`}
                  size="sm"
                >
                  {confirmedIds.has(currentAnnouncement.id) ? '已确认' : '我知道了'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 历史公告按钮 */}
      {allActiveAnnouncements.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <Button
              onClick={() => setShowHistory(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg text-xs sm:text-sm"
              size="sm"
            >
              <History className="h-4 w-4 mr-2" />
              历史公告
            </Button>
          </motion.div>
        </div>
      )}

      {/* 历史公告弹窗 */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              console.log('📢 关闭历史公告弹窗')
              setShowHistory(false)
              if (onCloseHistory) {
                onCloseHistory()
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md border border-purple-500/30 shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-purple-500/30 bg-slate-900/50 backdrop-blur-sm">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <History className="h-5 w-5 sm:h-6 sm:w-6" />
                  历史公告
                </h2>
                <button
                  onClick={() => {
                    setShowHistory(false)
                    if (onCloseHistory) {
                      onCloseHistory()
                    }
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    <p className="text-gray-400 mt-4">加载中...</p>
                  </div>
                ) : allActiveAnnouncements.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">暂无公告</p>
                ) : (
                  allActiveAnnouncements.map((ann) => (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className={`p-4 sm:p-6 rounded-xl bg-gradient-to-r backdrop-blur-sm ${getColors(ann.type, ann.priority)} ${getTextColor(ann.type)} cursor-pointer hover:scale-[1.02] transition-transform`}
                      onClick={() => setSelectedAnnouncement(ann)}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(ann.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-base sm:text-lg">
                              {ann.title}
                            </h3>
                            {!confirmedIds.has(ann.id) && (
                              <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                            )}
                          </div>
                          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words mb-3 line-clamp-3">
                            {ann.content}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs sm:text-sm opacity-75">
                              {new Date(ann.createdAt).toLocaleString('zh-CN')}
                            </p>
                            <span className="text-xs sm:text-sm opacity-75">点击查看详情</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 公告详情弹窗（从历史公告列表点击时显示） */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedAnnouncement(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-2xl rounded-2xl bg-gradient-to-br backdrop-blur-md p-6 sm:p-8 ${getColors(selectedAnnouncement.type, selectedAnnouncement.priority)} ${getTextColor(selectedAnnouncement.type)}`}
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="关闭公告"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              {/* 公告内容 */}
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(selectedAnnouncement.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg sm:text-2xl mb-3 sm:mb-4 pr-8">
                    {selectedAnnouncement.title}
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words mb-4 sm:mb-6">
                    {selectedAnnouncement.content}
                  </p>
                  <p className="text-xs sm:text-sm opacity-75 mb-4">
                    {new Date(selectedAnnouncement.createdAt).toLocaleString('zh-CN')}
                  </p>
                  
                  {/* 底部按钮 */}
                  <div className="flex gap-3 mt-6">
                    {!confirmedIds.has(selectedAnnouncement.id) && (
                      <Button
                        onClick={() => {
                          handleConfirm(selectedAnnouncement.id)
                          setSelectedAnnouncement(null)
                        }}
                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 backdrop-blur-sm border border-green-500/50 text-green-100"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        确定收到
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        markAsViewed(selectedAnnouncement.id)
                        setSelectedAnnouncement(null)
                      }}
                      className={`${confirmedIds.has(selectedAnnouncement.id) ? 'flex-1' : 'flex-1'} bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20`}
                      size="sm"
                    >
                      {confirmedIds.has(selectedAnnouncement.id) ? '已确认' : '我知道了'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

