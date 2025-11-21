'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Square,
  Clock,
  CheckCircle,
  Loader2,
  Server,
  Shield,
  RefreshCw,
  Search,
  BookOpen,
  Timer
} from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI, getApiUrl } from '@/lib/api'
import { useCourseStore } from '@/lib/course-store'
import { useStudentStore } from '@/lib/student-store'
import { CourseCard } from './CourseInfoPage'

interface Course {
  kch_id: string
  kcmc: string
  jxb_id: string
  jsxm: string
  kclb: string
  xf: string
  sksj: string
  skdd: string
  bjrs: string
  yxrs: string
  kkxy: string
  kkzy: string
  kkxq: string
  kkzc: string
  kkdm: string
  kkmm: string
  kkms: string
  kkzt: string
  kkztmc: string
  kkztms: string
  do_jxb_id?: string
  jxbzls?: string
  _rwlx?: string
  _xklc?: string
  _xkly?: string
  _xkkz_id?: string
  [key: string]: any
}

export default function CourseSelectionPage() {
  // 课程相关状态
  const {
    availableCourses,
    setAvailableCourses,
    clearAvailableCourses
  } = useCourseStore()
  
  const { studentInfo } = useStudentStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [grabbingCourses, setGrabbingCourses] = useState<Set<string>>(new Set())
  
  // 服务器端抢课相关状态
  const [useServerSelection, setUseServerSelection] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  const [isActivated, setIsActivated] = useState(false)
  const [serverTasks, setServerTasks] = useState<any[]>([])
  const [isLoadingActivation, setIsLoadingActivation] = useState(false)
  const [scheduledTime, setScheduledTime] = useState<string>('') // 定时抢课时间
  const [showScheduleDialog, setShowScheduleDialog] = useState(false) // 显示时间选择对话框

  // 获取可选课程
  const fetchAvailableCourses = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && availableCourses.length > 0) {
      console.log('📦 可选课程已缓存，跳过请求')
      return
    }
    
    setIsLoading(true)
    try {
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.getAvailableCourses(currentSchool.id, { forceRefresh }) as any
      if (response.success) {
        setAvailableCourses(response.data || [])
        toast.success(`获取到 ${response.data?.length || 0} 门可选课程`)
      } else {
        const errorMsg = response.error || '获取可选课程失败'
        toast.error(errorMsg)
      }
    } catch (error: any) {
      const errorMessage = error.message || '获取可选课程失败'
      if (errorMessage.includes('Cookie未设置')) {
        toast.error('请先配置Cookie', {
          duration: 5000
        })
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }, [availableCourses.length, setAvailableCourses])

  // 抢课函数
  const grabCourse = useCallback(async (course: Course) => {
    const courseKey = `${course.kch_id}_${course.jxb_id}`
    setGrabbingCourses(prev => new Set(prev).add(courseKey))
    
    try {
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      
      // 如果开启了服务器端抢课且已激活，提交到服务器端任务
      if (useServerSelection && isActivated) {
        console.log('✅ 使用服务器端抢课模式')
        
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
        console.log('📤 提交到服务器端任务:', {
          userId,
          schoolId: currentSchool.id,
          course: course.kcmc,
          scheduledTime: scheduledTimestamp
        })
        
        try {
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
                // 保存完整的课程数据，包括参数
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
          console.log('📥 服务器端任务响应:', result)
          
          if (result.success) {
            if (scheduledTime) {
              const timeStr = new Date(scheduledTime).toLocaleString('zh-CN')
              toast.success(`课程 "${course.kcmc}" 已设定定时抢课任务（${timeStr}）！`)
            } else {
              toast.success(`课程 "${course.kcmc}" 已提交到服务器端抢课任务！服务器将持续尝试抢课。`)
            }
            loadUserTasks() // 刷新任务列表
          } else {
            toast.error(result.message || '提交服务器端任务失败')
          }
        } catch (error: any) {
          console.error('❌ 提交服务器端任务失败:', error)
          toast.error('提交服务器端任务失败: ' + (error.message || '网络错误'))
        }
        
        setGrabbingCourses(prev => {
          const newSet = new Set(prev)
          newSet.delete(courseKey)
          return newSet
        })
        return
      }
      
      // 本地抢课
      console.log('⚠️ 使用本地抢课模式（浏览器端）')
      
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
        fetchAvailableCourses(true) // 刷新课程列表
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
  }, [useServerSelection, isActivated, scheduledTime, fetchAvailableCourses])

  // 过滤课程
  const filteredCourses = useMemo(() => {
    if (!searchTerm) return availableCourses
    
    const lowerSearchTerm = searchTerm.toLowerCase()
    return availableCourses.filter(course => {
      if (!course) return false
      const courseName = course.kcmc || ''
      const teacherName = course.jsxm || ''
      const category = course.kclb || ''
      
      return courseName.toLowerCase().includes(lowerSearchTerm) ||
             teacherName.toLowerCase().includes(lowerSearchTerm) ||
             category.toLowerCase().includes(lowerSearchTerm)
    })
  }, [availableCourses, searchTerm])

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
        const response = await fetch(getApiUrl(`/activation/verify?userId=${userId}`))
        const result = await response.json()
        if (result.success && result.activated) {
          setIsActivated(true)
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
          code: activationCode.trim().replace(/\s+/g, ''),
          userId
        })
      })

      const result = await response.json()
      
      if (result.success) {
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
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isActivated, serverTasks, loadUserTasks])

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

  // 初始化加载课程
  useEffect(() => {
    fetchAvailableCourses()
  }, [fetchAvailableCourses])

  // 如果没有学生信息，显示提示
  if (!studentInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="glass max-w-md w-full">
            <CardContent className="p-4 sm:p-8 text-center">
              <div className="mb-4">
                <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">请先配置Cookie</h3>
                <p className="text-xs sm:text-base text-muted-foreground mb-4 sm:mb-6">
                  您需要先在"系统设置"页面配置有效的Cookie才能查看课程信息
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 如果未激活服务器端抢课功能，显示激活提示
  if (!isActivated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="glass max-w-md w-full">
            <CardHeader className="p-4 sm:p-8 text-center">
              <div className="mb-4">
                <Shield className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-yellow-400 mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">需要激活码</h3>
                <p className="text-xs sm:text-base text-muted-foreground mb-4 sm:mb-6">
                  抢课Pro+功能需要激活码才能使用，请输入激活码激活功能
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-8 space-y-4">
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
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">🎯 抢课Pro+</h2>
          <p className="text-xs sm:text-base text-muted-foreground">手动选择课程进行抢课，支持本地和服务器端抢课</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            onClick={() => fetchAvailableCourses(true)}
            disabled={isLoading}
            variant="default"
            className="btn-hover text-xs sm:text-sm px-3 sm:px-4"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
            ) : (
              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            )}
            <span className="hidden sm:inline">查询可选课程</span>
            <span className="sm:hidden">查询</span>
          </Button>
        </div>
      </motion.div>

      {/* 服务器端抢课功能 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setUseServerSelection(!useServerSelection)}
                    variant={useServerSelection ? "default" : "outline"}
                    className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
                  >
                    <Server className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">服务器抢课</span>
                    <span className="sm:hidden">服务器</span>
                  </Button>
                  {useServerSelection && (
                    <Button
                      onClick={() => setShowScheduleDialog(!showScheduleDialog)}
                      variant="outline"
                      className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
                    >
                      <Timer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">{scheduledTime ? '修改时间' : '设定时间'}</span>
                      <span className="sm:hidden">时间</span>
                    </Button>
                  )}
                  {useServerSelection && scheduledTime && (
                    <div className="flex items-center px-2 py-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(scheduledTime).toLocaleString('zh-CN')}
                    </div>
                  )}
                  <Button
                    onClick={loadUserTasks}
                    variant="outline"
                    size="sm"
                    className="btn-hover text-xs sm:text-sm"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">刷新任务</span>
                    <span className="sm:hidden">刷新</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 时间选择对话框 */}
      {showScheduleDialog && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">设定定时抢课时间</CardTitle>
            <CardDescription className="text-xs sm:text-sm">选择抢课开始时间，系统将在指定时间自动开始抢课</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
      )}

      {/* 搜索和筛选 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              placeholder="搜索课程名称、教师姓名或课程类别..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-10 text-xs sm:text-sm"
            />
          </div>
        </div>
      </motion.div>

      {/* 课程列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">可选课程</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              点击"抢课"按钮进行抢课，{useServerSelection && isActivated ? '将提交到服务器端持续抢课' : '在浏览器端抢课'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">正在加载课程...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? '没有找到匹配的课程' : '暂无可用课程，请点击"查询可选课程"按钮获取'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredCourses.map((course) => {
                  const courseKey = `${course.kch_id}_${course.jxb_id}`
                  return (
                    <CourseCard
                      key={courseKey}
                      course={course}
                      onGrab={() => grabCourse(course)}
                      isGrabbing={grabbingCourses.has(courseKey)}
                      showGrabButton={true}
                      isMultiSelectMode={false}
                      isSelected={false}
                    />
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 服务器端抢课任务列表 */}
      {isActivated && serverTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Server className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>服务器端抢课任务</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                查看和管理服务器端抢课任务
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-3">
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
                          {task.scheduledTime && task.scheduledTime > Date.now() && (
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              定时: {new Date(task.scheduledTime).toLocaleString('zh-CN')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 space-y-1">
                          <p>课程数: {task.courses?.length || 0} | 尝试次数: {task.attemptCount || 0}</p>
                          {task.courses && task.courses.length > 0 && (
                            <div className="mt-1">
                              {task.courses.map((c: any, idx: number) => (
                                <p key={idx} className="text-gray-300">• {c.name || c.kcmc || `${c.kch}-${c.kxh}`}</p>
                              ))}
                            </div>
                          )}
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
                          {task.createdAt && (
                            <p className="text-gray-500">创建时间: {new Date(task.createdAt).toLocaleString('zh-CN')}</p>
                          )}
                        </div>
                      </div>
                      {(task.status === 'pending' || task.status === 'running') && (
                        <Button
                          onClick={() => cancelServerTask(task.id)}
                          variant="destructive"
                          size="sm"
                          className="btn-hover"
                        >
                          <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">暂停</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
