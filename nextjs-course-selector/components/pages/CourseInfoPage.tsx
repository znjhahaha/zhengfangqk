'use client'

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
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
  ChevronUp,
  Server,
  Timer
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
  _rwlx?: string  // 获取课程列表时使用的 rwlx 参数
  _xklc?: string  // 获取课程列表时使用的 xklc 参数
  _xkly?: string  // 获取课程列表时使用的 xkly 参数
  _xkkz_id?: string  // 获取课程列表时使用的 xkkz_id 参数
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
  
  // 服务器端抢课相关状态
  const [isServerSelectionActivated, setIsServerSelectionActivated] = useState(false)
  const [useServerSelection, setUseServerSelection] = useState(false)
  const [scheduledTime, setScheduledTime] = useState<string>('') // 定时抢课时间
  const [showScheduleDialog, setShowScheduleDialog] = useState(false) // 显示时间选择对话框
  
  // 虚拟滚动相关状态
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 })
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRafRef = useRef<number | null>(null)
  const ITEMS_PER_PAGE = 50  // 每次渲染的课程数量
  const ITEM_HEIGHT = 200  // 每个课程卡片的预估高度（px）


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
      const response = await courseAPI.getAvailableCourses(currentSchool.id, { forceRefresh }) as any
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

  // 抢课 - 使用 useCallback 优化
  const grabCourse = useCallback(async (course: Course, scheduledTime?: string) => {
    const courseKey = `${course.kch_id}_${course.jxb_id}`
    setGrabbingCourses(prev => new Set(prev).add(courseKey))
    
    try {
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const { getApiUrl } = require('@/lib/api')
      const currentSchool = getCurrentSchool()
      
      // 检查是否应该使用服务器端抢课
      console.log('🔍 抢课模式检查:', {
        useServerSelection,
        isServerSelectionActivated,
        shouldUseServer: useServerSelection && isServerSelectionActivated
      })
      
      // 如果开启了服务器端抢课且已激活，提交到服务器端任务
      if (useServerSelection && isServerSelectionActivated) {
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
              scheduledTime: scheduledTimestamp // 传递定时时间
            })
          })
          
          const result = await response.json()
          console.log('📥 服务器端任务响应:', result)
          
          if (result.success) {
            if (scheduledTime) {
              const timeStr = new Date(scheduledTime).toLocaleString('zh-CN')
              toast.success(`课程 "${course.kcmc}" 已设定定时抢课任务（${timeStr}）！可在"抢课Pro+"页面查看进度。`)
            } else {
              toast.success(`课程 "${course.kcmc}" 已提交到服务器端抢课任务！服务器将持续尝试抢课，可在"抢课Pro+"页面查看进度。`)
            }
            setScheduledTime('') // 清空时间选择
            setShowScheduleDialog(false) // 关闭对话框
            // 服务器端抢课不需要移除抢课状态，因为是在服务器端执行的
            setGrabbingCourses(prev => {
              const newSet = new Set(prev)
              newSet.delete(courseKey)
              return newSet
            })
          } else {
            toast.error(result.message || '提交服务器端任务失败')
            setGrabbingCourses(prev => {
              const newSet = new Set(prev)
              newSet.delete(courseKey)
              return newSet
            })
          }
        } catch (error: any) {
          console.error('❌ 提交服务器端任务失败:', error)
          toast.error('提交服务器端任务失败: ' + (error.message || '网络错误'))
          setGrabbingCourses(prev => {
            const newSet = new Set(prev)
            newSet.delete(courseKey)
            return newSet
          })
        }
        return // 重要：提交到服务器端后，直接返回，不执行本地抢课逻辑
      }
      
      // 如果没有开启服务器端抢课，使用本地抢课
      console.log('⚠️ 使用本地抢课模式（浏览器端）')
      
      // 调试：检查课程数据中的参数
      console.log(`🔍 前端：准备选课，课程数据中的参数:`, {
        _rwlx: course._rwlx,
        _xklc: course._xklc,
        _xkly: course._xkly,
        _xkkz_id: course._xkkz_id,
        kch_id: course.kch_id,
        kcmc: course.kcmc
      })
      
      // 本地抢课
      const response = await courseAPI.executeSingleCourseSelection({
        jxb_id: course.jxb_id,
        do_jxb_id: course.do_jxb_id || course.jxb_id,
        kch_id: course.kch_id,
        jxbzls: course.jxbzls || '1',
        kklxdm: course.kklxdm || '01', // 课程类型代码 (01=必修, 10=选修)
        kcmc: course.kcmc,
        jxbmc: course.jxbmc || course.jsxm,
        // 传递获取课程列表时使用的参数，确保选课时使用相同的参数
        _rwlx: course._rwlx,
        _xklc: course._xklc,
        _xkly: course._xkly,
        _xkkz_id: course._xkkz_id
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
  }, [selectedTab, fetchAvailableCourses, fetchSelectedCourses, useServerSelection, isServerSelectionActivated])

  // 过滤课程 - 使用 useMemo 优化性能
  const filteredCourses = useMemo(() => {
    const courses = selectedTab === 'available' ? availableCourses : selectedCourses
    if (!searchTerm) return courses
    
    const lowerSearchTerm = searchTerm.toLowerCase()
    return courses.filter(course => {
      if (!course) return false
      
      // 可选课程和已选课程的字段名不同，需要分别处理
      if (selectedTab === 'available') {
        // 可选课程字段
        const courseName = course.kcmc || ''
        const teacherName = course.jsxm || ''
        const category = course.kclb || ''
        
        return courseName.toLowerCase().includes(lowerSearchTerm) ||
               teacherName.toLowerCase().includes(lowerSearchTerm) ||
               category.toLowerCase().includes(lowerSearchTerm)
      } else {
        // 已选课程字段
        const courseName = course.course_name || course.kcmc || ''
        const teacherName = course.teacher || course.jsxm || ''
        const className = course.class_name || course.jxbmc || ''
        
        return courseName.toLowerCase().includes(lowerSearchTerm) ||
               teacherName.toLowerCase().includes(lowerSearchTerm) ||
               className.toLowerCase().includes(lowerSearchTerm)
      }
    })
  }, [selectedTab, availableCourses, selectedCourses, searchTerm])

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

  // 预计算分类索引范围（避免在渲染时重复计算）
  const categoryIndexMap = useMemo(() => {
    const map = new Map<string, { start: number, end: number }>()
    let currentIndex = 0
    
    Object.entries(groupedCourses).forEach(([category, courses]) => {
      map.set(category, {
        start: currentIndex,
        end: currentIndex + courses.length
      })
      currentIndex += courses.length
    })
    
    return map
  }, [groupedCourses])

  // 处理滚动事件，实现虚拟滚动（使用 requestAnimationFrame 优化）
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // 取消之前的 RAF
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current)
    }
    
    // 使用 requestAnimationFrame 优化滚动性能
    scrollRafRef.current = requestAnimationFrame(() => {
      // 使用 ref 获取容器元素，避免事件对象失效
      const container = containerRef.current
      if (!container) {
        scrollRafRef.current = null
        return
      }
      
      const scrollTop = container.scrollTop
      const containerHeight = container.clientHeight
      
      // 计算可见范围（提前和延后加载更多，确保滚动流畅）
      const buffer = 20 // 缓冲区大小
      const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - buffer)
      const end = Math.min(
        filteredCourses.length,
        Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + buffer
      )
      
      // 只有当范围变化较大时才更新（减少状态更新）
      setVisibleRange(prev => {
        if (Math.abs(start - prev.start) > 5 || Math.abs(end - prev.end) > 5) {
          return { start, end }
        }
        return prev
      })
      
      scrollRafRef.current = null
    })
  }, [filteredCourses.length])
  
  // 清理 RAF 当组件卸载时
  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current)
      }
    }
  }, [])

  // 重置可见范围当课程列表变化时
  useEffect(() => {
    setVisibleRange({ start: 0, end: ITEMS_PER_PAGE })
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [filteredCourses.length, selectedTab])

        // 创建课程回调函数映射（避免每次渲染时创建新函数）
        // 注意：这里需要包含 useServerSelection 和 isServerSelectionActivated，确保状态变化时重新创建回调
        const courseCallbacks = useMemo(() => {
          const callbacks = new Map<string, { onGrab: () => void, onToggle: () => void }>()
          filteredCourses.forEach(course => {
            const key = `${course.kch_id}_${course.jxb_id}`
            callbacks.set(key, {
              onGrab: () => {
                console.log('🎯 点击抢课按钮，当前状态:', {
                  useServerSelection,
                  isServerSelectionActivated,
                  course: course.kcmc
                })
                grabCourse(course, scheduledTime || undefined)
              },
              onToggle: () => toggleCourseSelection(key)
            })
          })
          return callbacks
        }, [filteredCourses, grabCourse, toggleCourseSelection, scheduledTime, useServerSelection, isServerSelectionActivated])

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

  // 检查服务器端抢课激活状态
  useEffect(() => {
    const checkActivationStatus = async () => {
      try {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || `user_${Date.now()}` : 'unknown'
        if (typeof window !== 'undefined' && !localStorage.getItem('userId')) {
          localStorage.setItem('userId', userId)
        }
        
        const { getApiUrl } = require('@/lib/api')
        const response = await fetch(getApiUrl(`/activation/verify?userId=${userId}`))
        const result = await response.json()
        
        console.log('🔍 检查激活状态结果:', result)
        
        if (result.success && result.activated) {
          setIsServerSelectionActivated(true)
          console.log('✅ 服务器端抢课已激活')
        } else {
          setIsServerSelectionActivated(false)
          setUseServerSelection(false) // 如果未激活，关闭服务器抢课选项
          console.log('❌ 服务器端抢课未激活')
        }
      } catch (error) {
        console.error('检查激活状态失败:', error)
        setIsServerSelectionActivated(false)
      }
    }
    
    checkActivationStatus()
  }, [])
  
  // 移除自动查询，改为手动查询
  // useEffect(() => {
  //   fetchAvailableCourses()
  // }, [fetchAvailableCourses])

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
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
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
      </div>

      {/* 时间选择对话框 */}
      {showScheduleDialog && (
        <Card className="glass mb-4">
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
        <div className="flex flex-wrap gap-2">
          {/* 服务器端抢课开关（仅在已激活时显示） */}
          {isServerSelectionActivated && (
            <>
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
            </>
          )}
          
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
      </div>

      {/* 课程统计 */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${isMultiSelectMode ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2 sm:gap-4`}>
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
      </div>

      {/* 多选模式提示 */}
      {isMultiSelectMode && (
        <div>
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
        </div>
      )}

      {/* 课程列表 - 使用虚拟滚动优化性能 */}
      <div 
        ref={containerRef}
        className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto"
        onScroll={handleScroll}
        style={{ 
          scrollBehavior: 'auto', // 改为 auto 提升性能
          WebkitOverflowScrolling: 'touch', // iOS 平滑滚动
          willChange: 'scroll-position', // 提示浏览器优化滚动
          contain: 'layout style paint' // CSS containment 优化
        }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative mb-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">正在加载课程</h3>
              <p className="text-muted-foreground">请稍候，正在获取最新课程信息...</p>
            </div>
          </div>
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
            {/* 虚拟滚动：只渲染可见的课程 */}
            {filteredCourses.length > ITEMS_PER_PAGE ? (
              <>
                {/* 顶部占位符 */}
                {visibleRange.start > 0 && (
                  <div 
                    style={{ 
                      height: visibleRange.start * ITEM_HEIGHT, 
                      minHeight: '1px',
                      contentVisibility: 'auto', // 优化占位符渲染
                      containIntrinsicSize: `${ITEM_HEIGHT}px`
                    }} 
                    aria-hidden="true" 
                  />
                )}
                
                {/* 可见的课程 */}
                {Object.entries(groupedCourses).map(([category, courses]) => {
                  // 使用预计算的索引范围（避免重复计算）
                  const indexRange = categoryIndexMap.get(category)
                  if (!indexRange) return null
                  
                  // 检查该分类是否在可见范围内
                  const isVisible = indexRange.end >= visibleRange.start && indexRange.start < visibleRange.end
                  
                  if (!isVisible) return null
                  
                  return (
                    <div key={category}>
                      {groupByCategory && category !== 'all' ? (
                        // 分类模式
                        <div className="space-y-3">
                          <div
                            className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                            onClick={() => toggleCategory(category)}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`transition-transform duration-200 ${expandedCategories.has(category) ? 'rotate-90' : ''}`}
                              >
                                <ChevronRight className="h-5 w-5 text-primary" />
                              </div>
                              <Folder className="h-5 w-5 text-blue-400" />
                              <h3 className="text-lg font-semibold text-white">
                                {category}
                              </h3>
                              <span className="px-2 py-1 bg-primary/20 text-primary text-sm rounded-full">
                                {courses.length} 门课程
                              </span>
                            </div>
                          </div>
                          
                          {expandedCategories.has(category) && (
                            <div className="grid grid-cols-1 gap-4 pl-8">
                              {courses.map((course) => {
                                const courseKey = `${course.kch_id}_${course.jxb_id}`
                                const callbacks = courseCallbacks.get(courseKey)
                                return (
                                  <CourseCard
                                    key={courseKey}
                                    course={course}
                                    onGrab={callbacks?.onGrab || (() => {})}
                                    isGrabbing={grabbingCourses.has(courseKey)}
                                    showGrabButton={selectedTab === 'available'}
                                    isMultiSelectMode={selectedTab === 'available' ? isMultiSelectMode : false}
                                    isSelected={selectedTab === 'available' ? multiSelectedCourses.has(courseKey) : false}
                                    onToggleSelection={selectedTab === 'available' ? (callbacks?.onToggle || (() => {})) : undefined}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        // 普通模式或"全部"分类
                        <div className="grid grid-cols-1 gap-4">
                          {courses.map((course) => (
                            <CourseCard
                              key={`${course.kch_id}_${course.jxb_id}`}
                              course={course}
                              onGrab={() => {
                                console.log('🎯 点击抢课按钮（直接调用），当前状态:', {
                                  useServerSelection,
                                  isServerSelectionActivated,
                                  course: course.kcmc
                                })
                                grabCourse(course, scheduledTime || undefined)
                              }}
                              isGrabbing={grabbingCourses.has(`${course.kch_id}_${course.jxb_id}`)}
                              showGrabButton={selectedTab === 'available'}
                              isMultiSelectMode={selectedTab === 'available' ? isMultiSelectMode : false}
                              isSelected={selectedTab === 'available' ? multiSelectedCourses.has(`${course.kch_id}_${course.jxb_id}`) : false}
                              onToggleSelection={selectedTab === 'available' ? () => toggleCourseSelection(`${course.kch_id}_${course.jxb_id}`) : () => {}}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* 底部占位符 */}
                {visibleRange.end < filteredCourses.length && (
                  <div 
                    style={{ 
                      height: (filteredCourses.length - visibleRange.end) * ITEM_HEIGHT, 
                      minHeight: '1px',
                      contentVisibility: 'auto', // 优化占位符渲染
                      containIntrinsicSize: `${ITEM_HEIGHT}px`
                    }} 
                    aria-hidden="true" 
                  />
                )}
              </>
            ) : (
              // 课程数量较少时，直接渲染全部
              Object.entries(groupedCourses).map(([category, courses]) => (
                <div key={category}>
                  {groupByCategory && category !== 'all' ? (
                    // 分类模式
                    <div className="space-y-3">
                      <div
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => toggleCategory(category)}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`transition-transform duration-200 ${expandedCategories.has(category) ? 'rotate-90' : ''}`}
                          >
                            <ChevronRight className="h-5 w-5 text-primary" />
                          </div>
                          <Folder className="h-5 w-5 text-blue-400" />
                          <h3 className="text-lg font-semibold text-white">
                            {category}
                          </h3>
                          <span className="px-2 py-1 bg-primary/20 text-primary text-sm rounded-full">
                            {courses.length} 门课程
                          </span>
                        </div>
                      </div>
                      
                      {expandedCategories.has(category) && (
                        <div className="grid grid-cols-1 gap-4 pl-8">
                          {courses.map((course) => (
                            <CourseCard
                              key={`${course.kch_id}_${course.jxb_id}`}
                              course={course}
                              onGrab={() => {
                                console.log('🎯 点击抢课按钮（直接调用），当前状态:', {
                                  useServerSelection,
                                  isServerSelectionActivated,
                                  course: course.kcmc
                                })
                                grabCourse(course, scheduledTime || undefined)
                              }}
                              isGrabbing={grabbingCourses.has(`${course.kch_id}_${course.jxb_id}`)}
                              showGrabButton={selectedTab === 'available'}
                              isMultiSelectMode={selectedTab === 'available' ? isMultiSelectMode : false}
                              isSelected={selectedTab === 'available' ? multiSelectedCourses.has(`${course.kch_id}_${course.jxb_id}`) : false}
                              onToggleSelection={selectedTab === 'available' ? () => toggleCourseSelection(`${course.kch_id}_${course.jxb_id}`) : () => {}}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // 普通模式或"全部"分类
                    <div className="grid grid-cols-1 gap-4">
                      {courses.map((course) => (
                        <CourseCard
                          key={`${course.kch_id}_${course.jxb_id}`}
                          course={course}
                          onGrab={() => {
                            console.log('🎯 点击抢课按钮（直接调用），当前状态:', {
                              useServerSelection,
                              isServerSelectionActivated,
                              course: course.kcmc
                            })
                            grabCourse(course, scheduledTime || undefined)
                          }}
                          isGrabbing={grabbingCourses.has(`${course.kch_id}_${course.jxb_id}`)}
                          showGrabButton={selectedTab === 'available'}
                          isMultiSelectMode={selectedTab === 'available' ? isMultiSelectMode : false}
                          isSelected={selectedTab === 'available' ? multiSelectedCourses.has(`${course.kch_id}_${course.jxb_id}`) : false}
                          onToggleSelection={selectedTab === 'available' ? () => toggleCourseSelection(`${course.kch_id}_${course.jxb_id}`) : () => {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  )
}

// 课程卡片组件 - 使用 memo 优化性能，添加自定义比较函数
const CourseCardComponent = function CourseCard({ 
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
  onToggleSelection?: () => void
}) {
  // 统一字段映射，兼容已选课程和可选课程的不同字段名
  const courseName = course.course_name || course.kcmc || '未知课程'
  const teacherName = course.teacher || course.jsxm || '未知教师'
  const category = course.kclb || '无'
  const courseType = course.type_course || course.course_type || '未知类型'
  const credit = course.credit || course.xf || '0'
  const location = course.location || course.skdd || course.jxdd || '未知地点'
  const time = course.time || course.sksj || '未知时间'
  const selectedCount = (
    course.selected_count ??
    course.yxzrs ??
    course.selected ??
    course.selectedCount ??
    '0'
  ).toString()
  const maxCapacity = (
    course.max_capacity ??
    course.bjrs ??
    course.capacity ??
    course.maxCapacity ??
    '0'
  ).toString()
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
    <div style={{ willChange: 'transform', contain: 'layout style' }}>
      <Card 
        className={`glass card-hover relative overflow-hidden transition-colors ${
          isMultiSelectMode ? 'cursor-pointer' : ''
        } ${isSelected ? 'ring-2 ring-green-500/50 bg-green-500/5' : ''}`}
        onClick={isMultiSelectMode ? onToggleSelection : undefined}
        style={{ 
          contentVisibility: 'auto', // 优化不可见元素的渲染
          containIntrinsicSize: '200px auto'
        }}
      >
        <CardContent className="p-4 sm:p-6 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-3">
                {/* 多选状态指示器 */}
                {isMultiSelectMode && (
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      isSelected 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-400 hover:border-green-400'
                    }`}>
                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
                
                <h3 className={`text-base sm:text-lg font-semibold ${isSelected ? 'text-green-400' : 'text-white'}`}>
                  {courseName}
                </h3>
                <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                  {category}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  courseType === '必修' 
                    ? 'bg-red-500/20 text-red-400' 
                    : courseType === '选修' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {courseType}
                </span>
                {classId && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    {classId}
                  </span>
                )}
              </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
                <div 
                  key={index}
                  className="flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{item.label}:</span>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <div>时间: {time}</div>
              <div>课程ID: {courseId} | 教学班ID: {jxbId}</div>
            </div>
          </div>
          
          {showGrabButton && !isMultiSelectMode && (
            <div className="ml-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation() // 防止事件冒泡到卡片
                  onGrab()
                }}
                disabled={isGrabbing}
                className="btn-hover"
                size="sm"
              >
                {isGrabbing ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    抢课中...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Play className="h-4 w-4 mr-2" />
                    抢课
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  )
}

// 使用 memo 包装组件，添加自定义比较函数
const CourseCardMemo = memo(CourseCardComponent, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时重新渲染
  return (
    prevProps.course.kch_id === nextProps.course.kch_id &&
    prevProps.course.jxb_id === nextProps.course.jxb_id &&
    prevProps.isGrabbing === nextProps.isGrabbing &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMultiSelectMode === nextProps.isMultiSelectMode &&
    prevProps.showGrabButton === nextProps.showGrabButton
  )
})

// 导出 CourseCard 组件
export { CourseCardMemo as CourseCard }
