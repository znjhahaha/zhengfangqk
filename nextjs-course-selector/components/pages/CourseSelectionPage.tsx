'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  Square,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
  Server,
  Shield,
  RefreshCw,
  Search,
  Timer,
  Play,
  X,
  Settings,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI, getApiUrl } from '@/lib/api'

export default function CourseSelectionPage() {
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // 服务器端抢课相关状态
  const [useServerSelection, setUseServerSelection] = useState(false)
  const [isServerSelectionActivated, setIsServerSelectionActivated] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  const [isLoadingActivation, setIsLoadingActivation] = useState(false)
  const [serverTasks, setServerTasks] = useState<any[]>([])
  const [scheduledTime, setScheduledTime] = useState<string>('')
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [grabbingCourses, setGrabbingCourses] = useState<Set<string>>(new Set())

  // 获取可选课程
  const fetchAvailableCourses = async () => {
    setIsLoading(true)
    try {
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.getAvailableCourses(currentSchool.id) as any
      if (response.success) {
        setAvailableCourses(response.data || [])
      }
    } catch (error: any) {
      const errorMessage = error.message || '获取可选课程失败'
      if (errorMessage.includes('Cookie未设置')) {
        toast.error('请先配置Cookie', { duration: 5000 })
      } else {
        console.error('获取可选课程失败:', error)
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 检查服务器端抢课激活状态
  useEffect(() => {
    const checkActivationStatus = async () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || `user_${Date.now()}` : 'unknown'
        if (typeof window !== 'undefined' && !localStorage.getItem('userId')) {
          localStorage.setItem('userId', userId)
        }
        const response = await fetch(getApiUrl(`/activation/verify?userId=${userId}`))
        const result = await response.json()
        if (result.success && result.activated) {
          setIsServerSelectionActivated(true)
          loadUserTasks()
        } else {
          setIsServerSelectionActivated(false)
        }
      } catch (error) {
        console.error('检查激活状态失败:', error)
        setIsServerSelectionActivated(false)
      }
    }
    checkActivationStatus()
  }, [])

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
          code: activationCode.trim().replace(/\s+/g, ''),
          userId
        })
      })

      const result = await response.json()
      
      if (result.success && result.activated !== false) {
        setIsServerSelectionActivated(true)
        setActivationCode('')
        toast.success(result.message || '激活码激活成功！')
        loadUserTasks()
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

  // 加载用户任务
  const loadUserTasks = useCallback(async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'unknown' : 'unknown'
      const response = await fetch(getApiUrl(`/server-selection/tasks?userId=${userId}`))
      const result = await response.json()
      if (result.success) {
        setServerTasks(result.data || [])
      }
    } catch (error) {
      console.error('加载任务失败:', error)
    }
  }, [])

  // 轮询任务状态
  useEffect(() => {
    if (isServerSelectionActivated && serverTasks.some(task => task.status === 'pending' || task.status === 'running')) {
      const interval = setInterval(() => {
        loadUserTasks()
      }, 3000) // 每3秒刷新一次

      return () => clearInterval(interval)
    }
  }, [isServerSelectionActivated, serverTasks, loadUserTasks])

  // 抢课
  const grabCourse = useCallback(async (course: any) => {
    // 检查是否已激活服务端抢课功能
    if (!isServerSelectionActivated) {
      toast.error('请先激活服务器端抢课功能才能使用抢课Pro+', {
        duration: 5000
      })
      return
    }

    const courseKey = `${course.kch_id}_${course.jxb_id}`
    setGrabbingCourses(prev => new Set(prev).add(courseKey))
    
    try {
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      
      // 如果开启了服务器端抢课且已激活，提交到服务器端任务
      if (useServerSelection && isServerSelectionActivated) {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || `user_${Date.now()}` : 'unknown'
        if (typeof window !== 'undefined' && !localStorage.getItem('userId')) {
          localStorage.setItem('userId', userId)
        }
        
        const cookie = typeof window !== 'undefined' ? localStorage.getItem('course-cookie') || '' : ''
        if (!cookie) {
          toast.error('请先配置Cookie')
          setGrabbingCourses(prev => {
            const newSet = new Set(prev)
            newSet.delete(courseKey)
            return newSet
          })
          return
        }
        
        // 计算定时时间（如果有）
        let scheduledTimestamp: number | undefined
        if (scheduledTime) {
          scheduledTimestamp = new Date(scheduledTime).getTime()
          if (scheduledTimestamp <= Date.now()) {
            toast.error('定时时间必须晚于当前时间')
            setGrabbingCourses(prev => {
              const newSet = new Set(prev)
              newSet.delete(courseKey)
              return newSet
            })
            return
          }
        }
        
        // 提交到服务器端任务
        const response = await fetch(getApiUrl('/server-selection/tasks'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            schoolId: currentSchool.id,
            courses: [{
              kch: course.kch_id,
              kxh: course.jxb_id,
              name: course.kcmc,
              jxb_id: course.jxb_id,
              do_jxb_id: course.do_jxb_id || course.jxb_id,
              kch_id: course.kch_id,
              jxbzls: course.jxbzls || '1',
              kklxdm: course.kklxdm || '01',
              kcmc: course.kcmc,
              jxbmc: course.jxbmc || course.jsxm,
              _rwlx: course._rwlx,
              _xklc: course._xklc,
              _xkly: course._xkly,
              _xkkz_id: course._xkkz_id
            }],
            cookie,
            scheduledTime: scheduledTimestamp
          })
        })
        
        const result = await response.json()
        if (result.success) {
          if (scheduledTime) {
            const timeStr = new Date(scheduledTime).toLocaleString('zh-CN')
            toast.success(`课程 "${course.kcmc}" 已设定定时抢课任务（${timeStr}）！`)
          } else {
            toast.success(`课程 "${course.kcmc}" 已提交到服务器端抢课任务！服务器将持续尝试抢课。`)
          }
          setScheduledTime('')
          setShowScheduleDialog(false)
          loadUserTasks()
        } else {
          toast.error(result.message || '提交服务器端任务失败')
        }
        setGrabbingCourses(prev => {
          const newSet = new Set(prev)
          newSet.delete(courseKey)
          return newSet
        })
        return
      }
      
      // 本地抢课（也需要激活才能使用）
      if (!isServerSelectionActivated) {
        toast.error('请先激活服务器端抢课功能才能使用抢课Pro+', {
          duration: 5000
        })
        setGrabbingCourses(prev => {
          const newSet = new Set(prev)
          newSet.delete(courseKey)
          return newSet
        })
        return
      }
      
      const response = await courseAPI.executeSingleCourseSelection({
        jxb_id: course.jxb_id,
        do_jxb_id: course.do_jxb_id || course.jxb_id,
        kch_id: course.kch_id,
        jxbzls: course.jxbzls || '1',
        kklxdm: course.kklxdm || '01',
        kcmc: course.kcmc,
        jxbmc: course.jxbmc || course.jsxm,
        _rwlx: course._rwlx,
        _xklc: course._xklc,
        _xkly: course._xkly,
        _xkkz_id: course._xkkz_id
      }, currentSchool.id) as any
      
      if (response.success) {
        toast.success(`课程 "${course.kcmc}" 抢课成功！`)
        fetchAvailableCourses()
      } else {
        const errorMsg = response.message || response.error || '抢课失败'
        toast.error(errorMsg)
      }
    } catch (error: any) {
      const errorMsg = error.message || '抢课失败'
      toast.error(errorMsg)
      console.error('抢课失败:', error)
    } finally {
      setGrabbingCourses(prev => {
        const newSet = new Set(prev)
        newSet.delete(courseKey)
        return newSet
      })
    }
  }, [useServerSelection, isServerSelectionActivated, scheduledTime, loadUserTasks])

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

  // 过滤课程
  const filteredCourses = availableCourses.filter(course => {
    if (!searchTerm) return true
    const lowerSearchTerm = searchTerm.toLowerCase()
    return (
      course.kcmc?.toLowerCase().includes(lowerSearchTerm) ||
      course.jsxm?.toLowerCase().includes(lowerSearchTerm) ||
      course.kclb?.toLowerCase().includes(lowerSearchTerm)
    )
  })

  // 初始化加载课程 - 只有激活后才加载
  useEffect(() => {
    if (isServerSelectionActivated) {
      fetchAvailableCourses()
    }
  }, [isServerSelectionActivated])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0"
      >
        <div>
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">🎯 抢课Pro+</h2>
          <p className="text-xs sm:text-base text-muted-foreground">手动选择课程进行抢课，支持本地和服务器端抢课</p>
        </div>
        <Button
          onClick={fetchAvailableCourses}
          disabled={isLoading || !isServerSelectionActivated}
          variant="outline"
          className="btn-hover text-xs sm:text-sm px-3 sm:px-4"
          title={!isServerSelectionActivated ? '请先激活服务器端抢课功能' : ''}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          )}
          <span className="hidden sm:inline">刷新课程</span>
          <span className="sm:hidden">刷新</span>
        </Button>
      </motion.div>

      {/* 服务器端抢课激活 - 必须激活才能使用 */}
      {!isServerSelectionActivated && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass border-yellow-500/50">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                <span>需要激活才能使用</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                <div className="space-y-2 mt-2">
                  <p className="text-yellow-300">⚠️ 抢课Pro+功能需要激活服务器端抢课功能后才能使用</p>
                  <p className="text-muted-foreground">激活后可以使用抢课Pro+功能，支持本地抢课和服务器端抢课</p>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="请输入激活码"
                    className="flex-1 bg-slate-900/50 border-slate-700 text-xs sm:text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        activateCode()
                      }
                    }}
                  />
                  <Button
                    onClick={activateCode}
                    disabled={isLoadingActivation || !activationCode.trim()}
                    className="btn-hover text-xs sm:text-sm px-3 sm:px-4"
                  >
                    {isLoadingActivation ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <>
                        <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">激活</span>
                        <span className="sm:hidden">激活</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs sm:text-sm text-yellow-300">
                    💡 提示：激活后即可使用抢课Pro+功能，包括本地抢课和服务器端抢课两种模式
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 抢课模式选择 */}
      {isServerSelectionActivated && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>抢课模式</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                选择使用本地抢课或服务器端抢课
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setUseServerSelection(false)}
                  variant={!useServerSelection ? "default" : "outline"}
                  className="btn-hover text-xs sm:text-sm px-3 sm:px-4"
                >
                  <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">本地抢课</span>
                  <span className="sm:hidden">本地</span>
                </Button>
                <Button
                  onClick={() => setUseServerSelection(true)}
                  variant={useServerSelection ? "default" : "outline"}
                  className="btn-hover text-xs sm:text-sm px-3 sm:px-4"
                >
                  <Server className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">服务器抢课</span>
                  <span className="sm:hidden">服务器</span>
                </Button>
                {useServerSelection && (
                  <>
                    <Button
                      onClick={() => setShowScheduleDialog(!showScheduleDialog)}
                      variant="outline"
                      className="btn-hover text-xs sm:text-sm px-3 sm:px-4"
                    >
                      <Timer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">{scheduledTime ? '修改时间' : '设定时间'}</span>
                      <span className="sm:hidden">时间</span>
                    </Button>
                    {scheduledTime && (
                      <div className="flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        {new Date(scheduledTime).toLocaleString('zh-CN')}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 定时时间设置对话框 */}
      {showScheduleDialog && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-base">设定定时抢课时间</CardTitle>
              <CardDescription className="text-xs sm:text-sm">选择抢课开始时间，系统将在指定时间自动开始抢课</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs sm:text-sm text-muted-foreground">抢课时间</label>
                <Input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="text-xs sm:text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setScheduledTime('')
                    setShowScheduleDialog(false)
                  }}
                  variant="outline"
                  className="btn-hover text-xs sm:text-sm flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={() => {
                    if (scheduledTime && new Date(scheduledTime).getTime() > Date.now()) {
                      setShowScheduleDialog(false)
                      toast.success(`已设定定时抢课时间：${new Date(scheduledTime).toLocaleString('zh-CN')}`)
                    } else if (scheduledTime) {
                      toast.error('定时时间必须晚于当前时间')
                    } else {
                      setShowScheduleDialog(false)
                    }
                  }}
                  className="btn-hover text-xs sm:text-sm flex-1"
                >
                  确定
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 搜索框 - 只有激活后才能使用 */}
      {isServerSelectionActivated && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              placeholder="搜索课程名称、教师姓名或课程类别..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-10 text-xs sm:text-sm"
            />
          </div>
        </motion.div>
      )}

      {/* 课程列表 - 只有激活后才能显示和操作 */}
      {isServerSelectionActivated ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isLoading ? (
            <Card className="glass">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">正在加载课程...</p>
              </CardContent>
            </Card>
          ) : filteredCourses.length === 0 ? (
            <Card className="glass">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? '没有找到匹配的课程' : '暂无可选课程'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {filteredCourses.map((course) => {
                const courseKey = `${course.kch_id}_${course.jxb_id}`
                const isGrabbing = grabbingCourses.has(courseKey)
                const selectedCount = parseInt(course.selected_count || course.yxzrs || course.selected || '0')
                const maxCapacity = parseInt(course.max_capacity || course.bjrs || course.capacity || '0')
                
                return (
                  <Card key={courseKey} className="glass hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base sm:text-lg font-semibold text-white">{course.kcmc}</h3>
                            <Badge variant="outline" className="text-xs">
                              {course.kclb || '未知'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{course.jsxm || '未知'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{course.sksj || '未知'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{course.xf || '0'} 学分</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{selectedCount}/{maxCapacity}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => grabCourse(course)}
                          disabled={isGrabbing}
                          className="btn-hover text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap"
                        >
                          {isGrabbing ? (
                            <>
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                              <span className="hidden sm:inline">抢课中...</span>
                              <span className="sm:hidden">抢课中</span>
                            </>
                          ) : (
                            <>
                              <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">抢课</span>
                              <span className="sm:hidden">抢</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass border-yellow-500/50">
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">需要激活才能使用</h3>
              <p className="text-sm text-muted-foreground mb-4">
                请先在上方输入激活码激活服务器端抢课功能，激活后即可使用抢课Pro+功能
              </p>
              <Button
                onClick={() => {
                  // 滚动到激活区域
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                variant="outline"
                className="btn-hover"
              >
                <Shield className="h-4 w-4 mr-2" />
                前往激活
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 服务器端抢课任务列表 */}
      {isServerSelectionActivated && serverTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                    <Server className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span>服务器端抢课任务</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    查看和管理服务器端抢课任务
                  </CardDescription>
                </div>
                <Button
                  onClick={loadUserTasks}
                  variant="outline"
                  size="sm"
                  className="btn-hover text-xs sm:text-sm"
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">刷新</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 space-y-3">
              {serverTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={
                            task.status === 'running' ? 'text-yellow-400 border-yellow-400' :
                            task.status === 'completed' ? 'text-green-400 border-green-400' :
                            task.status === 'failed' ? 'text-red-400 border-red-400' :
                            task.status === 'pending' ? 'text-blue-400 border-blue-400' :
                            'text-gray-400 border-gray-400'
                          }
                        >
                          {task.status === 'pending' ? '等待中' :
                           task.status === 'running' ? '运行中' :
                           task.status === 'completed' ? '已完成' :
                           task.status === 'failed' ? '失败' :
                           '已取消'}
                        </Badge>
                        {task.scheduledTime && task.scheduledTime > Date.now() && (
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            <Clock className="h-3 w-3 mr-1" />
                            定时: {new Date(task.scheduledTime).toLocaleString('zh-CN')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                        <p>课程数: {task.courses?.length || 0} | 尝试次数: {task.attemptCount || 0}</p>
                        {task.courses && task.courses.length > 0 && (
                          <p className="text-white">课程: {task.courses.map((c: any) => c.kcmc || c.name).join(', ')}</p>
                        )}
                        {task.result && (
                          <div className="mt-2">
                            <p className={task.result.success ? 'text-green-400' : 'text-red-400'}>
                              {task.result.message}
                            </p>
                            {task.result.data && task.result.data.flag && (
                              <p className="text-gray-500 text-xs mt-1">
                                {task.result.data.flag === '1' ? '✅ 选课成功 (flag=1)' : `状态: flag=${task.result.data.flag}`}
                              </p>
                            )}
                          </div>
                        )}
                        {task.createdAt && (
                          <p className="text-gray-500 text-xs">
                            创建时间: {new Date(task.createdAt).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                    </div>
                    {(task.status === 'pending' || task.status === 'running') && (
                      <Button
                        onClick={() => cancelServerTask(task.id)}
                        variant="destructive"
                        size="sm"
                        className="btn-hover text-xs sm:text-sm whitespace-nowrap"
                      >
                        <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">暂停</span>
                        <span className="sm:hidden">暂停</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
