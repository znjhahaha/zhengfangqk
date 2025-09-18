'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Trash2, 
  User, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRightLeft
} from 'lucide-react'
import toast from 'react-hot-toast'
import { userSessionManager } from '@/lib/user-session-manager'
import { setUserCookie, getCurrentUserCookie } from '@/lib/course-api'

interface UserSession {
  sessionId: string
  cookie: string
  studentInfo?: {
    name: string
    studentId: string
    major: string
    grade: string
    college: string
  }
  createdAt: number
  lastActive: number
  isActive: boolean
}

interface MultiUserManagerProps {
  onUserChange?: (sessionId: string | null) => void
}

export default function MultiUserManager({ onUserChange }: MultiUserManagerProps) {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [newCookie, setNewCookie] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isValidating, setIsValidating] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // 加载会话列表
  const loadSessions = () => {
    const allSessions = userSessionManager.getAllSessions()
    setSessions(allSessions)
    
    const currentSession = userSessionManager.getCurrentSession()
    setCurrentSessionId(currentSession?.sessionId || null)
  }

  // 创建新用户会话
  const createUserSession = async () => {
    if (!newCookie.trim()) {
      toast.error('请输入Cookie')
      return
    }

    setIsCreating(true)
    try {
      // 验证Cookie有效性
      const validation = await userSessionManager.validateCookie(newCookie.trim())
      
      if (validation.valid) {
        // 创建会话
        const sessionId = setUserCookie(newCookie.trim())
        
        // 更新学生信息
        if (validation.studentInfo?.success && validation.studentInfo?.data) {
          userSessionManager.updateStudentInfo(sessionId, validation.studentInfo.data)
        }
        
        // 清空输入
        setNewCookie('')
        
        // 重新加载会话列表
        loadSessions()
        
        // 通知父组件
        onUserChange?.(sessionId)
        
        toast.success(`用户会话创建成功！欢迎 ${validation.studentInfo?.data?.name || '用户'}`)
      } else {
        toast.error('Cookie无效，请检查后重试')
      }
    } catch (error) {
      console.error('创建用户会话失败:', error)
      toast.error('创建用户会话失败')
    } finally {
      setIsCreating(false)
    }
  }

  // 切换用户会话
  const switchUserSession = async (sessionId: string) => {
    try {
      const success = userSessionManager.setCurrentSession(sessionId)
      if (success) {
        setCurrentSessionId(sessionId)
        onUserChange?.(sessionId)
        toast.success('用户切换成功')
      } else {
        toast.error('用户切换失败')
      }
    } catch (error) {
      console.error('切换用户会话失败:', error)
      toast.error('切换用户会话失败')
    }
  }

  // 删除用户会话
  const deleteUserSession = async (sessionId: string) => {
    try {
      userSessionManager.deleteSession(sessionId)
      
      // 如果删除的是当前会话，切换到其他会话或清空
      if (currentSessionId === sessionId) {
        const remainingSessions = userSessionManager.getAllSessions()
        if (remainingSessions.length > 0) {
          const newCurrentSession = remainingSessions[0].sessionId
          userSessionManager.setCurrentSession(newCurrentSession)
          setCurrentSessionId(newCurrentSession)
          onUserChange?.(newCurrentSession)
        } else {
          setCurrentSessionId(null)
          onUserChange?.(null)
        }
      }
      
      // 重新加载会话列表
      loadSessions()
      
      toast.success('用户会话删除成功')
    } catch (error) {
      console.error('删除用户会话失败:', error)
      toast.error('删除用户会话失败')
    }
  }

  // 验证用户会话
  const validateUserSession = async (sessionId: string) => {
    setIsValidating(sessionId)
    try {
      const session = userSessionManager.getCurrentSession()
      if (session) {
        const validation = await userSessionManager.validateCookie(session.cookie)
        if (validation.valid && validation.studentInfo?.success && validation.studentInfo?.data) {
          userSessionManager.updateStudentInfo(sessionId, validation.studentInfo.data)
          loadSessions()
          toast.success('用户会话验证成功')
        } else {
          toast.error('用户会话验证失败，Cookie可能已过期')
        }
      }
    } catch (error) {
      console.error('验证用户会话失败:', error)
      toast.error('验证用户会话失败')
    } finally {
      setIsValidating(null)
    }
  }

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }

  useEffect(() => {
    loadSessions()
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>多用户管理</span>
        </CardTitle>
        <CardDescription>
          支持多个用户同时使用，每个用户使用独立的Cookie会话
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 创建新用户会话 */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Input
              placeholder="输入新用户的Cookie..."
              value={newCookie}
              onChange={(e) => setNewCookie(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={createUserSession}
              disabled={isCreating}
              className="px-4"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 用户会话列表 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            当前用户列表 ({sessions.length})
          </h4>
          
          <AnimatePresence>
            {sessions.map((session) => (
              <motion.div
                key={session.sessionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-3 rounded-lg border transition-all ${
                  currentSessionId === session.sessionId
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium truncate">
                        {session.studentInfo?.name || '未知用户'}
                      </span>
                      {currentSessionId === session.sessionId && (
                        <Badge variant="default" className="text-xs">
                          当前
                        </Badge>
                      )}
                    </div>
                    
                    {session.studentInfo && (
                      <div className="text-xs text-gray-500 mt-1">
                        {session.studentInfo.studentId} • {session.studentInfo.major}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(session.lastActive)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {currentSessionId !== session.sessionId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => switchUserSession(session.sessionId)}
                        className="h-8 px-2"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => validateUserSession(session.sessionId)}
                      disabled={isValidating === session.sessionId}
                      className="h-8 px-2"
                    >
                      {isValidating === session.sessionId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteUserSession(session.sessionId)}
                      className="h-8 px-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {sessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无用户会话</p>
              <p className="text-xs">添加Cookie创建新用户会话</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
