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
  LogIn,
  Award
} from '@/components/ui/optimized-icons'
import { School, Menu, X, Shield, MessageSquare, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import PerformanceMonitor from '@/components/ui/PerformanceMonitor'
import AutoLoginModal from '@/components/AutoLoginModal'
import WelcomeAnimation from '@/components/ui/WelcomeAnimation'
import AdminLoginModal from '@/components/AdminLoginModal'
import AnnouncementModal from '@/components/AnnouncementModal'
import SuggestionModal from '@/components/SuggestionModal'

// 懒加载页面组件
const CourseInfoPage = lazy(() => import('@/components/pages/CourseInfoPage'))
const CourseSelectionPage = lazy(() => import('@/components/pages/CourseSelectionPage'))
const ModernSchedulePage = lazy(() => import('@/components/pages/ModernSchedulePage'))
const SettingsPage = lazy(() => import('@/components/pages/SettingsPage'))
const SchoolSelectPage = lazy(() => import('@/components/pages/SchoolSelectPage'))
const GradePage = lazy(() => import('@/components/pages/GradePage'))
const AdminPage = lazy(() => import('@/components/pages/AdminPage'))

// 导入API和状态管理
import { courseAPI } from '@/lib/api'
import { useStudentStore } from '@/lib/student-store'
import { CookieValidator } from '@/lib/cookie-validator'
import LocalCookieManager from '@/lib/local-cookie-manager'
import { getCurrentSchool } from '@/lib/global-school-state'
import { recordVisit } from '@/lib/visit-tracker'
import { useDeviceDetection, getAnimationConfig } from '@/lib/device-detector'

export default function Home() {
  // 设备检测和动画配置
  const { isMobile, isLowPerformance } = useDeviceDetection()
  const animationConfig = getAnimationConfig(isMobile, isLowPerformance)
  const [activeTab, setActiveTab] = useState('courses') // 默认显示课程信息页面
  const [isLoading, setIsLoading] = useState(true)
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [showAutoLogin, setShowAutoLogin] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showTopBar, setShowTopBar] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [hasUnviewedAnnouncements, setHasUnviewedAnnouncements] = useState(false)
  
  // 学生信息状态
  const { 
    studentInfo, 
    hasShownWelcome, 
    isFirstVisit, 
    setStudentInfo, 
    setHasShownWelcome, 
    setIsFirstVisit 
  } = useStudentStore()

  // 检查本地Cookie和服务器状态
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 记录访问（只记录一次）
        recordVisit()
        
        // 强制同步学校列表（确保后台添加的学校能被使用）
        try {
          const { getSupportedSchoolsAsync } = await import('@/lib/global-school-state')
          await getSupportedSchoolsAsync(true)
          console.log('✅ 学校列表已同步')
        } catch (error) {
          console.warn('⚠️ 同步学校列表失败，使用本地缓存:', error)
        }
        
        // 初始化学校配置
        const currentSchool = getCurrentSchool()
        console.log(`🏫 应用启动 - 当前学校配置: ${currentSchool.name} (${currentSchool.domain})`)
        console.log(`🔍 检查localStorage中的学校ID: ${typeof window !== 'undefined' ? localStorage.getItem('selected-school-id') : 'N/A'}`)
        
        // 首先验证Cookie有效性并清理无效数据
        await CookieValidator.initialize()
        
        // 1. 优先检查本地localStorage中的Cookie
        const localCookie = LocalCookieManager.getCookie()
        const localUserInfo = LocalCookieManager.getUserInfo()
        
        if (localCookie && localUserInfo) {
          console.log('🔄 从本地存储恢复Cookie和用户信息')
          setStudentInfo(localUserInfo)
          
          // 验证本地Cookie是否仍然有效
          try {
            const response = await courseAPI.healthCheck() as any
            if (response.status === 'healthy') {
              setServerStatus('online')
              console.log('✅ 本地Cookie恢复成功，服务器在线')
            } else {
              setServerStatus('offline')
              console.log('⚠️ 服务器离线，但本地数据已恢复')
            }
          } catch (error) {
            console.error('服务器连接失败:', error)
            setServerStatus('offline')
            // 即使服务器离线，也保持本地数据
            console.log('⚠️ 服务器离线，使用本地缓存数据')
          }
        } else {
          // 2. 如果本地没有Cookie，检查是否过期
          console.log('📝 本地无Cookie或已过期，需要重新配置')
          const response = await courseAPI.healthCheck() as any
          if (response.status === 'healthy') {
            setServerStatus('online')
            console.log('✅ 后端服务器连接成功')
            toast.error('请先配置Cookie', { duration: 8000 })
          } else {
            setServerStatus('offline')
            toast.error('后端服务器连接失败')
          }
        }
      } catch (error) {
        console.error('应用初始化失败:', error)
        setServerStatus('offline')
        toast.error('无法连接到后端服务器')
        CookieValidator.clearAllCache()
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

  // 获取学生信息
  const fetchStudentInfo = async () => {
    try {
      // 获取当前选中的学校ID
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.getStudentInfo(undefined, currentSchool.id) as any
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
  // 定义菜单项
  const menuItems = [
    { value: 'courses', label: '课程信息', icon: BookOpen, color: 'green' },
    { value: 'schedule', label: '我的课表', icon: Calendar, color: 'orange' },
    { value: 'selection', label: '抢课Pro+', icon: Target, color: 'pink' },
    { value: 'grade', label: '成绩查询', icon: Award, color: 'amber' },
    { value: 'school', label: '学校选择', icon: School, color: 'blue' },
    { value: 'settings', label: '系统设置', icon: Settings, color: 'gray' },
  ]

  const handleTabChange = (newTab: string) => {
    // 如果切换到管理页面但未登录，显示登录框
    if (newTab === 'admin' && !isAdminLoggedIn) {
      setShowAdminLogin(true)
      return
    }
    setActiveTab(newTab)
    setShowMobileMenu(false) // 选择后关闭移动端菜单
  }

  // 检查管理员登录状态（从 localStorage）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminLoggedIn = localStorage.getItem('admin-logged-in') === 'true'
      setIsAdminLoggedIn(adminLoggedIn)
    }
  }, [])

  // 保存管理员登录状态
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin-logged-in', 'true')
    }
    setShowAdminLogin(false)
    setActiveTab('admin')
    setShowMobileMenu(false)
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

  // 检查未查看公告
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkUnviewedAnnouncements = async () => {
      try {
        // 从 localStorage 读取已查看的公告
        const viewedIds = new Set(JSON.parse(localStorage.getItem('viewed-announcements') || '[]'))
        
        // 获取所有活跃公告
        const response = await fetch(`/api/admin/announcements?activeOnly=true&t=${Date.now()}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          // 检查是否有未查看的公告
          const unviewed = result.data.filter((a: any) => !viewedIds.has(a.id))
          setHasUnviewedAnnouncements(unviewed.length > 0)
        }
      } catch (error) {
        console.warn('检查未查看公告失败:', error)
      }
    }

    checkUnviewedAnnouncements()
    // 每30秒检查一次
    const interval = setInterval(checkUnviewedAnnouncements, 30 * 1000)
    return () => clearInterval(interval)
  }, [])

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
      {/* 公告弹窗 */}
      <AnnouncementModal forceShowHistory={showAnnouncements} onCloseHistory={() => setShowAnnouncements(false)} />
      
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
        initial={animationConfig.enabled ? { y: -100, opacity: 0 } : false}
        animate={animationConfig.enabled ? { y: 0, opacity: 1 } : {}}
        transition={animationConfig.enabled ? { 
          duration: animationConfig.duration,
          ease: [0.25, 0.46, 0.45, 0.94]
        } : {}}
        className={`bg-white/80 dark:bg-gray-900/80 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-xl'} border-b border-gray-200/50 dark:border-gray-700/50 p-2 sm:p-4 relative transition-all duration-300 shadow-sm ${
          (showWelcome && studentInfo) || showTopBar ? 'mt-20' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <motion.div 
            className="flex items-center space-x-2 sm:space-x-4"
            initial={animationConfig.enabled ? { x: -50, opacity: 0 } : false}
            animate={animationConfig.enabled ? { x: 0, opacity: 1 } : {}}
            transition={animationConfig.enabled ? { delay: animationConfig.reduceMotion ? 0 : 0.2, duration: animationConfig.duration } : {}}
          >
            <motion.div 
              className="flex items-center space-x-1 sm:space-x-2"
              whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {animationConfig.reduceMotion ? (
                <BookOpen className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
              ) : (
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
                  <BookOpen className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
                </motion.div>
              )}
              <h1 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white">
                正方教务工具
              </h1>
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-1 sm:space-x-2"
              initial={animationConfig.enabled ? { opacity: 0, scale: 0.8 } : false}
              animate={animationConfig.enabled ? { opacity: 1, scale: 1 } : {}}
              transition={animationConfig.enabled ? { delay: animationConfig.reduceMotion ? 0 : 0.4, duration: animationConfig.duration } : {}}
            >
              {serverStatus === 'online' && (
                <motion.div 
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full"
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
                  <span className="text-[10px] sm:text-sm font-medium text-green-700 dark:text-green-300">在线</span>
                </motion.div>
              )}
              {serverStatus === 'offline' && (
                <motion.div 
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-full"
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
                  <span className="text-[10px] sm:text-sm font-medium text-red-700 dark:text-red-300">离线</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={animationConfig.enabled ? { x: 50, opacity: 0 } : false}
            animate={animationConfig.enabled ? { x: 0, opacity: 1 } : {}}
            transition={animationConfig.enabled ? { delay: animationConfig.reduceMotion ? 0 : 0.3, duration: animationConfig.duration } : {}}
            className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto"
          >
            {/* 自动登录按钮 */}
            <motion.div
              whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05 }}
              whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Button
                onClick={() => setShowAutoLogin(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white relative overflow-hidden text-[10px] sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
              >
                {!animationConfig.disableHoverEffects && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                )}
                <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-2 relative z-10" />
                <span className="relative z-10 hidden sm:inline">自动登录</span>
                <span className="relative z-10 sm:hidden">登录</span>
              </Button>
            </motion.div>
            
            {/* 后台管理按钮 */}
            <motion.div
              whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05 }}
              whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Button
                onClick={() => {
                  console.log('📢 点击查看公告按钮')
                  setShowAnnouncements(true)
                }}
                variant="outline"
                className="border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300 text-[10px] sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 relative"
              >
                <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-2" />
                <span className="hidden sm:inline">查看公告</span>
                <span className="sm:hidden">公告</span>
                {hasUnviewedAnnouncements && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </Button>
            </motion.div>
            <motion.div
              whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05 }}
              whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Button
                onClick={() => setShowSuggestionModal(true)}
                variant="outline"
                className="border-blue-500/50 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 text-[10px] sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
              >
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-2" />
                <span className="hidden sm:inline">建议反馈</span>
                <span className="sm:hidden">建议</span>
              </Button>
            </motion.div>
            <motion.div
              whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05 }}
              whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Button
                onClick={() => {
                  if (isAdminLoggedIn) {
                    setActiveTab('admin')
                    setShowMobileMenu(false)
                  } else {
                    setShowAdminLogin(true)
                  }
                }}
                variant="outline"
                className="border-purple-500/50 hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 text-[10px] sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
              >
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-2" />
                <span className="hidden sm:inline">管理</span>
                <span className="sm:hidden">管理</span>
              </Button>
            </motion.div>
            
            {/* 刷新按钮 */}
            <motion.div
              whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05 }}
              whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Button
                onClick={handleRefreshAll}
                variant="outline"
                className="btn-hover relative overflow-hidden text-[10px] sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
              >
                {!animationConfig.disableHoverEffects && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                )}
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-2 relative z-10" />
                <span className="relative z-10 hidden sm:inline">刷新数据</span>
                <span className="relative z-10 sm:hidden">刷新</span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>

      {/* 主要内容 */}
      <main className="w-full max-w-full lg:max-w-[78vw] mx-auto p-1.5 sm:p-4 relative rounded-2xl overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* 移动端菜单按钮 */}
          <motion.div
            className="block sm:hidden mb-2"
            initial={animationConfig.enabled ? { opacity: 0, y: -10 } : false}
            animate={animationConfig.enabled ? { opacity: 1, y: 0 } : {}}
          >
            <Button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`w-full bg-white/80 dark:bg-gray-900/80 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-xl'} border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-2 h-9 text-xs font-medium flex items-center justify-center gap-2`}
              variant="outline"
            >
              {showMobileMenu ? (
                <>
                  <X className="h-4 w-4" />
                  <span>关闭菜单</span>
                </>
              ) : (
                <>
                  <Menu className="h-4 w-4" />
                  <span>功能菜单</span>
                </>
              )}
            </Button>
          </motion.div>

          {/* 移动端菜单抽屉 */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.div
                initial={animationConfig.enabled ? { opacity: 0, y: -20 } : false}
                animate={animationConfig.enabled ? { opacity: 1, y: 0 } : {}}
                exit={animationConfig.enabled ? { opacity: 0, y: -20 } : {}}
                transition={{ duration: animationConfig.duration }}
                className={`block sm:hidden mb-3 bg-white/80 dark:bg-gray-900/80 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-xl'} border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-2 shadow-lg`}
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.value
                    const colorClasses: Record<string, string> = {
                      green: isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : '',
                      orange: isActive ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : '',
                      pink: isActive ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' : '',
                      amber: isActive ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : '',
                      blue: isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : '',
                      gray: isActive ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300' : '',
                      yellow: isActive ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : '',
                    }
                    return (
                      <motion.button
                        key={item.value}
                        onClick={() => handleTabChange(item.value)}
                        className={`flex items-center gap-1.5 p-1.5 rounded-md text-[10px] font-medium transition-all ${
                          isActive
                            ? colorClasses[item.color] || ''
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </motion.button>
                    )
                  })}
                  {/* 查看公告按钮 */}
                  <motion.button
                    onClick={() => {
                      setShowAnnouncements(true)
                      setShowMobileMenu(false)
                    }}
                    className="flex items-center gap-1.5 p-1.5 rounded-md text-[10px] font-medium transition-all text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                    whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.02 }}
                    whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.98 }}
                  >
                    <Bell className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">查看公告</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 桌面端标签栏 */}
          <motion.div
            initial={animationConfig.enabled ? { y: 20, opacity: 0 } : false}
            animate={animationConfig.enabled ? { y: 0, opacity: 1 } : {}}
            transition={animationConfig.enabled ? { delay: animationConfig.reduceMotion ? 0 : 0.4, duration: animationConfig.duration } : {}}
            className="hidden sm:block"
          >
            <TabsList className={`inline-flex w-full max-w-full mx-auto mb-4 sm:mb-8 bg-white/80 dark:bg-gray-900/80 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-xl'} border border-gray-200/50 dark:border-gray-700/50 rounded-xl sm:rounded-2xl p-2 sm:p-8 shadow-lg flex-wrap sm:flex-nowrap`}>
              
              <motion.div
                whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.02 }}
                whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="courses" className="flex items-center justify-center space-x-1 sm:space-x-4 relative overflow-hidden h-10 sm:h-16 px-3 sm:px-8 py-2 sm:py-4 rounded-lg text-xs sm:text-base font-medium transition-all duration-200 data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-900/30 data-[state=active]:text-green-700 dark:data-[state=active]:text-green-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1 min-w-[80px] sm:min-w-0">
                  {!animationConfig.disableHoverEffects && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                  <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">课程信息</span>
                  <span className="relative z-10 sm:hidden">课程</span>
                </TabsTrigger>
              </motion.div>
              
              <motion.div
                whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.02 }}
                whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="schedule" className="flex items-center justify-center space-x-1 sm:space-x-4 relative overflow-hidden h-10 sm:h-16 px-3 sm:px-8 py-2 sm:py-4 rounded-lg text-xs sm:text-base font-medium transition-all duration-200 data-[state=active]:bg-orange-100 dark:data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1 min-w-[80px] sm:min-w-0">
                  {!animationConfig.disableHoverEffects && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                  <Calendar className="h-4 w-4 sm:h-6 sm:w-6 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">我的课表</span>
                  <span className="relative z-10 sm:hidden">课表</span>
                </TabsTrigger>
              </motion.div>
              
              
              <motion.div
                whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.02 }}
                whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="selection" className="flex items-center justify-center space-x-1 sm:space-x-4 relative overflow-hidden h-10 sm:h-16 px-3 sm:px-8 py-2 sm:py-4 rounded-lg text-xs sm:text-base font-medium transition-all duration-200 data-[state=active]:bg-pink-100 dark:data-[state=active]:bg-pink-900/30 data-[state=active]:text-pink-700 dark:data-[state=active]:text-pink-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1 min-w-[80px] sm:min-w-0">
                  {!animationConfig.disableHoverEffects && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-lg"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                  <Target className="h-4 w-4 sm:h-6 sm:w-6 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">抢课Pro+</span>
                  <span className="relative z-10 sm:hidden">Pro+</span>
                </TabsTrigger>
              </motion.div>
              
              <motion.div
                whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.02 }}
                whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="grade" className="flex items-center justify-center space-x-1 sm:space-x-4 relative overflow-hidden h-10 sm:h-16 px-3 sm:px-8 py-2 sm:py-4 rounded-lg text-xs sm:text-base font-medium transition-all duration-200 data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1 min-w-[80px] sm:min-w-0">
                  {!animationConfig.disableHoverEffects && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-lg"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                  <Award className="h-4 w-4 sm:h-6 sm:w-6 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">成绩查询</span>
                  <span className="relative z-10 sm:hidden">成绩</span>
                </TabsTrigger>
              </motion.div>
              
              <motion.div
                whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.02 }}
                whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="school" className="flex items-center justify-center space-x-1 sm:space-x-4 relative overflow-hidden h-10 sm:h-16 px-3 sm:px-8 py-2 sm:py-4 rounded-lg text-xs sm:text-base font-medium transition-all duration-200 data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1 min-w-[80px] sm:min-w-0">
                  {!animationConfig.disableHoverEffects && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                  <School className="h-4 w-4 sm:h-6 sm:w-6 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">学校选择</span>
                  <span className="relative z-10 sm:hidden">学校</span>
                </TabsTrigger>
              </motion.div>
              
              <motion.div
                whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.02 }}
                whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <TabsTrigger value="settings" className="flex items-center justify-center space-x-1 sm:space-x-4 relative overflow-hidden h-10 sm:h-16 px-3 sm:px-8 py-2 sm:py-4 rounded-lg text-xs sm:text-base font-medium transition-all duration-200 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800/50 data-[state=active]:text-gray-700 dark:data-[state=active]:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex-1 min-w-[80px] sm:min-w-0">
                  {!animationConfig.disableHoverEffects && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-lg"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                  <Settings className="h-4 w-4 sm:h-6 sm:w-6 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">系统设置</span>
                  <span className="relative z-10 sm:hidden">设置</span>
                </TabsTrigger>
              </motion.div>
            </TabsList>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={animationConfig.enabled ? { opacity: 0, y: animationConfig.reduceMotion ? 0 : 30, scale: animationConfig.reduceMotion ? 1 : 0.95 } : false}
              animate={animationConfig.enabled ? { opacity: 1, y: 0, scale: 1 } : {}}
              exit={animationConfig.enabled ? { opacity: 0, y: animationConfig.reduceMotion ? 0 : -30, scale: animationConfig.reduceMotion ? 1 : 0.95 } : {}}
              transition={{ 
                duration: animationConfig.duration,
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
                  <ModernSchedulePage />
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
              
              <TabsContent value="grade" className="mt-0">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-8 w-8 text-amber-400" />
                    </motion.div>
                  </div>
                }>
                  <GradePage />
                </Suspense>
              </TabsContent>
              
              <TabsContent value="school" className="mt-0">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-8 w-8 text-blue-400" />
                    </motion.div>
                  </div>
                }>
                  <SchoolSelectPage />
                </Suspense>
              </TabsContent>
              
              <TabsContent value="settings" className="mt-0">
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }>
                  <SettingsPage />
                </Suspense>
              </TabsContent>

              {/* 后台管理页面 */}
              {isAdminLoggedIn && (
                <TabsContent value="admin" className="mt-0">
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[400px]">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  }>
                    <AdminPage />
                  </Suspense>
                </TabsContent>
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>
      
      {/* 后台管理登录模态框 */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* 自动登录模态框 */}
      <AutoLoginModal
        isOpen={showAutoLogin}
        onClose={() => setShowAutoLogin(false)}
        onSuccess={handleAutoLoginSuccess}
      />
      
      {/* 性能监控组件 */}
      <PerformanceMonitor />

      {/* 建议提交模态框 */}
      <SuggestionModal
        isOpen={showSuggestionModal}
        onClose={() => setShowSuggestionModal(false)}
      />
    </div>
  )
}
