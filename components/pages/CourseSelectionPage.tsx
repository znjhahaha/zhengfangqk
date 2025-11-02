'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI } from '@/lib/api'
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
  const [interval, setInterval] = useState(1)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())

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
      const response = await courseAPI.getAvailableCourses() as any
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
        interval: interval
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
                  value={interval}
                  onChange={(e) => setInterval(parseFloat(e.target.value) || 1)}
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
