'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  Play, 
  Square,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  BookOpen,
  Users,
  Server,
  Shield,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI, getApiUrl } from '@/lib/api'
import { formatTime } from '@/lib/utils'

interface SelectionMode {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
}

interface SelectionThread {
  thread_id: string
  start_time: string
  is_alive: boolean
  status?: string
  results?: any
  error?: string
}

export default function CourseSelectionPage() {
  const [selectedMode, setSelectedMode] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [currentThread, setCurrentThread] = useState<string | null>(null)
  const [selectionStatus, setSelectionStatus] = useState<any>(null)
  const [maxAttempts, setMaxAttempts] = useState(100)
  const [requestInterval, setRequestInterval] = useState(1)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())

  // 服务器端抢课相关状态
  const [useServerSelection, setUseServerSelection] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  const [isActivated, setIsActivated] = useState(false)
  const [serverTasks, setServerTasks] = useState<any[]>([])
  const [isLoadingActivation, setIsLoadingActivation] = useState(false)

  // 选课模式配置
  const selectionModes: SelectionMode[] = [
    {
      id: 'steal',
      name: '捡漏模式',
      description: '重复请求所有可选网课，捡漏退课名额',
      icon: <Zap className="h-5 w-5" />,
      color: 'text-yellow-400'
    },
    {
      id: 'online',
      name: '网课优先',
      description: '优先选择D类网课，适合时间灵活的学生',
      icon: <BookOpen className="h-5 w-5" />,
      color: 'text-blue-400'
    },
    {
      id: 'keyword',
      name: '关键词匹配',
      description: '根据课程名、教师名匹配指定关键词',
      icon: <Target className="h-5 w-5" />,
      color: 'text-green-400'
    }
  ]

  // 获取可选课程
  const fetchAvailableCourses = async () => {
    try {
      // 获取当前学校ID（从localStorage读取，确保用户隔离）
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.getAvailableCourses(currentSchool.id) as any
      if (response.success) {
        setAvailableCourses(response.data || [])
      }
    } catch (error: any) {
      const errorMessage = error.message || '获取可选课程失败'
      if (errorMessage.includes('Cookie未设置')) {
        toast.error('请先配置Cookie', {
          duration: 5000
        })
      } else {
        console.error('获取可选课程失败:', error)
      }
    }
  }

  // 启动智能选课
  const startSmartSelection = async () => {
    if (!selectedMode) {
      toast.error('请选择选课模式')
      return
    }

    setIsRunning(true)
    setElapsedTime(0)
    
    try {
      // 根据模式筛选课程
      let coursesToSelect = []
      
      switch (selectedMode) {
        case 'steal':
          // 捡漏模式：选择所有可选网课
          coursesToSelect = availableCourses.filter(course => 
            course.kclb === 'D' && course.kkzt === '1'
          )
          break
        case 'online':
          // 网课优先：选择D类课程
          coursesToSelect = availableCourses.filter(course => 
            course.kclb === 'D' && course.kkzt === '1'
          )
          break
        case 'keyword':
          // 关键词匹配：这里可以根据用户输入的关键词筛选
          coursesToSelect = availableCourses.filter(course => 
            course.kkzt === '1'
          )
          break
      }

      if (coursesToSelect.length === 0) {
        toast.error('没有找到符合条件的课程')
        setIsRunning(false)
        return
      }

      const response = await courseAPI.startSmartCourseSelection({
        courses: coursesToSelect,
        max_attempts: maxAttempts,
        interval: requestInterval
      }) as any

      if (response.success) {
        setCurrentThread(response.thread_id)
        toast.success('智能选课已启动')
        
        // 开始轮询状态
        pollSelectionStatus(response.thread_id)
      } else {
        toast.error(response.error || '启动智能选课失败')
        setIsRunning(false)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '启动智能选课失败')
      setIsRunning(false)
    }
  }

  // 停止智能选课
  const stopSmartSelection = async () => {
    if (!currentThread) return

    try {
      const response = await courseAPI.stopSmartCourseSelection(currentThread) as any
      if (response.success) {
        toast.success('智能选课已停止')
        setIsRunning(false)
        setCurrentThread(null)
        setSelectionStatus(null)
      } else {
        toast.error(response.error || '停止智能选课失败')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || '停止智能选课失败')
    }
  }

  // 轮询选课状态
  const pollSelectionStatus = async (threadId: string) => {
    const poll = async () => {
      try {
        const response = await courseAPI.getCourseSelectionStatus(threadId) as any
        if (response.success) {
          setSelectionStatus(response.data)
          
          if (response.data.status === 'completed' || 
              response.data.status === 'stopped' ||
              response.data.status === 'error') {
            setIsRunning(false)
            setCurrentThread(null)
            return
          }
        }
      } catch (error) {
        console.error('获取选课状态失败:', error)
      }
      
      if (isRunning) {
        setTimeout(poll, 2000) // 每2秒轮询一次
      }
    }
    
    poll()
  }

  // 计时器
  useEffect(() => {
    if (isRunning) {
      const timer = setTimeout(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isRunning, elapsedTime])

  // 初始化加载课程
  useEffect(() => {
    fetchAvailableCourses()
  }, [])

  // 加载用户任务
  const loadUserTasks = useCallback(async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || `user_${Date.now()}` : 'unknown'
      const response = await fetch(getApiUrl(`/server-selection/tasks?userId=${userId}`))
      const result = await response.json()
      if (result.success) {
        setServerTasks(result.data || [])
      }
    } catch (error) {
      console.error('加载任务失败:', error)
    }
  }, [])

  // 检查激活状态
  useEffect(() => {
    const checkActivationStatus = async () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || `user_${Date.now()}` : 'unknown'
        if (typeof window !== 'undefined' && !localStorage.getItem('userId')) {
          localStorage.setItem('userId', userId)
        }
        const response = await fetch(`/api/activation/verify?userId=${userId}`)
        const result = await response.json()
        if (result.success && result.activated) {
          setIsActivated(true)
          // 加载用户任务
          loadUserTasks()
        }
      } catch (error) {
        console.error('检查激活状态失败:', error)
      }
    }
    checkActivationStatus()
  }, [loadUserTasks])

  // 激活激活码
  const activateCode = async () => {
    if (!activationCode.trim()) {
      toast.error('请输入激活码')
      return
    }

    setIsLoadingActivation(true)
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || `user_${Date.now()}` : 'unknown'
      if (typeof window !== 'undefined' && !localStorage.getItem('userId')) {
        localStorage.setItem('userId', userId)
      }

      const response = await fetch(getApiUrl('/activation/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: activationCode.trim().replace(/\s+/g, ''), // 去除空格和换行符
          userId
        })
      })

      const result = await response.json()
      
      console.log('激活码验证结果:', result)
      
      if (result.success) {
        // 检查是否激活成功（可能是新激活或已激活）
        if (result.activated !== false) {
          setIsActivated(true)
          setActivationCode('')
          toast.success(result.message || '激活码激活成功！')
          loadUserTasks()
        } else {
          toast.error(result.message || '激活失败')
        }
      } else {
        toast.error(result.message || result.error || '激活失败')
      }
    } catch (error) {
      console.error('激活失败:', error)
      toast.error('激活失败')
    } finally {
      setIsLoadingActivation(false)
    }
  }

  // 轮询任务状态
  useEffect(() => {
    if (isActivated && serverTasks.some(task => task.status === 'pending' || task.status === 'running')) {
      const interval = setInterval(() => {
        loadUserTasks()
      }, 5000) // 每5秒刷新一次

      return () => clearInterval(interval)
    }
  }, [isActivated, serverTasks, loadUserTasks])

  const startServerSelection = async () => {
    if (!selectedMode) {
      toast.error('请选择选课模式')
      return
    }

    if (!isActivated) {
      toast.error('请先激活服务器端抢课功能')
      return
    }

    try {
      // 根据模式筛选课程
      let coursesToSelect = []
      
      switch (selectedMode) {
        case 'steal':
          coursesToSelect = availableCourses.filter(course => 
            course.kclb === 'D' && course.kkzt === '1'
          )
          break
        case 'online':
          coursesToSelect = availableCourses.filter(course => 
            course.kclb === 'D' && course.kkzt === '1'
          )
          break
        case 'keyword':
          coursesToSelect = availableCourses.filter(course => 
            course.kkzt === '1'
          )
          break
      }

      if (coursesToSelect.length === 0) {
        toast.error('没有找到符合条件的课程')
        return
      }

      // 获取用户Cookie和学校ID
      const cookie = typeof window !== 'undefined' ? localStorage.getItem('course-cookie') || '' : ''
      if (!cookie) {
        toast.error('请先配置Cookie')
        return
      }

      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()

      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || `user_${Date.now()}` : 'unknown'
      if (typeof window !== 'undefined' && !localStorage.getItem('userId')) {
        localStorage.setItem('userId', userId)
      }

      // 提交任务到服务器
      const response = await fetch(getApiUrl('/server-selection/tasks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          schoolId: currentSchool.id,
          courses: coursesToSelect.map(course => ({
            kch: course.kch_id || course.kch,
            kxh: course.jxb_id || course.kxh,
            name: course.kcmc
          })),
          cookie
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('服务器端抢课任务已提交！')
        loadUserTasks()
        // 开始轮询任务状态
        setTimeout(() => {
          loadUserTasks()
        }, 3000)
      } else {
        toast.error(result.message || '提交任务失败')
      }
    } catch (error: any) {
      console.error('提交服务器端抢课任务失败:', error)
      toast.error('提交任务失败')
    }
  }

  // 取消任务
  const cancelServerTask = async (taskId: string) => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'unknown' : 'unknown'
      const response = await fetch(getApiUrl('/server-selection/tasks'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          userId
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('任务已取消')
        loadUserTasks()
      } else {
        toast.error(result.message || '取消失败')
      }
    } catch (error) {
      console.error('取消任务失败:', error)
      toast.error('取消失败')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0"
      >
        <div>
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">🎯 智能选课</h2>
          <p className="text-xs sm:text-base text-muted-foreground">选择选课模式，启动智能抢课系统</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {!isRunning ? (
            <Button
              onClick={startSmartSelection}
              disabled={!selectedMode}
              className="btn-hover text-xs sm:text-sm px-3 sm:px-4"
            >
              <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">开始选课</span>
              <span className="sm:hidden">开始</span>
            </Button>
          ) : (
            <Button
              onClick={stopSmartSelection}
              variant="destructive"
              className="btn-hover text-xs sm:text-sm px-3 sm:px-4"
            >
              <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">停止选课</span>
              <span className="sm:hidden">停止</span>
            </Button>
          )}
        </div>
      </motion.div>

      {/* 选课模式选择 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4"
      >
        {selectionModes.map((mode) => (
          <Card
            key={mode.id}
            className={`glass cursor-pointer transition-all duration-300 ${
              selectedMode === mode.id 
                ? 'ring-2 ring-primary bg-primary/10' 
                : 'hover:bg-accent/50'
            }`}
            onClick={() => setSelectedMode(mode.id)}
          >
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                <div className={mode.color}>{mode.icon}</div>
                <h3 className="text-base sm:text-lg font-semibold text-white">{mode.name}</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">{mode.description}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* 选课参数设置 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span>选课参数设置</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              配置智能选课的参数
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-white">最大尝试次数</label>
                <Input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 100)}
                  min="1"
                  max="1000"
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-white">请求间隔(秒)</label>
                <Input
                  type="number"
                  value={requestInterval}
                  onChange={(e) => setRequestInterval(parseFloat(e.target.value) || 1)}
                  min="0.1"
                  max="10"
                  step="0.1"
                  disabled={isRunning}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 服务器端抢课功能 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Server className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span>服务器端抢课</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              将抢课任务提交到服务器，无需保持网页打开（需要激活码）
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-4">
            {!isActivated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <Shield className="h-4 w-4 text-yellow-400" />
                  <p className="text-xs sm:text-sm text-yellow-300">需要激活码才能使用服务器端抢课功能</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="请输入激活码"
                    className="flex-1 bg-slate-900/50 border-slate-700"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        activateCode()
                      }
                    }}
                  />
                  <Button
                    onClick={activateCode}
                    disabled={isLoadingActivation || !activationCode.trim()}
                    size="sm"
                  >
                    {isLoadingActivation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        激活
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <p className="text-xs sm:text-sm text-green-300">已激活服务器端抢课功能</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={startServerSelection}
                    disabled={!selectedMode || isRunning}
                    className="flex-1"
                    size="sm"
                  >
                    <Server className="h-4 w-4 mr-2" />
                    提交到服务器抢课
                  </Button>
                  <Button
                    onClick={loadUserTasks}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    刷新任务
                  </Button>
                </div>
                {serverTasks.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs sm:text-sm text-gray-400">我的任务:</p>
                    {serverTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-400">{task.id}</span>
                              <Badge
                                variant="outline"
                                className={
                                  task.status === 'running' ? 'text-yellow-400 border-yellow-400' :
                                  task.status === 'completed' ? 'text-green-400 border-green-400' :
                                  task.status === 'failed' ? 'text-red-400 border-red-400' :
                                  'text-gray-400 border-gray-400'
                                }
                              >
                                {task.status === 'pending' ? '等待中' :
                                 task.status === 'running' ? '运行中' :
                                 task.status === 'completed' ? '已完成' :
                                 task.status === 'failed' ? '失败' :
                                 '已取消'}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-400">
                              <p>课程数: {task.courses?.length || 0} | 尝试次数: {task.attemptCount}</p>
                              {task.result && (
                                <div className="mt-1">
                                  <p className={task.result.success ? 'text-green-400' : 'text-red-400'}>
                                    {task.result.message}
                                  </p>
                                  {task.result.data && (
                                    <p className="text-gray-500 text-xs mt-1">
                                      {task.result.data.flag === '1' ? '✅ 选课成功 (flag=1)' : 
                                       task.result.data.flag ? `状态: flag=${task.result.data.flag}` : ''}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {(task.status === 'pending' || task.status === 'running') && (
                            <Button
                              onClick={() => cancelServerTask(task.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <Square className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 选课状态 */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
                <span>选课进行中</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">运行时间</span>
                <span className="text-xs sm:text-sm font-medium text-white">{formatTime(elapsedTime)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">当前模式</span>
                <span className="text-xs sm:text-sm font-medium text-white">
                  {selectionModes.find(m => m.id === selectedMode)?.name}
                </span>
              </div>
              
              {selectionStatus && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">尝试次数</span>
                    <span className="text-xs sm:text-sm font-medium text-white">
                      {selectionStatus.attempts || 0} / {maxAttempts}
                    </span>
                  </div>
                  
                  <Progress 
                    value={((selectionStatus.attempts || 0) / maxAttempts) * 100} 
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 选课结果 */}
      {selectionStatus && (selectionStatus.status === 'completed' || selectionStatus.status === 'stopped') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                {selectionStatus.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                )}
                <span>选课结果</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">状态</span>
                  <span className={`text-xs sm:text-sm font-medium ${
                    selectionStatus.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {selectionStatus.status === 'completed' ? '已完成' : '已停止'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">总尝试次数</span>
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {selectionStatus.attempts || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">成功次数</span>
                  <span className="text-xs sm:text-sm font-medium text-green-400">
                    {selectionStatus.success_count || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">失败次数</span>
                  <span className="text-xs sm:text-sm font-medium text-red-400">
                    {selectionStatus.failed_count || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
