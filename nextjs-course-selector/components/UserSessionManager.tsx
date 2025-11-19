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
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI } from '@/lib/api'
import { userSessionManager, UserSession } from '@/lib/user-session'

interface UserSessionManagerProps {
  onSessionChange?: (sessionId: string | null) => void
  currentSessionId?: string | null
}

export default function UserSessionManager({ 
  onSessionChange, 
  currentSessionId 
}: UserSessionManagerProps) {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [newCookie, setNewCookie] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isValidating, setIsValidating] = useState<string | null>(null)

  // 加载会话列表
  const loadSessions = () => {
    const allSessions = userSessionManager.getAllSessions()
    setSessions(allSessions)
  }

  // 创建新会话
  const createSession = async () => {
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
        const response = await courseAPI.createSession({ cookie: newCookie.trim() }) as any
        
        if (response.success) {
          const sessionId = response.data.sessionId
          
          // 更新本地会话管理器
          userSessionManager.createSession(newCookie.trim())
          if (validation.studentInfo) {
            userSessionManager.updateStudentInfo(sessionId, validation.studentInfo)
          }
          
          // 切换到新会话
          userSessionManager.setCurrentSession(sessionId)
          onSessionChange?.(sessionId)
          
          // 清空输入
          setNewCookie('')
          
          // 重新加载会话列表
          loadSessions()
          
          toast.success(`会话创建成功！欢迎 ${validation.studentInfo?.name || '用户'}`)
        } else {
          toast.error('创建会话失败')
        }
      } else {
        toast.error('Cookie无效，请检查后重试')
      }
    } catch (error) {
      console.error('创建会话失败:', error)
      toast.error('创建会话失败')
    } finally {
      setIsCreating(false)
    }
  }

  // 切换会话
  const switchSession = async (sessionId: string) => {
    try {
      const success = userSessionManager.setCurrentSession(sessionId)
      if (success) {
        onSessionChange?.(sessionId)
        toast.success('会话切换成功')
      } else {
        toast.error('会话切换失败')
      }
    } catch (error) {
      console.error('切换会话失败:', error)
      toast.error('切换会话失败')
    }
  }

  // 删除会话
  const deleteSession = async (sessionId: string) => {
    try {
      // 从服务器删除
      await courseAPI.deleteSession(sessionId)
      
      // 从本地删除
      userSessionManager.deleteSession(sessionId)
      
      // 如果删除的是当前会话，切换到其他会话或清空
      if (currentSessionId === sessionId) {
        const remainingSessions = userSessionManager.getAllSessions()
        if (remainingSessions.length > 0) {
          const newCurrentSession = remainingSessions[0].id
          userSessionManager.setCurrentSession(newCurrentSession)
          onSessionChange?.(newCurrentSession)
        } else {
          onSessionChange?.(null)
        }
      }
      
      // 重新加载会话列表
      loadSessions()
      
      toast.success('会话删除成功')
    } catch (error) {
      console.error('删除会话失败:', error)
      toast.error('删除会话失败')
    }
  }

  // 验证会话
  const validateSession = async (sessionId: string) => {
    setIsValidating(sessionId)
    try {
      const session = userSessionManager.getCurrentSession()
      if (session) {
        const validation = await userSessionManager.validateCookie(session.cookie)
        if (validation.valid && validation.studentInfo) {
          userSessionManager.updateStudentInfo(sessionId, validation.studentInfo)
          loadSessions()
          toast.success('会话验证成功')
        } else {
          toast.error('会话验证失败，Cookie可能已过期')
        }
      }
    } catch (error) {
      console.error('验证会话失败:', error)
      toast.error('验证会话失败')
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
          <span>多用户会话管理</span>
        </CardTitle>
        <CardDescription>
          支持多个用户同时使用，每个用户使用独立的Cookie会话
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 创建新会话 */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Input
              placeholder="输入新的Cookie..."
              value={newCookie}
              onChange={(e) => setNewCookie(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={createSession}
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

        {/* 会话列表 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            当前会话列表 ({sessions.length})
          </h4>
          
          <AnimatePresence>
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-3 rounded-lg border transition-all ${
                  currentSessionId === session.id
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
                      {currentSessionId === session.id && (
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
                    {currentSessionId !== session.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => switchSession(session.id)}
                        className="h-8 px-2"
                      >
                        切换
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => validateSession(session.id)}
                      disabled={isValidating === session.id}
                      className="h-8 px-2"
                    >
                      {isValidating === session.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSession(session.id)}
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
              <p>暂无会话</p>
              <p className="text-xs">添加Cookie创建新会话</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
