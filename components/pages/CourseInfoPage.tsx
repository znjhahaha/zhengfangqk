'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  BookOpen, 
  Search, 
  RefreshCw,
  Play,
  CheckCircle,
  Clock,
  Users,
  MapPin,
  Loader2,
  Filter,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Building,
  Settings,
  Calendar,
  AlertCircle,
  ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI } from '@/lib/api'
import { useCourseStore } from '@/lib/course-store'
import { useStudentStore } from '@/lib/student-store'

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
  [key: string]: any // 允许其他属性
}

export default function CourseInfoPage() {
  // 使用全局状态管理
  const {
    availableCourses,
    selectedCourses,
    dataLoaded,
    setAvailableCourses,
    setSelectedCourses,
    setDataLoaded,
    clearAvailableCourses,
    clearSelectedCourses
  } = useCourseStore()
  
  // 学生信息状态
  const { studentInfo } = useStudentStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState<'available' | 'selected'>('available')
  const [grabbingCourses, setGrabbingCourses] = useState<Set<string>>(new Set())
  
  // 分类相关状态
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // 多选功能状态
  const [multiSelectedCourses, setMultiSelectedCourses] = useState<Set<string>>(new Set())
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [isBatchGrabbing, setIsBatchGrabbing] = useState(false)
  


  // 清理缓存功能
  const clearAllCache = useCallback(() => {
    // 清理全局状态缓存
    clearAvailableCourses()
    clearSelectedCourses()
    
    // 清理API层缓存（如果有的话）
    if (typeof window !== 'undefined') {
      // 清理本地存储中的课程相关缓存
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('course') || key.includes('available') || key.includes('selected'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
    
    toast.success('缓存已清理，下次查询将重新获取数据')
    console.log('🗑️ 已清理所有课程缓存数据')
  }, [clearAvailableCourses, clearSelectedCourses])

  // 获取可选课程 - 使用useCallback避免重复创建
  const fetchAvailableCourses = useCallback(async (forceRefresh = false) => {
    // 如果不是强制刷新且已经加载过且数据存在，不重复请求
    if (!forceRefresh && dataLoaded.available && availableCourses.length > 0) {
      console.log('📦 可选课程已缓存，跳过请求')
      return
    }
    
    setIsLoading(true)
    const startTime = Date.now()
    try {
      console.log('🚀 开始获取可选课程（前端）...')
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.getAvailableCourses(currentSchool.id) as any
      if (response.success) {
        const duration = Date.now() - startTime
        setAvailableCourses(response.data || [])
        toast.success(`可选课程获取成功 (${duration}ms)`, {
          duration: 3000
        })
        console.log(`⚡ 前端获取可选课程完成，用时: ${duration}ms`)
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
      console.error('获取可选课程失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dataLoaded.available, availableCourses.length, setAvailableCourses])

  // 获取已选课程 - 使用useCallback避免重复创建
  const fetchSelectedCourses = useCallback(async (forceRefresh = false) => {
    // 如果不是强制刷新且已经加载过且数据存在，不重复请求
    if (!forceRefresh && dataLoaded.selected && selectedCourses.length > 0) {
      console.log('📦 已选课程已缓存，跳过请求')
      return
    }
    
    setIsLoading(true)
    const startTime = Date.now()
    try {
      console.log('🔍 前端：开始获取已选课程...')
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.getSelectedCourses(currentSchool.id) as any
      console.log('📊 前端：已选课程API响应:', response)
      
      if (response.success) {
        // 处理已选课程数据格式 - 基于新的格式化函数
        const data = response.data || {}
        let courses = []
        
        if (data.courses && Array.isArray(data.courses)) {
          // 使用格式化后的数据
          courses = data.courses
          console.log(`📚 前端：获取到 ${courses.length} 门已选课程`)
        } else if (Array.isArray(data)) {
          // 如果直接返回数组
          courses = data
          console.log(`📚 前端：获取到 ${courses.length} 门已选课程（数组格式）`)
        } else {
          // 尝试从对象中提取
          courses = data.tmpList || data.courses || []
          console.log(`📚 前端：获取到 ${courses.length} 门已选课程（对象格式）`)
        }
        
        setSelectedCourses(courses)
        console.log('📊 前端：已选课程数据:', courses)
        
        const duration = Date.now() - startTime
        if (courses.length > 0) {
          toast.success(`已选课程获取成功，共 ${courses.length} 门课程 (${duration}ms)`, {
            duration: 3000
          })
        } else {
          toast(`当前没有已选课程 (${duration}ms)`)
        }
        console.log(`⚡ 前端获取已选课程完成，用时: ${duration}ms`)
      } else {
        const errorMessage = response.error || '获取已选课程失败'
        console.error('❌ 前端：已选课程API错误:', errorMessage)
        toast.error(errorMessage)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '获取已选课程失败'
      console.error('❌ 前端：获取已选课程异常:', error)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [dataLoaded.selected, selectedCourses.length, setSelectedCourses])

  // 抢课
  const grabCourse = async (course: Course) => {
    const courseKey = `${course.kch_id}_${course.jxb_id}`
    setGrabbingCourses(prev => new Set(prev).add(courseKey))
    
    try {
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.executeSingleCourseSelection({
        jxb_id: course.jxb_id,
        do_jxb_id: course.do_jxb_id || course.jxb_id,
        kch_id: course.kch_id,
        jxbzls: course.jxbzls || '1',
        kklxdm: course.kklxdm || '01', // 课程类型代码 (01=必修, 10=选修)
        kcmc: course.kcmc,
        jxbmc: course.jxbmc || course.jsxm
      }, currentSchool.id) as any
      
      if (response.success) {
        toast.success(`课程 "${course.kcmc}" 抢课成功！`)
        // 刷新课程列表
        if (selectedTab === 'available') {
          fetchAvailableCourses()
        } else {
          fetchSelectedCourses()
        }
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
  }

  // 过滤课程
  const filteredCourses = (selectedTab === 'available' ? availableCourses : selectedCourses).filter(course => {
    if (!course) return false
    
    // 可选课程和已选课程的字段名不同，需要分别处理
    if (selectedTab === 'available') {
      // 可选课程字段
      const courseName = course.kcmc || ''
      const teacherName = course.jsxm || ''
      const category = course.kclb || ''
      
      return courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             category.toLowerCase().includes(searchTerm.toLowerCase())
    } else {
      // 已选课程字段
      const courseName = course.course_name || course.kcmc || ''
      const teacherName = course.teacher || course.jsxm || ''
      const className = course.class_name || course.jxbmc || ''
      
      return courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             className.toLowerCase().includes(searchTerm.toLowerCase())
    }
  })

  // 切换分类展开状态
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }, [])

  // 展开/收起所有分类
  const toggleAllCategories = useCallback(() => {
    if (expandedCategories.size === 0) {
      // 展开所有分类
      const allCategories = new Set(
        filteredCourses.map(course => {
          const courseName = selectedTab === 'available' ? course.kcmc : (course.course_name || course.kcmc)
          return courseName || '未命名课程'
        })
      )
      setExpandedCategories(allCategories)
    } else {
      // 收起所有分类
      setExpandedCategories(new Set())
    }
  }, [expandedCategories.size, filteredCourses, selectedTab])

  // 多选功能
  const toggleMultiSelect = useCallback(() => {
    setIsMultiSelectMode(!isMultiSelectMode)
    if (isMultiSelectMode) {
      // 退出多选模式时清空选择
      setMultiSelectedCourses(new Set())
    }
  }, [isMultiSelectMode])

  const toggleCourseSelection = useCallback((courseKey: string) => {
    setMultiSelectedCourses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(courseKey)) {
        newSet.delete(courseKey)
      } else {
        newSet.add(courseKey)
      }
      return newSet
    })
  }, [])

  const selectAllCourses = useCallback(() => {
    const allCourseKeys = filteredCourses.map(course => `${course.kch_id}_${course.jxb_id}`)
    setMultiSelectedCourses(new Set(allCourseKeys))
  }, [filteredCourses])

  const clearAllSelections = useCallback(() => {
    setMultiSelectedCourses(new Set())
  }, [])

  // 批量抢课
  const batchGrabCourses = useCallback(async () => {
    if (multiSelectedCourses.size === 0) {
      toast.error('请先选择要抢的课程')
      return
    }

    setIsBatchGrabbing(true)
    const selectedCoursesList = Array.from(multiSelectedCourses)

    try {
      // 准备课程数据
      const coursesToSelect = selectedCoursesList.map(courseKey => {
        const course = filteredCourses.find(c => `${c.kch_id}_${c.jxb_id}` === courseKey)
        if (!course) {
          throw new Error(`课程不存在: ${courseKey}`)
        }
        
        return {
          jxb_id: course.jxb_id,
          do_jxb_id: course.do_jxb_id || course.jxb_id,
          kch_id: course.kch_id,
          jxbzls: course.jxbzls || '1',
          kklxdm: course.kklxdm || '01',
          kcmc: course.kcmc,
          jxbmc: course.jxbmc || course.jsxm
        }
      })

      console.log(`🚀 开始批量抢课，共${coursesToSelect.length}门课程`)

      // 调用批量抢课API
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.executeBatchCourseSelection({
        courses: coursesToSelect,
        batchSize: 3, // 每次最多3个并发请求
        delay: 500    // 批次间延迟500ms
      }, currentSchool.id) as any

      if (response.success) {
        const { success, failed, results } = response.data
        
        // 显示每个课程的结果
        results.forEach((result: any) => {
          if (result.success) {
            toast.success(`"${result.courseName}" 抢课成功！`)
          } else {
            toast.error(`"${result.courseName}" 抢课失败: ${result.error || result.message}`)
          }
        })

        // 显示总结
        if (success > 0) {
          toast.success(`批量抢课完成！成功: ${success}门，失败: ${failed}门`)
        } else {
          toast.error(`批量抢课失败！失败: ${failed}门`)
        }

        // 刷新课程列表
        if (selectedTab === 'available') {
          fetchAvailableCourses()
        } else {
          fetchSelectedCourses()
        }

        // 清空选择
        setMultiSelectedCourses(new Set())
        setIsMultiSelectMode(false)
      } else {
        const errorMsg = response.error || '批量抢课失败'
        toast.error(errorMsg)
      }

    } catch (error: any) {
      const errorMsg = error.message || '批量抢课异常'
      console.error('批量抢课异常:', error)
      toast.error(`批量抢课异常: ${errorMsg}`)
    } finally {
      setIsBatchGrabbing(false)
    }
  }, [multiSelectedCourses, filteredCourses, selectedTab, fetchAvailableCourses, fetchSelectedCourses])

  // 按实际课程名称分组课程
  const groupedCourses = useMemo(() => {
    if (!groupByCategory) {
      return { 'all': filteredCourses }
    }

    const grouped: Record<string, Course[]> = {}
    filteredCourses.forEach(course => {
      const courseName = selectedTab === 'available' ? course.kcmc : (course.course_name || course.kcmc)
      const category = courseName || '未命名课程'
      
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(course)
    })

    // 按课程名称排序
    const sortedGrouped: Record<string, Course[]> = {}
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === '未命名课程') return 1
      if (b === '未命名课程') return -1
      return a.localeCompare(b, 'zh-CN')
    })
    
    sortedKeys.forEach(key => {
      sortedGrouped[key] = grouped[key]
    })

    return sortedGrouped
  }, [filteredCourses, groupByCategory, selectedTab])

  // 获取所有分类
  const allCategories = useMemo(() => {
    return Array.from(new Set(filteredCourses.map(course => {
      const courseName = selectedTab === 'available' ? course.kcmc : (course.course_name || course.kcmc)
      return courseName || '未命名课程'
    }))).sort((a, b) => {
      if (a === '未命名课程') return 1
      if (b === '未命名课程') return -1
      return a.localeCompare(b, 'zh-CN')
    })
  }, [filteredCourses, selectedTab])

  // 移除自动查询，改为手动查询
  // useEffect(() => {
  //   fetchAvailableCourses()
  // }, [fetchAvailableCourses])

  // 如果没有学生信息，显示提示
  if (!studentInfo) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center min-h-[400px]"
        >
          <Card className="glass max-w-md w-full">
            <CardContent className="p-4 sm:p-8 text-center">
              <div className="mb-4">
                <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">请先配置Cookie</h3>
                <p className="text-xs sm:text-base text-muted-foreground mb-4 sm:mb-6">
                  您需要先在"系统设置"页面配置有效的Cookie才能查看课程信息
                </p>
                <Button 
                  onClick={() => {
                    // 这里可以添加跳转到设置页面的逻辑
                    toast('请切换到"系统设置"页面配置Cookie')
                  }}
                  className="w-full text-xs sm:text-sm"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  前往设置页面
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">📚 课程信息</h2>
          <p className="text-xs sm:text-base text-muted-foreground">查看可选课程和已选课程，支持快速抢课</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            onClick={() => {
              if (selectedTab === 'available') {
                fetchAvailableCourses(true)
              } else {
                fetchSelectedCourses(true)
              }
            }}
            disabled={isLoading}
            variant="default"
            className="btn-hover text-xs sm:text-sm px-3 sm:px-4"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
            ) : (
              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            )}
            <span className="hidden sm:inline">{selectedTab === 'available' ? '查询可选课程' : '查询已选课程'}</span>
            <span className="sm:hidden">{selectedTab === 'available' ? '查询可选' : '查询已选'}</span>
          </Button>
          <Button
            onClick={() => {
              if (selectedTab === 'available') {
                fetchAvailableCourses(true)
              } else {
                fetchSelectedCourses(true)
              }
            }}
            disabled={isLoading}
            variant="outline"
            className="btn-hover"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            刷新课程
          </Button>
        </div>
      </motion.div>

      {/* 搜索和筛选 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="搜索课程名称、教师姓名或课程类别..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-10 text-xs sm:text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const newTab = selectedTab === 'available' ? 'selected' : 'available'
              setSelectedTab(newTab)
              // 只有在数据未加载时才请求
              if (newTab === 'selected' && !dataLoaded.selected) {
                fetchSelectedCourses()
              } else if (newTab === 'available' && !dataLoaded.available) {
                fetchAvailableCourses()
              }
            }}
            variant="outline"
            className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
          >
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{selectedTab === 'available' ? '查看已选课程' : '查看可选课程'}</span>
            <span className="sm:hidden">{selectedTab === 'available' ? '已选' : '可选'}</span>
          </Button>
          
          <Button
            onClick={() => setGroupByCategory(!groupByCategory)}
            variant={groupByCategory ? "default" : "outline"}
            className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
          >
            {groupByCategory ? <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> : <Folder className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />}
            <span className="hidden sm:inline">{groupByCategory ? '取消分类' : '按名称'}</span>
            <span className="sm:hidden">分类</span>
          </Button>
          
          {groupByCategory && (
            <Button
              onClick={toggleAllCategories}
              variant="outline"
              className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
            >
              {expandedCategories.size === 0 ? (
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              ) : (
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              )}
              <span className="hidden sm:inline">{expandedCategories.size === 0 ? '展开全部' : '收起全部'}</span>
              <span className="sm:hidden">{expandedCategories.size === 0 ? '展开' : '收起'}</span>
            </Button>
          )}
          
          <Button
            onClick={() => {
              // 强制刷新当前标签页的数据
              if (selectedTab === 'available') {
                clearAvailableCourses()
                fetchAvailableCourses(true)
              } else {
                clearSelectedCourses()
                fetchSelectedCourses(true)
              }
            }}
            variant="outline"
            className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">刷新</span>
            <span className="sm:hidden">刷新</span>
          </Button>

          <Button
            onClick={clearAllCache}
            variant="outline"
            className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
          >
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">清理缓存</span>
            <span className="sm:hidden">清理</span>
          </Button>

          {/* 多选功能按钮 */}
          {selectedTab === 'available' && (
            <>
              <Button
                onClick={toggleMultiSelect}
                variant={isMultiSelectMode ? "default" : "outline"}
                className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
              >
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{isMultiSelectMode ? '退出多选' : '多选模式'}</span>
                <span className="sm:hidden">{isMultiSelectMode ? '退出' : '多选'}</span>
              </Button>
              
              {isMultiSelectMode && (
                <>
                  <Button
                    onClick={selectAllCourses}
                    variant="outline"
                    className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
                    disabled={filteredCourses.length === 0}
                  >
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">全选</span>
                    <span className="sm:hidden">全选</span>
                  </Button>
                  
                  <Button
                    onClick={clearAllSelections}
                    variant="outline"
                    className="btn-hover text-xs sm:text-sm px-2 sm:px-4"
                    disabled={multiSelectedCourses.size === 0}
                  >
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">清空选择</span>
                    <span className="sm:hidden">清空</span>
                  </Button>
                  
                  <Button
                    onClick={batchGrabCourses}
                    variant="default"
                    className="btn-hover bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-2 sm:px-4"
                    disabled={multiSelectedCourses.size === 0 || isBatchGrabbing}
                  >
                    {isBatchGrabbing ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">批量抢课 ({multiSelectedCourses.size})</span>
                    <span className="sm:hidden">抢课({multiSelectedCourses.size})</span>
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* 课程统计 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`grid grid-cols-2 sm:grid-cols-3 ${isMultiSelectMode ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2 sm:gap-4`}
      >
        <Card className="glass">
          <CardContent className="p-2 sm:p-4">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold text-white">{availableCourses.length}</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground">可选课程</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="p-2 sm:p-4">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold text-white">{selectedCourses.length}</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground">已选课程</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="p-2 sm:p-4">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-lg sm:text-2xl font-bold text-white">{filteredCourses.length}</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground">筛选结果</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 多选统计卡片 */}
        {isMultiSelectMode && (
          <Card className="glass border-green-500/20">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg sm:text-2xl font-bold text-white">{multiSelectedCourses.size}</div>
                  <div className="text-[10px] sm:text-sm text-muted-foreground">已选择</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* 多选模式提示 */}
      {isMultiSelectMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">多选模式已启用</h3>
                  <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <p>• 直接点击课程卡片来选择/取消选择课程</p>
                    <p>• 选中的课程会显示绿色边框和勾选标记</p>
                    <p>• 使用"全选"按钮选择所有筛选结果</p>
                    <p>• 使用"清空选择"按钮取消所有选择</p>
                    <p>• 点击"批量抢课"按钮同时抢多门课程</p>
                    <p>• 批量抢课会分批处理，避免服务器压力</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 课程列表 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {isLoading ? (
          <motion.div 
            className="flex flex-col items-center justify-center py-12"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="relative mb-4"
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <Loader2 className="h-12 w-12 text-primary" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/20"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold text-white mb-2">正在加载课程</h3>
              <p className="text-muted-foreground">请稍候，正在获取最新课程信息...</p>
            </motion.div>
            <motion.div
              className="mt-4 w-64 h-1 bg-white/10 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </motion.div>
        ) : filteredCourses.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">暂无课程</h3>
              <p className="text-muted-foreground">
                {searchTerm ? '没有找到匹配的课程' : '暂无可用课程'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCourses).map(([category, courses], categoryIndex) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
              >
                {groupByCategory && category !== 'all' ? (
                  // 分类模式
                  <div className="space-y-3">
                    <motion.div
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => toggleCategory(category)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3">
                        <motion.div
                          animate={{ rotate: expandedCategories.has(category) ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="h-5 w-5 text-primary" />
                        </motion.div>
                        <Folder className="h-5 w-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">
                          {category}
                        </h3>
                        <span className="px-2 py-1 bg-primary/20 text-primary text-sm rounded-full">
                          {courses.length} 门课程
                        </span>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={false}
                      animate={{
                        height: expandedCategories.has(category) ? 'auto' : 0,
                        opacity: expandedCategories.has(category) ? 1 : 0
                      }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 gap-4 pl-8">
                        {courses.map((course, index) => (
                          <motion.div
                            key={`${course.kch_id}_${course.jxb_id}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              delay: index * 0.05,
                              duration: 0.4
                            }}
                            whileHover={{
                              y: -3,
                              transition: { duration: 0.2 }
                            }}
                            layout
                          >
                            <CourseCard
                              course={course}
                              onGrab={() => grabCourse(course)}
                              isGrabbing={grabbingCourses.has(`${course.kch_id}_${course.jxb_id}`)}
                              showGrabButton={selectedTab === 'available'}
                              isMultiSelectMode={selectedTab === 'available' ? isMultiSelectMode : false}
                              isSelected={selectedTab === 'available' ? multiSelectedCourses.has(`${course.kch_id}_${course.jxb_id}`) : false}
                              onToggleSelection={selectedTab === 'available' ? () => toggleCourseSelection(`${course.kch_id}_${course.jxb_id}`) : () => {}}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  // 普通模式或"全部"分类
                  <div className="grid grid-cols-1 gap-4">
                    {courses.map((course, index) => (
                      <motion.div
                        key={`${course.kch_id}_${course.jxb_id}`}
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ 
                          delay: index * 0.08,
                          duration: 0.6,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                        whileHover={{ 
                          y: -5,
                          scale: 1.02,
                          transition: { duration: 0.2 }
                        }}
                        layout
                      >
                        <CourseCard
                          course={course}
                          onGrab={() => grabCourse(course)}
                          isGrabbing={grabbingCourses.has(`${course.kch_id}_${course.jxb_id}`)}
                          showGrabButton={selectedTab === 'available'}
                          isMultiSelectMode={selectedTab === 'available' ? isMultiSelectMode : false}
                          isSelected={selectedTab === 'available' ? multiSelectedCourses.has(`${course.kch_id}_${course.jxb_id}`) : false}
                          onToggleSelection={selectedTab === 'available' ? () => toggleCourseSelection(`${course.kch_id}_${course.jxb_id}`) : () => {}}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  )
}

// 课程卡片组件
function CourseCard({ 
  course, 
  onGrab, 
  isGrabbing, 
  showGrabButton,
  isMultiSelectMode,
  isSelected,
  onToggleSelection
}: { 
  course: Course
  onGrab: () => void
  isGrabbing: boolean
  showGrabButton: boolean
  isMultiSelectMode: boolean
  isSelected: boolean
  onToggleSelection: () => void
}) {
  // 统一字段映射，兼容已选课程和可选课程的不同字段名
  const courseName = course.course_name || course.kcmc || '未知课程'
  const teacherName = course.teacher || course.jsxm || '未知教师'
  const category = course.kclb || '无'
  const courseType = course.type_course || course.course_type || '未知类型'
  const credit = course.credit || course.xf || '0'
  const location = course.location || course.skdd || course.jxdd || '未知地点'
  const time = course.time || course.sksj || '未知时间'
  const selectedCount = course.selected_count || course.yxzrs || '0'
  const maxCapacity = course.max_capacity || course.bjrs || '0'
  const classId = course.class_name || course.jxbmc || ''
  const courseId = course.course_id || course.kch || course.kch_id || ''
  const jxbId = course.jxb_id || ''
  
  // 处理课程详细信息 - 基于Python版本的实现
  let detailedTeacher = teacherName
  let detailedTime = time
  let detailedLocation = location
  let detailedCollege = course.kkxy || course.kkxymc || '未知学院'
  let detailedCategory = category
  let detailedNature = course.kcxz || course.kcxzm || '未知性质'
  let detailedMode = course.jxms || '未知模式'
  let detailedCapacity = maxCapacity
  
  // 如果有课程详细信息，则使用详细信息
  if (course.course_details && Array.isArray(course.course_details) && course.course_details.length > 0) {
    // 根据当前教学班的jxb_id找到对应的详细信息
    let detailItem = null
    for (const item of course.course_details) {
      if (item.jxb_id === jxbId) {
        detailItem = item
        break
      }
    }
    
    // 如果找不到匹配的jxb_id，则使用第一个条目
    if (!detailItem && course.course_details.length > 0) {
      detailItem = course.course_details[0]
    }
    
    if (detailItem) {
      // 处理教师信息 - 格式如 "2006078/卫郭敏/教授"
      const teacherInfo = detailItem.jsxx || ''
      if (teacherInfo && teacherInfo.includes('/')) {
        const parts = teacherInfo.split('/')
        const teacherName = parts[1] || '未知教师'
        const teacherTitle = parts[2] || ''
        detailedTeacher = `【${teacherName}】 ${teacherTitle}`
      } else {
        const teacherName = detailItem.jsxm || '未知教师'
        const teacherTitle = detailItem.jszc || ''
        detailedTeacher = `【${teacherName}】 ${teacherTitle}`
      }
      
      detailedTime = detailItem.sksj || time
      detailedLocation = detailItem.jxdd || location
      detailedCollege = detailItem.kkxymc || detailItem.jgmc || detailedCollege
      detailedCategory = detailItem.kclbmc || category
      detailedNature = detailItem.kcxzmc || detailItem.kcxz || detailedNature
      detailedMode = detailItem.jxms || detailedMode
      detailedCapacity = detailItem.jxbrl || maxCapacity
    }
  }
  
  return (
    <motion.div
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={`glass card-hover relative overflow-hidden ${
          isMultiSelectMode ? 'cursor-pointer' : ''
        } ${isSelected ? 'ring-2 ring-green-500/50 bg-green-500/5' : ''}`}
        onClick={isMultiSelectMode ? onToggleSelection : undefined}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        <CardContent className="p-4 sm:p-6 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <motion.div 
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* 多选状态指示器 */}
                {isMultiSelectMode && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                    className="flex items-center"
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      isSelected 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-400 hover:border-green-400'
                    }`}>
                      {isSelected && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </motion.svg>
                      )}
                    </div>
                  </motion.div>
                )}
                
                <motion.h3 
                  className={`text-base sm:text-lg font-semibold ${isSelected ? 'text-green-400' : 'text-white'}`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {courseName}
                </motion.h3>
                <motion.span 
                  className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  whileHover={{ scale: 1.1 }}
                >
                  {category}
                </motion.span>
                <motion.span 
                  className={`px-2 py-1 text-xs rounded-full ${
                    courseType === '必修' 
                      ? 'bg-red-500/20 text-red-400' 
                      : courseType === '选修' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 300 }}
                  whileHover={{ scale: 1.1 }}
                >
                  {courseType}
                </motion.span>
                {classId && (
                  <motion.span 
                    className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    {classId}
                  </motion.span>
                )}
              </motion.div>
            
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {[
                { icon: Users, label: "教师", value: detailedTeacher },
                { icon: Clock, label: "学分", value: credit },
                { icon: MapPin, label: "地点", value: detailedLocation },
                { icon: Users, label: "人数", value: `${selectedCount}/${detailedCapacity}` },
                { icon: Building, label: "学院", value: detailedCollege },
                { icon: BookOpen, label: "性质", value: detailedNature },
                { icon: Settings, label: "模式", value: detailedMode },
                { icon: Calendar, label: "时间", value: detailedTime }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                  <span className="text-muted-foreground">{item.label}:</span>
                  <span className="text-white font-medium">{item.value}</span>
                </motion.div>
              ))}
            </motion.div>
            
            <div className="text-sm text-muted-foreground">
              <div>时间: {time}</div>
              <div>课程ID: {courseId} | 教学班ID: {jxbId}</div>
            </div>
          </div>
          
          {showGrabButton && !isMultiSelectMode && (
            <motion.div 
              className="ml-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Button
                  onClick={(e) => {
                    e.stopPropagation() // 防止事件冒泡到卡片
                    onGrab()
                  }}
                  disabled={isGrabbing}
                  className="btn-hover relative overflow-hidden"
                  size="sm"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  {isGrabbing ? (
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
                      抢课中...
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
                        <Play className="h-4 w-4 mr-2" />
                      </motion.div>
                      抢课
                    </motion.div>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
    </motion.div>
  )
}
