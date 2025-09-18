'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Target, 
  Settings, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  LogIn
} from '@/components/ui/optimized-icons'
import toast from 'react-hot-toast'
import PerformanceMonitor from '@/components/ui/PerformanceMonitor'
import AutoLoginModal from '@/components/AutoLoginModal'
import WelcomeAnimation from '@/components/ui/WelcomeAnimation'

// 懒加载页面组件
const CourseInfoPage = lazy(() => import('@/components/pages/CourseInfoPage'))
const CourseSelectionPage = lazy(() => import('@/components/pages/CourseSelectionPage'))
const SchedulePage = lazy(() => import('@/components/pages/SchedulePage'))
const SettingsPage = lazy(() => import('@/components/pages/SettingsPage'))

// 导入API和状态管理
import { courseAPI } from '@/lib/api'
import { useStudentStore } from '@/lib/student-store'
import { CookieValidator } from '@/lib/cookie-validator'

export default function Home() {
  const [activeTab, setActiveTab] = useState('courses') // 默认显示课程信息页面
  const [isLoading, setIsLoading] = useState(true)
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [showAutoLogin, setShowAutoLogin] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showTopBar, setShowTopBar] = useState(false)
  
  // 学生信息状态
  const { 
    studentInfo, 
    hasShownWelcome, 
    isFirstVisit, 
    setStudentInfo, 
    setHasShownWelcome, 
    setIsFirstVisit 
  } = useStudentStore()

  // 检查服务器状态和Cookie配置
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        // 首先验证Cookie有效性并清理无效数据
        await CookieValidator.initialize()
        
        const response = await courseAPI.healthCheck() as any
        if (response.status === 'healthy') {
          setServerStatus('online')
          toast.success('后端服务器连接成功')
          
          // 检查Cookie是否已配置
          const configResponse = await courseAPI.getConfig() as any
          if (configResponse.success && !configResponse.data.has_cookie) {
            toast.error('请先配置Cookie', {
              duration: 8000
            })
            // 清理所有缓存数据
            CookieValidator.clearAllCache()
          } else if (configResponse.success && configResponse.data.has_cookie) {
            // 如果有Cookie，验证有效性并获取学生信息
            const isValid = await CookieValidator.validateCookie(configResponse.data.cookie)
            if (isValid) {
              await fetchStudentInfo()
            } else {
              toast.error('Cookie已失效，请重新配置', {
                duration: 8000
              })
              CookieValidator.clearAllCache()
            }
          }
        } else {
          setServerStatus('offline')
          toast.error('后端服务器状态异常')
        }
      } catch (error) {
        setServerStatus('offline')
        toast.error('无法连接到后端服务器')
        console.error('服务器连接失败:', error)
        // 连接失败时也清理缓存
        CookieValidator.clearAllCache()
      } finally {
        setIsLoading(false)
      }
    }

    checkServerStatus()
  }, [])

  // 获取学生信息
  const fetchStudentInfo = async () => {
    try {
      const response = await courseAPI.getStudentInfo() as any
      if (response.success && response.data) {
        const studentData = {
          name: response.data.name || '未知',
          studentId: response.data.studentId || '',
          major: response.data.major || '',
          grade: response.data.grade || '',
          college: response.data.college || ''
        }
        setStudentInfo(studentData)
        console.log('学生信息获取成功:', studentData)
      }
    } catch (error) {
      console.error('获取学生信息失败:', error)
    }
  }

  // 刷新所有数据
  const handleRefreshAll = async () => {
    toast.loading('正在刷新数据...', { id: 'refresh' })
    try {
      // 这里可以添加刷新逻辑
      await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟刷新
      toast.success('数据刷新完成', { id: 'refresh' })
    } catch (error) {
      toast.error('数据刷新失败', { id: 'refresh' })
    }
  }

  // 自动登录成功处理
  const handleAutoLoginSuccess = async () => {
    // 自动登录成功后刷新服务器状态
    try {
      const response = await courseAPI.healthCheck() as any
      if (response.status === 'healthy') {
        setServerStatus('online')
        toast.success('自动登录成功，Cookie已更新')
        // 获取学生信息
        await fetchStudentInfo()
      }
    } catch (error) {
      console.error('检查服务器状态失败:', error)
    }
  }

  // 处理页面切换
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
  }

  // 欢迎动画完成处理
  const handleWelcomeComplete = () => {
    setShowWelcome(false)
    setShowTopBar(true) // 确保顶部栏显示
  }

  // 监听学生信息变化，自动显示欢迎动画
  useEffect(() => {
    if (studentInfo && isFirstVisit && !hasShownWelcome) {
      console.log('🎉 检测到学生信息更新，准备显示欢迎动画:', studentInfo.name)
      setShowWelcome(true)
      // 延迟更新状态，确保动画能正常显示
      setTimeout(() => {
        setHasShownWelcome(true)
        setIsFirstVisit(false)
      }, 100)
    }
  }, [studentInfo, isFirstVisit, hasShownWelcome])

  // 监听学生信息变化，确保顶部栏显示
  useEffect(() => {
    if (studentInfo && !showTopBar) {
      console.log('📌 确保顶部学生信息栏显示:', studentInfo.name)
      setShowTopBar(true)
    }
  }, [studentInfo, showTopBar])

  // 监听自定义事件，显示欢迎动画
  useEffect(() => {
    const handleShowWelcomeAnimation = (event: CustomEvent) => {
      console.log('🎉 收到显示欢迎动画事件:', event.detail)
      setShowWelcome(true)
      setHasShownWelcome(true)
      setIsFirstVisit(false)
    }

    window.addEventListener('showWelcomeAnimation', handleShowWelcomeAnimation as EventListener)
    
    return () => {
      window.removeEventListener('showWelcomeAnimation', handleShowWelcomeAnimation as EventListener)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            duration: 0.8,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className="text-center"
        >
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            className="mb-6"
          >
            <BookOpen className="h-16 w-16 text-primary mx-auto" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">正在启动选课工具</h2>
            <p className="text-muted-foreground mb-4">检查服务器连接中...</p>
          </motion.div>
          
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.5, duration: 2, ease: "easeInOut" }}
            className="h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto max-w-xs"
          />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen particles-bg">
      {/* 欢迎动画 - 固定在整个页面顶部 */}
      {(showWelcome && studentInfo) || showTopBar ? (
        <WelcomeAnimation
          studentName={studentInfo?.name || ''}
          onAnimationComplete={handleWelcomeComplete}
          showTopBar={showTopBar}
        />
      ) : null}
      {/* 头部导航 */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          duration: 0.8,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        className={`bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 p-4 relative transition-all duration-300 shadow-sm ${
          (showWelcome && studentInfo) || showTopBar ? 'mt-20' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-4"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                <BookOpen className="h-8 w-8 text-primary" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                TYUST选课工具
              </h1>
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {serverStatus === 'online' && (
                <motion.div 
                  className="flex items-center space-x-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <motion.div
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">在线</span>
                </motion.div>
              )}
              {serverStatus === 'offline' && (
                <motion.div 
                  className="flex items-center space-x-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-full"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <motion.div
                    className="w-2 h-2 bg-red-500 rounded-full"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1]
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">离线</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex items-center space-x-3"
          >
            {/* 自动登录按钮 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Button
                onClick={() => setShowAutoLogin(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
                <LogIn className="h-4 w-4 mr-2 relative z-10" />
                <span className="relative z-10">自动登录</span>
              </Button>
            </motion.div>
            
            {/* 刷新按钮 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Button
                onClick={handleRefreshAll}
                variant="outline"
                className="btn-hover relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
                <RefreshCw className="h-4 w-4 mr-2 relative z-10" />
                <span className="relative z-10">刷新数据</span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto p-6 relative">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <TabsList className="inline-flex w-full max-w-full mx-auto mb-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 shadow-lg">
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="courses" className="flex items-center justify-center space-x-4 relative overflow-hidden h-16 px-8 py-4 rounded-lg text-base font-medium transition-all duration-200 data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-900/30 data-[state=active]:text-green-700 dark:data-[state=active]:text-green-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                  <BookOpen className="h-6 w-6 relative z-10" />
                  <span className="relative z-10">课程信息</span>
                </TabsTrigger>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="schedule" className="flex items-center justify-center space-x-4 relative overflow-hidden h-16 px-8 py-4 rounded-lg text-base font-medium transition-all duration-200 data-[state=active]:bg-orange-100 dark:data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                  <Calendar className="h-6 w-6 relative z-10" />
                  <span className="relative z-10">我的课表</span>
                </TabsTrigger>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="selection" className="flex items-center justify-center space-x-4 relative overflow-hidden h-16 px-8 py-4 rounded-lg text-base font-medium transition-all duration-200 data-[state=active]:bg-pink-100 dark:data-[state=active]:bg-pink-900/30 data-[state=active]:text-pink-700 dark:data-[state=active]:text-pink-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-lg"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                  <Target className="h-6 w-6 relative z-10" />
                  <span className="relative z-10">智能选课</span>
                </TabsTrigger>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="settings" className="flex items-center justify-center space-x-4 relative overflow-hidden h-16 px-8 py-4 rounded-lg text-base font-medium transition-all duration-200 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800/50 data-[state=active]:text-gray-700 dark:data-[state=active]:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-lg"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                  <Settings className="h-6 w-6 relative z-10" />
                  <span className="relative z-10">系统设置</span>
                </TabsTrigger>
              </motion.div>
            </TabsList>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ 
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              
              <TabsContent value="courses" className="mt-0">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-8 w-8 text-green-400" />
                    </motion.div>
                  </div>
                }>
                  <CourseInfoPage />
                </Suspense>
              </TabsContent>
              
              <TabsContent value="schedule" className="mt-0">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-8 w-8 text-purple-400" />
                    </motion.div>
                  </div>
                }>
                  <SchedulePage />
                </Suspense>
              </TabsContent>
              
              <TabsContent value="selection" className="mt-0">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-8 w-8 text-pink-400" />
                    </motion.div>
                  </div>
                }>
                  <CourseSelectionPage />
                </Suspense>
              </TabsContent>
              
              <TabsContent value="settings" className="mt-0">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-8 w-8 text-gray-400" />
                    </motion.div>
                  </div>
                }>
                  <SettingsPage />
                </Suspense>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>
      
      {/* 自动登录模态框 */}
      <AutoLoginModal
        isOpen={showAutoLogin}
        onClose={() => setShowAutoLogin(false)}
        onSuccess={handleAutoLoginSuccess}
      />
      
      
      {/* 性能监控组件 */}
      <PerformanceMonitor />
    </div>
  )
}
