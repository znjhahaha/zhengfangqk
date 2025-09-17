'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Settings, 
  Save, 
  TestTube,
  CheckCircle,
  AlertCircle,
  Loader2,
  Key,
  Server,
  Palette,
  Moon,
  Sun
} from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI } from '@/lib/api'
import { useStudentStore } from '@/lib/student-store'
import CookieGuide from '@/components/CookieGuide'

export default function SettingsPage() {
  const [cookie, setCookie] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [showCookieGuide, setShowCookieGuide] = useState(false)
  
  // 学生信息状态管理
  const { 
    setStudentInfo, 
    setHasShownWelcome, 
    setIsFirstVisit 
  } = useStudentStore()

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      const response = await courseAPI.getConfig() as any
      if (response.success) {
        setCookie(response.data.cookie || '')
        setServerStatus(response.data.has_cookie ? 'online' : 'offline')
        console.log('📋 配置加载成功:', {
          hasCookie: response.data.has_cookie,
          cookieLength: response.data.cookie?.length || 0
        })
      } else {
        console.error('配置加载失败:', response.error)
        setServerStatus('offline')
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      setServerStatus('offline')
    }
  }, [])

  // 保存配置并验证Cookie有效性
  const saveConfig = useCallback(async () => {
    if (!cookie.trim()) {
      toast.error('请输入Cookie')
      return
    }

    setIsLoading(true)
    try {
      // 1. 保存Cookie配置
      const response = await courseAPI.setConfig({ cookie: cookie.trim() }) as any
      if (response.success) {
        console.log('✅ Cookie保存成功，开始验证有效性...')
        
        // 2. 验证Cookie有效性 - 尝试获取学生信息
        try {
          const studentResponse = await courseAPI.getStudentInfo() as any
          if (studentResponse.success && studentResponse.data) {
            const studentData = {
              name: studentResponse.data.name || '未知',
              studentId: studentResponse.data.studentId || '',
              major: studentResponse.data.major || '',
              grade: studentResponse.data.grade || '',
              college: studentResponse.data.college || ''
            }
            
            // 3. 保存学生信息到全局状态
            setStudentInfo(studentData)
            
            // 4. 重置欢迎动画状态，准备显示欢迎动画
            setHasShownWelcome(false)
            setIsFirstVisit(true)
            
            // 5. 更新服务器状态
            setServerStatus('online')
            
            // 6. 显示成功消息
            toast.success(`Cookie验证成功！欢迎 ${studentData.name} 同学`, {
              duration: 3000
            })
            
            console.log('✅ Cookie验证成功，学生信息:', studentData)
            
            // 7. 延迟重新加载配置
            setTimeout(async () => {
              try {
                const configResponse = await courseAPI.getConfig() as any
                if (configResponse.success) {
                  setCookie(configResponse.data.cookie || '')
                  setServerStatus(configResponse.data.has_cookie ? 'online' : 'offline')
                  console.log('✅ 配置重新加载成功，Cookie状态:', configResponse.data.has_cookie)
                }
              } catch (error) {
                console.error('重新加载配置失败:', error)
              }
            }, 200)
            
          } else {
            // Cookie无效，无法获取学生信息
            setServerStatus('offline')
            toast.error('Cookie无效，无法获取学生信息，请检查Cookie是否正确')
            console.error('❌ Cookie验证失败，无法获取学生信息')
          }
        } catch (studentError) {
          // 获取学生信息失败
          setServerStatus('offline')
          toast.error('Cookie验证失败，请检查网络连接或Cookie是否正确')
          console.error('❌ 获取学生信息失败:', studentError)
        }
        
      } else {
        toast.error(response.error || '配置保存失败')
        setServerStatus('offline')
      }
    } catch (error: any) {
      toast.error(error.message || '配置保存失败')
      setServerStatus('offline')
    } finally {
      setIsLoading(false)
    }
  }, [cookie, setStudentInfo, setHasShownWelcome, setIsFirstVisit])

  // 测试连接
  const testConnection = async () => {
    setIsTesting(true)
    try {
      // 先测试服务器健康状态
      const healthResponse = await courseAPI.healthCheck() as any
      if (healthResponse.status !== 'healthy') {
        setServerStatus('offline')
        toast.error('服务器状态异常')
        return
      }

      // 再测试Cookie是否有效（尝试获取学生信息）
      try {
        const studentResponse = await courseAPI.getStudentInfo() as any
        if (studentResponse.success) {
          setServerStatus('online')
          toast.success('Cookie配置有效，连接正常')
        } else {
          setServerStatus('offline')
          toast.error('Cookie配置无效，请检查Cookie是否正确')
        }
      } catch (cookieError) {
        setServerStatus('offline')
        toast.error('Cookie配置无效，请检查Cookie是否正确')
      }
    } catch (error) {
      setServerStatus('offline')
      toast.error('无法连接到服务器')
    } finally {
      setIsTesting(false)
    }
  }

  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    // 这里可以添加主题切换逻辑
    toast.success(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}主题`)
  }

  // 初始化加载
  useEffect(() => {
    loadConfig()
  }, [])

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">⚙️ 系统设置</h2>
          <p className="text-muted-foreground">配置系统参数和个性化设置</p>
        </div>
        <Button
          onClick={toggleTheme}
          variant="outline"
          className="btn-hover"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 mr-2" />
          ) : (
            <Moon className="h-4 w-4 mr-2" />
          )}
          切换主题
        </Button>
      </motion.div>

      {/* Cookie配置 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-primary" />
              <span>Cookie配置</span>
            </CardTitle>
            <CardDescription>
              设置您的登录Cookie，用于访问选课系统。请先在浏览器中登录选课系统，然后复制Cookie值。
            </CardDescription>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCookieGuide(true)}
                className="text-xs"
              >
                📖 查看详细配置指南
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Cookie值</label>
              <Input
                type="password"
                placeholder="请输入您的Cookie..."
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                className="font-mono text-sm"
              />
              {cookie && (
                <div className="text-xs text-green-400 flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Cookie已输入 ({cookie.length} 字符)</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Button
                  onClick={saveConfig}
                  disabled={isLoading}
                  className="btn-hover relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  {isLoading ? (
                    <motion.div 
                      className="flex items-center relative z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-4 w-4 mr-2" />
                      </motion.div>
                      保存配置
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="flex items-center relative z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 1
                        }}
                      >
                        <Save className="h-4 w-4 mr-2" />
                      </motion.div>
                      保存配置
                    </motion.div>
                  )}
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Button
                  onClick={testConnection}
                  disabled={isTesting || !cookie.trim()}
                  variant="outline"
                  className="btn-hover relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  {isTesting ? (
                    <motion.div 
                      className="flex items-center relative z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-4 w-4 mr-2" />
                      </motion.div>
                      测试连接
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="flex items-center relative z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 1
                        }}
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                      </motion.div>
                      测试连接
                    </motion.div>
                  )}
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 服务器状态 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-primary" />
              <span>服务器状态</span>
            </CardTitle>
            <CardDescription>
              检查后端服务器和模块状态
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">后端服务器</span>
                <div className="flex items-center space-x-2">
                  {serverStatus === 'online' && (
                    <div className="flex items-center space-x-1 text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">在线</span>
                    </div>
                  )}
                  {serverStatus === 'offline' && (
                    <div className="flex items-center space-x-1 text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">离线</span>
                    </div>
                  )}
                  {serverStatus === 'checking' && (
                    <div className="flex items-center space-x-1 text-yellow-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">检查中</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Python模块</span>
                <div className="flex items-center space-x-2">
                  {serverStatus === 'online' ? (
                    <div className="flex items-center space-x-1 text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">可用</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">不可用</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API接口</span>
                <div className="flex items-center space-x-2">
                  {serverStatus === 'online' ? (
                    <div className="flex items-center space-x-1 text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">正常</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">异常</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 界面设置 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-primary" />
              <span>界面设置</span>
            </CardTitle>
            <CardDescription>
              个性化界面显示设置
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">主题模式</div>
                <div className="text-sm text-muted-foreground">
                  当前使用{theme === 'dark' ? '深色' : '浅色'}主题
                </div>
              </div>
              <Button
                onClick={toggleTheme}
                variant="outline"
                size="sm"
                className="btn-hover"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 mr-2" />
                ) : (
                  <Moon className="h-4 w-4 mr-2" />
                )}
                切换到{theme === 'dark' ? '浅色' : '深色'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">动画效果</div>
                <div className="text-sm text-muted-foreground">
                  页面切换和交互动画
                </div>
              </div>
              <div className="flex items-center space-x-1 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">已启用</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">响应式布局</div>
                <div className="text-sm text-muted-foreground">
                  自适应不同屏幕尺寸
                </div>
              </div>
              <div className="flex items-center space-x-1 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">已启用</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 使用说明 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle>📖 使用说明</CardTitle>
            <CardDescription>
              快速了解如何使用选课工具
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">1. 配置Cookie</h4>
              <p className="text-sm text-muted-foreground">
                在浏览器中登录选课系统，按F12打开开发者工具，在Network标签页中找到请求，复制Cookie值到上方输入框
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">2. 查看学生信息</h4>
              <p className="text-sm text-muted-foreground">
                在"学生信息"页面查看和刷新您的个人信息
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">3. 浏览课程</h4>
              <p className="text-sm text-muted-foreground">
                在"课程信息"页面查看可选课程和已选课程
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">4. 智能选课</h4>
              <p className="text-sm text-muted-foreground">
                在"智能选课"页面选择模式，启动自动抢课
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Cookie配置指南 */}
      {showCookieGuide && (
        <CookieGuide onClose={() => setShowCookieGuide(false)} />
      )}
    </div>
  )
}
