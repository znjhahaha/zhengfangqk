'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  School, 
  Check, 
  Globe, 
  Users, 
  BookOpen,
  Settings,
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react'
import { SUPPORTED_SCHOOLS, getCurrentSchool, setCurrentSchool, type SchoolConfig } from '@/lib/global-school-state'
import { updateSchoolConfig } from '@/lib/course-api'
import toast from 'react-hot-toast'

export default function SchoolSelectPage() {
  const [selectedSchool, setSelectedSchool] = useState<SchoolConfig>(getCurrentSchool())
  const [isSwitching, setIsSwitching] = useState(false)

  // 调试信息
  useEffect(() => {
    console.log(`🔍 学校选择页面加载 - 当前学校: ${selectedSchool.name}`)
    console.log(`🔍 localStorage中的学校ID: ${localStorage.getItem('selected-school-id')}`)
  }, [selectedSchool])

  // 处理学校切换
  const handleSchoolChange = useCallback(async (school: SchoolConfig) => {
    if (school.id === selectedSchool.id) {
      toast('当前已经是该学校', { icon: 'ℹ️' })
      return
    }

    setIsSwitching(true)
    
    try {
      // 显示切换开始提示
      toast.loading(`正在切换到 ${school.name}...`, { id: 'school-switch' })
      
      console.log(`🔄 用户点击切换学校: ${school.name}`)
      console.log(`🔍 切换前localStorage: ${localStorage.getItem('selected-school-id')}`)
      
      // 更新学校配置
      updateSchoolConfig(school.id)
      
      // 更新本地状态
      setSelectedSchool(school)
      
      console.log(`🔍 切换后localStorage: ${localStorage.getItem('selected-school-id')}`)
      
      // 验证配置是否真的更新了
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const newSchool = getCurrentSchool()
      console.log(`✅ 验证新学校: ${newSchool.name} (${newSchool.id})`)
      
      // 强制刷新页面以确保所有组件都使用新配置
      setTimeout(() => {
        window.location.reload()
      }, 1000)
      
      // 成功提示
      toast.success(`已切换到 ${school.name}，页面将刷新`, { id: 'school-switch' })
      
    } catch (error: any) {
      console.error('学校切换失败:', error)
      toast.error('学校切换失败: ' + error.message, { id: 'school-switch' })
      setIsSwitching(false)
    }
  }, [selectedSchool.id])

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-2">🏫 学校选择</h2>
        <p className="text-muted-foreground">选择您所在的学校，系统将自动适配对应的教务系统</p>
      </motion.div>

      {/* 当前学校状态 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>当前学校</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 p-4 bg-green-50/10 rounded-lg border border-green-500/20">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <School className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-400">{selectedSchool.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedSchool.domain}</p>
                <p className="text-xs text-green-600 mt-1">{selectedSchool.description}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-500 font-medium">已连接</div>
                <div className="text-xs text-muted-foreground">教务系统</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 学校列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <span>支持的学校</span>
            </CardTitle>
            <CardDescription>
              选择您所在的学校，系统将自动切换到对应的教务系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {SUPPORTED_SCHOOLS.map((school, index) => (
                <motion.div
                  key={school.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                      selectedSchool.id === school.id 
                        ? 'ring-2 ring-green-500/50 bg-green-500/5' 
                        : 'hover:bg-blue-500/5 hover:ring-1 hover:ring-blue-500/30'
                    }`}
                    onClick={() => handleSchoolChange(school)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        {/* 学校图标 */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          selectedSchool.id === school.id 
                            ? 'bg-green-500/20' 
                            : 'bg-blue-500/20'
                        }`}>
                          <School className={`h-6 w-6 ${
                            selectedSchool.id === school.id 
                              ? 'text-green-500' 
                              : 'text-blue-500'
                          }`} />
                        </div>
                        
                        {/* 学校信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-white">{school.name}</h3>
                            {selectedSchool.id === school.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300 }}
                              >
                                <Check className="h-5 w-5 text-green-500" />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{school.domain}</p>
                          {school.description && (
                            <p className="text-xs text-blue-400 mt-1">{school.description}</p>
                          )}
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="flex items-center space-x-2">
                          {selectedSchool.id === school.id ? (
                            <div className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                              当前学校
                            </div>
                          ) : (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSchoolChange(school)
                              }}
                              disabled={isSwitching}
                              variant="outline"
                              size="sm"
                              className="btn-hover"
                            >
                              {isSwitching ? (
                                <>
                                  <Settings className="h-4 w-4 mr-2 animate-spin" />
                                  切换中...
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  切换
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
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
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-yellow-500" />
              <span>使用说明</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-yellow-400 font-medium">切换学校后需要重新登录</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    不同学校的教务系统需要不同的Cookie，切换学校后请前往设置页面重新登录
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <BookOpen className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-400 font-medium">系统会自动适配</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    选择学校后，所有功能（选课、课表、学生信息等）都会自动使用对应学校的系统
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-400 font-medium">数据完全隔离</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    不同学校的数据完全独立，切换学校不会影响其他学校的数据
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 调试工具 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <span>调试工具</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/debug-school')
                    const data = await response.json()
                    console.log('🔍 调试信息:', data)
                    toast.success('调试信息已输出到控制台')
                  } catch (error) {
                    console.error('调试失败:', error)
                    toast.error('调试失败')
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                🔍 查看当前学校配置
              </Button>
              
               <Button
                 onClick={() => {
                   console.log('🔍 手动检查localStorage:', localStorage.getItem('selected-school-id'))
                   const { getCurrentSchool } = require('@/lib/global-school-state')
                   const currentSchool = getCurrentSchool()
                   console.log('🔍 当前学校:', currentSchool)
                   toast.success('手动检查信息已输出到控制台')
                 }}
                 variant="outline"
                 size="sm"
                 className="w-full"
               >
                 🔍 手动检查配置
               </Button>
               
               <Button
                 onClick={async () => {
                   try {
                     const response = await fetch('/api/test-school-config')
                     const data = await response.json()
                     console.log('🔍 服务器端学校配置:', data)
                     toast.success('服务器端配置已输出到控制台')
                   } catch (error) {
                     console.error('获取服务器配置失败:', error)
                     toast.error('获取服务器配置失败')
                   }
                 }}
                 variant="outline"
                 size="sm"
                 className="w-full"
               >
                 🔍 检查服务器配置
               </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
