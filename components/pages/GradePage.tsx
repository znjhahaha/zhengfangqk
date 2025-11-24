'use client'

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDeviceDetection, getAnimationConfig } from '@/lib/device-detector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Award,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  BookOpen,
  TrendingUp,
  GraduationCap,
  Clock,
  ChevronDown,
  Check,
  ChevronRight,
  Circle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { GradeItem, OverallGradeItem } from '@/lib/course-api'
import DataCacheManager, { CACHE_KEYS } from '@/lib/data-cache-manager'

interface GradeResponse {
  success: boolean
  data?: GradeItem[]
  error?: string
  message?: string
}

interface OverallGradeResponse {
  success: boolean
  data?: OverallGradeItem[]
  gpa?: string
  error?: string
  message?: string
}

// 自定义下拉选择组件
interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  icon: React.ReactNode
  label: string
  delay?: number
}

function CustomSelect({ value, onChange, options, icon, label, delay = 0 }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  // 更新下拉菜单位置
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect()
          // getBoundingClientRect() 返回的是相对于视口的坐标
          // position: fixed 也是相对于视口的，所以直接使用 rect 的值
          setDropdownPosition({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width
          })
        }
      }

      updatePosition()

      // 监听滚动和窗口大小变化
      window.addEventListener('scroll', updatePosition, { passive: true })
      window.addEventListener('resize', updatePosition)

      return () => {
        window.removeEventListener('scroll', updatePosition)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <motion.div
      className="flex items-center gap-2 relative"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      ref={selectRef}
      style={{ zIndex: isOpen ? 99999 : 'auto' }}
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {icon}
      </motion.div>
      <label className="text-xs sm:text-sm font-medium text-gray-300">{label}</label>
      <div className="relative">
        <motion.button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-700/80 border border-purple-400/30 rounded-lg text-white cursor-pointer hover:bg-slate-700 hover:border-purple-400/60 transition-all duration-300 min-w-[120px] sm:min-w-[180px] justify-between relative text-xs sm:text-sm"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="flex-1 text-left truncate">{selectedOption?.label || '请选择'}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
          </motion.div>
        </motion.button>

        {typeof window !== 'undefined' && createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed bg-slate-700/95 backdrop-blur-xl border border-purple-400/30 rounded-lg shadow-2xl overflow-hidden"
                style={{
                  position: 'fixed',
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width || 180,
                  zIndex: 99999
                }}
              >
                <div className="py-2">
                  {options.map((option, index) => (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setIsOpen(false)
                      }}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-left flex items-center justify-between hover:bg-purple-500/20 transition-colors text-xs sm:text-sm ${value === option.value
                          ? 'bg-purple-500/30 text-purple-300'
                          : 'text-gray-300'
                        }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      whileHover={{ x: 5, backgroundColor: 'rgba(147, 51, 234, 0.2)' }}
                    >
                      <span className="flex-1">{option.label}</span>
                      {value === option.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Check className="h-4 w-4 text-purple-400" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>
    </motion.div>
  )
}

export default function GradePage() {
  // 设备检测和动画配置
  const { isMobile, isLowPerformance } = useDeviceDetection()
  const animationConfig = getAnimationConfig(isMobile, isLowPerformance)

  const [grades, setGrades] = useState<GradeItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>('2024')
  const [selectedTerm, setSelectedTerm] = useState<string>('12')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0) // 强制更新计数器
  const isLoadingRef = useRef(false) // 使用 ref 跟踪加载状态，避免闭包问题
  const abortControllerRef = useRef<AbortController | null>(null)

  // 总体成绩状态
  const [overallGrades, setOverallGrades] = useState<OverallGradeItem[]>([])
  const [overallGPA, setOverallGPA] = useState<string | null>(null)
  const [isLoadingOverall, setIsLoadingOverall] = useState(false)
  const [lastUpdatedOverall, setLastUpdatedOverall] = useState<string | null>(null)
  const overallLoadingRef = useRef(false)
  const overallAbortControllerRef = useRef<AbortController | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 组件卸载时取消所有进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      if (overallAbortControllerRef.current) {
        overallAbortControllerRef.current.abort()
        overallAbortControllerRef.current = null
      }
      isLoadingRef.current = false
      overallLoadingRef.current = false
    }
  }, [])

  // 页面加载时从缓存恢复成绩数据
  useEffect(() => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''
    const { getCurrentSchool } = require('@/lib/global-school-state')
    const schoolId = getCurrentSchool().id

    const cacheKey = `${CACHE_KEYS.GRADES}_${selectedYear}_${selectedTerm}`
    const cachedGrades = DataCacheManager.get<GradeItem[]>(cacheKey, userId, schoolId)

    if (cachedGrades) {
      setGrades(cachedGrades)
      setLastUpdated(new Date().toLocaleString('zh-CN'))
      console.log('使用缓存的成绩数据')
    }
    // 不自动加载，等待用户刷新
  }, [selectedYear, selectedTerm])

  // 调试：监听 isLoading 状态变化
  useEffect(() => {
    console.log('🔍 [状态监听] isLoading 状态变化:', isLoading, 'grades.length:', grades.length, 'isLoadingRef.current:', isLoadingRef.current)

    // 如果状态不一致，强制同步
    if (isLoading !== isLoadingRef.current) {
      console.warn('⚠️ 状态不一致！isLoading:', isLoading, 'isLoadingRef.current:', isLoadingRef.current, '正在同步...')
      isLoadingRef.current = isLoading
    }
  }, [isLoading, grades.length])

  // 生成学年选项（最近5年）
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - i
    return { value: year.toString(), label: `${year}-${year + 1}学年` }
  })

  // 获取成绩数据
  const fetchGrades = useCallback(async () => {
    // 取消之前的请求（如果有），并重置状态
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // 确保之前的加载状态已清除
    if (isLoadingRef.current) {
      isLoadingRef.current = false
      setIsLoading(false)
    }

    // 创建新的 AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // 设置加载状态
    isLoadingRef.current = true
    setIsLoading(true)

    // 清空之前的数据
    setGrades([])
    setLastUpdated(null)

    console.log('🚀 开始新的查询请求')

    // 使用当前的最新值（从最新的 state 获取）
    const currentYear = selectedYear
    const currentTerm = selectedTerm

    try {
      console.log(`📊 开始查询成绩: 学年=${currentYear}, 学期=${currentTerm}`)

      const { courseAPI } = await import('@/lib/api')

      // 添加超时处理
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('请求超时，请检查网络连接'))
        }, 30000)
      })

      // 获取当前学校ID（从localStorage读取，确保用户隔离）
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()

      const data: GradeResponse = await Promise.race([
        courseAPI.getGrades(currentYear, currentTerm, undefined, currentSchool.id),
        timeoutPromise
      ]) as GradeResponse

      // 检查是否已取消
      if (abortController.signal.aborted) {
        console.log('🚫 请求已取消')
        isLoadingRef.current = false
        setIsLoading(false)
        return
      }

      console.log('✅ API响应:', data)

      if (data.success) {
        // 无论 data.data 是空数组还是 undefined，都设置为数组
        const gradesData = Array.isArray(data.data) ? data.data : []

        // 检查请求是否仍然有效
        if (abortControllerRef.current !== abortController) {
          console.log('⚠️ 请求已被新请求替代，忽略此响应')
          return
        }

        // 重置加载状态（使用函数式更新确保正确）
        isLoadingRef.current = false
        setIsLoading(false)

        // 更新数据
        setGrades(gradesData)
        setLastUpdated(new Date().toISOString())

        // 强制触发一次更新，确保UI刷新
        setForceUpdate(prev => prev + 1)

        console.log('✅ 状态已更新 - isLoading: false, grades.length:', gradesData.length)

        // 保存到缓存
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''
        const cacheKey = `${CACHE_KEYS.GRADES}_${currentYear}_${currentTerm}`
        DataCacheManager.set(cacheKey, gradesData, userId, currentSchool.id)
        console.log(`已缓存成绩数据: ${gradesData.length} 条`)

        // 延迟显示 toast，避免影响状态更新
        setTimeout(() => {
          if (gradesData.length === 0) {
            toast.success('该学期暂无成绩记录', {
              icon: 'ℹ️'
            })
          } else {
            toast.success(data.message || `成功获取 ${gradesData.length} 条成绩记录`)
          }
        }, 100)
      } else {
        const errorMsg = data.error || data.message || '获取成绩失败'
        console.error('❌ 获取成绩失败:', errorMsg)

        // 检查请求是否仍然有效
        if (abortControllerRef.current !== abortController) {
          console.log('⚠️ 请求已被新请求替代，忽略此错误')
          return
        }

        // 重置加载状态
        isLoadingRef.current = false
        setIsLoading(false)

        setGrades([])
        setLastUpdated(null)

        // 强制触发一次更新
        setForceUpdate(prev => prev + 1)

        console.log('🔄 错误状态已更新 - isLoading: false')

        setTimeout(() => {
          if (errorMsg.includes('Cookie') || errorMsg.includes('登录')) {
            toast.error(errorMsg, {
              duration: 5000
            })
          } else {
            toast.error(errorMsg)
          }
        }, 100)
      }
    } catch (error: any) {
      // 检查是否已取消
      if (abortController.signal.aborted || abortControllerRef.current !== abortController) {
        console.log('🚫 请求已取消（异常）')
        // 如果这是当前活跃的请求，才重置状态
        if (abortControllerRef.current === abortController) {
          isLoadingRef.current = false
          setIsLoading(false)
          setForceUpdate(prev => prev + 1)
        }
        return
      }

      const errorMessage = error.message || '获取成绩失败'
      console.error('❌ 获取成绩异常:', error)

      // 检查请求是否仍然有效
      if (abortControllerRef.current !== abortController) {
        console.log('⚠️ 请求已被新请求替代，忽略此异常')
        return
      }

      // 重置加载状态
      isLoadingRef.current = false
      setIsLoading(false)

      setGrades([])
      setLastUpdated(null)

      // 强制触发一次更新
      setForceUpdate(prev => prev + 1)

      console.log('🔄 异常状态已更新 - isLoading: false')

      setTimeout(() => {
        toast.error(errorMessage)
      }, 100)
    } finally {
      // 清理 AbortController（仅当这是当前活跃的请求时）
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }, [selectedYear, selectedTerm])

  // 获取总体成绩数据
  const fetchOverallGrades = useCallback(async () => {
    // 取消之前的请求（如果有），并重置状态
    if (overallAbortControllerRef.current) {
      overallAbortControllerRef.current.abort()
      overallAbortControllerRef.current = null
    }

    // 确保之前的加载状态已清除
    if (overallLoadingRef.current) {
      overallLoadingRef.current = false
      setIsLoadingOverall(false)
    }

    // 创建新的 AbortController
    const abortController = new AbortController()
    overallAbortControllerRef.current = abortController

    // 设置加载状态
    overallLoadingRef.current = true
    setIsLoadingOverall(true)

    // 清空之前的数据
    setOverallGrades([])
    setOverallGPA(null)
    setLastUpdatedOverall(null)

    console.log('🚀 开始获取总体成绩数据')

    try {
      const { courseAPI } = await import('@/lib/api')

      // 添加超时处理
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('请求超时，请检查网络连接'))
        }, 60000) // 总体成绩可能需要更长时间
      })

      // 获取当前学校ID（从localStorage读取，确保用户隔离）
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()

      const data: OverallGradeResponse = await Promise.race([
        courseAPI.getOverallGrades(undefined, currentSchool.id),
        timeoutPromise
      ]) as OverallGradeResponse

      // 检查是否已取消
      if (abortController.signal.aborted || overallAbortControllerRef.current !== abortController) {
        console.log('🚫 请求已取消')
        overallLoadingRef.current = false
        setIsLoadingOverall(false)
        return
      }

      console.log('✅ 总体成绩API响应:', data)

      if (data.success) {
        // 无论 data.data 是空数组还是 undefined，都设置为数组
        const gradesData = Array.isArray(data.data) ? data.data : []

        // 检查请求是否仍然有效
        if (overallAbortControllerRef.current !== abortController) {
          console.log('⚠️ 请求已被新请求替代，忽略此响应')
          return
        }

        // 重置加载状态
        overallLoadingRef.current = false
        setIsLoadingOverall(false)

        // 更新数据
        setOverallGrades(gradesData)
        setOverallGPA(data.gpa || null)
        setLastUpdatedOverall(new Date().toISOString())

        console.log('✅ 总体成绩状态已更新 - isLoading: false, grades.length:', gradesData.length, 'GPA:', data.gpa)

        // 延迟显示 toast
        setTimeout(() => {
          if (gradesData.length === 0) {
            toast.success('暂无总体成绩记录', {
              icon: 'ℹ️'
            })
          } else {
            toast.success(data.message || `成功获取 ${gradesData.length} 条总体成绩记录`)
          }
        }, 100)
      } else {
        const errorMsg = data.error || data.message || '获取总体成绩失败'
        console.error('❌ 获取总体成绩失败:', errorMsg)

        // 检查请求是否仍然有效
        if (overallAbortControllerRef.current !== abortController) {
          console.log('⚠️ 请求已被新请求替代，忽略此错误')
          return
        }

        // 重置加载状态
        overallLoadingRef.current = false
        setIsLoadingOverall(false)

        setOverallGrades([])
        setOverallGPA(null)
        setLastUpdatedOverall(null)

        console.log('🔄 总体成绩错误状态已更新 - isLoading: false')

        setTimeout(() => {
          if (errorMsg.includes('Cookie') || errorMsg.includes('登录')) {
            toast.error(errorMsg, {
              duration: 5000
            })
          } else {
            toast.error(errorMsg)
          }
        }, 100)
      }
    } catch (error: any) {
      // 检查是否已取消
      if (abortController.signal.aborted || overallAbortControllerRef.current !== abortController) {
        console.log('🚫 请求已取消（异常）')
        if (overallAbortControllerRef.current === abortController) {
          overallLoadingRef.current = false
          setIsLoadingOverall(false)
        }
        return
      }

      const errorMessage = error.message || '获取总体成绩失败'
      console.error('❌ 获取总体成绩异常:', error)

      // 检查请求是否仍然有效
      if (overallAbortControllerRef.current !== abortController) {
        console.log('⚠️ 请求已被新请求替代，忽略此异常')
        return
      }

      // 重置加载状态
      overallLoadingRef.current = false
      setIsLoadingOverall(false)

      setOverallGrades([])
      setOverallGPA(null)
      setLastUpdatedOverall(null)

      console.log('🔄 总体成绩异常状态已更新 - isLoading: false')

      setTimeout(() => {
        toast.error(errorMessage)
      }, 100)
    } finally {
      // 清理 AbortController（仅当这是当前活跃的请求时）
      if (overallAbortControllerRef.current === abortController) {
        overallAbortControllerRef.current = null
      }
    }
  }, [])

  // 按 xfyqjd_id 分组成绩
  const groupedGrades = React.useMemo(() => {
    const groups = new Map<string, OverallGradeItem[]>()
    overallGrades.forEach(grade => {
      const key = grade.xfyqjd_id || 'default'
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(grade)
    })
    return Array.from(groups.entries()).map(([id, courses]) => {
      const totalCredits = courses.reduce((sum, c) => sum + (parseFloat(c.xf) || 0), 0)
      const passedCredits = courses.filter(c => {
        const score = parseFloat(c.cj)
        const cj = c.cj || ''
        return !isNaN(score) ? score >= 60 : (cj.includes('优') || cj.includes('良') || cj.includes('中') || cj.includes('合格') || cj.includes('Pass'))
      }).reduce((sum, c) => sum + (parseFloat(c.xf) || 0), 0)
      const passedCount = courses.filter(c => {
        const score = parseFloat(c.cj)
        const cj = c.cj || ''
        return !isNaN(score) ? score >= 60 : (cj.includes('优') || cj.includes('良') || cj.includes('中') || cj.includes('合格') || cj.includes('Pass'))
      }).length

      return {
        id,
        courses,
        categoryName: courses[0]?.kcxzmc || `分类 ${id.substring(0, 8)}...` || '未分类',
        totalCredits,
        passedCredits,
        requiredCredits: totalCredits, // 可以后续从数据中获取
        passedCount,
        totalCount: courses.length
      }
    })
  }, [overallGrades])

  // 默认展开第一个分类
  useEffect(() => {
    if (groupedGrades.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set([groupedGrades[0].id]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedGrades.length])

  // 切换分类展开/折叠
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // 获取课程状态图标
  const getCourseStatusIcon = (cj: string) => {
    const score = parseFloat(cj)
    if (!isNaN(score)) {
      if (score >= 60) {
        return <CheckCircle className="h-5 w-5 text-green-400" />
      } else {
        return <Circle className="h-5 w-5 text-gray-400" />
      }
    } else {
      const cjUpper = cj.toUpperCase()
      if (cjUpper.includes('优') || cjUpper.includes('A') || cjUpper.includes('EXCELLENT')) {
        return <CheckCircle className="h-5 w-5 text-green-400" />
      } else if (cjUpper.includes('良') || cjUpper.includes('B') || cjUpper.includes('GOOD')) {
        return <CheckCircle className="h-5 w-5 text-blue-400" />
      } else if (cjUpper.includes('中') || cjUpper.includes('C') || cjUpper.includes('MEDIUM')) {
        return <CheckCircle className="h-5 w-5 text-yellow-400" />
      } else if (cjUpper.includes('合格') || cjUpper.includes('PASS')) {
        return <CheckCircle className="h-5 w-5 text-green-400" />
      } else {
        return <Circle className="h-5 w-5 text-gray-400" />
      }
    }
  }

  // 判断课程是否有成绩
  const hasGrade = (cj: string): boolean => {
    if (!cj || cj.trim() === '' || cj === '-' || cj === '未评分' || cj === 'null' || cj === 'undefined') {
      return false
    }
    const score = parseFloat(cj)
    if (!isNaN(score) && score >= 0) {
      return true
    }
    // 检查文字成绩
    const cjUpper = cj.toUpperCase()
    return cjUpper.includes('优') || cjUpper.includes('良') || cjUpper.includes('中') ||
      cjUpper.includes('合格') || cjUpper.includes('A') || cjUpper.includes('B') ||
      cjUpper.includes('C') || cjUpper.includes('PASS') || cjUpper.includes('EXCELLENT') ||
      cjUpper.includes('GOOD') || cjUpper.includes('MEDIUM')
  }

  // 计算平均绩点（只计算有成绩的课程）
  const calculateAverageGPA = () => {
    if (grades.length === 0) return '0.00'

    // 只考虑有成绩的课程
    const gradedCourses = grades.filter(grade => hasGrade(grade.cj))

    if (gradedCourses.length === 0) return '0.00'

    const totalPoints = gradedCourses.reduce((sum, grade) => {
      const jd = parseFloat(grade.jd) || 0
      const xf = parseFloat(grade.xf) || 0
      return sum + jd * xf
    }, 0)

    const totalCredits = gradedCourses.reduce((sum, grade) => {
      return sum + (parseFloat(grade.xf) || 0)
    }, 0)

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00'
  }

  // 计算总学分
  const calculateTotalCredits = () => {
    return grades.reduce((sum, grade) => {
      return sum + (parseFloat(grade.xf) || 0)
    }, 0).toFixed(1)
  }

  // 导出成绩单
  const exportGrades = () => {
    const termName = selectedTerm === '3' ? '上学期' : selectedTerm === '12' ? '下学期' : '未知'
    const yearLabel = yearOptions.find(y => y.value === selectedYear)?.label || selectedYear

    let content = `成绩单导出\n`
    content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`
    content += `${yearLabel} ${termName}\n\n`
    content += `课程名称\t课程号\t学分\t成绩\t绩点\t课程性质\t考试性质\n`
    content += `${'='.repeat(80)}\n`

    grades.forEach(grade => {
      content += `${grade.kcmc}\t${grade.kch}\t${grade.xf}\t${grade.cj}\t${grade.jd}\t${grade.kcxzmc}\t${grade.ksxzmc}\n`
    })

    content += `\n统计信息:\n`
    content += `总课程数: ${grades.length}\n`
    content += `总学分: ${calculateTotalCredits()}\n`
    content += `平均绩点: ${calculateAverageGPA()}\n`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `成绩单_${selectedYear}_${selectedTerm}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('成绩单导出成功')
  }

  // 获取成绩等级颜色
  const getGradeColor = (cj: string): string => {
    const score = parseFloat(cj)
    if (isNaN(score)) {
      // 处理文字成绩
      if (cj.includes('优') || cj.includes('A')) return 'text-green-400'
      if (cj.includes('良') || cj.includes('B')) return 'text-blue-400'
      if (cj.includes('中') || cj.includes('C')) return 'text-yellow-400'
      if (cj.includes('合格') || cj.includes('Pass')) return 'text-green-400'
      return 'text-gray-400'
    }
    if (score >= 90) return 'text-green-400 font-semibold'
    if (score >= 80) return 'text-blue-400'
    if (score >= 70) return 'text-yellow-400'
    if (score >= 60) return 'text-orange-400'
    return 'text-red-400'
  }

  // 获取成绩背景渐变
  const getGradeGradient = (cj: string): string => {
    const score = parseFloat(cj)
    if (isNaN(score)) {
      if (cj.includes('优') || cj.includes('A')) return 'from-green-500/20 to-emerald-500/20'
      if (cj.includes('良') || cj.includes('B')) return 'from-blue-500/20 to-cyan-500/20'
      return 'from-purple-500/20 to-violet-500/20'
    }
    if (score >= 90) return 'from-green-500/20 to-emerald-500/20'
    if (score >= 80) return 'from-blue-500/20 to-cyan-500/20'
    if (score >= 70) return 'from-yellow-500/20 to-orange-500/20'
    if (score >= 60) return 'from-orange-500/20 to-red-500/20'
    return 'from-red-500/20 to-pink-500/20'
  }

  // 成绩卡片组件（使用memo优化，减少重复渲染）
  const GradeCard = memo(({ grade, index, animationConfig, getGradeColor, getGradeGradient }: {
    grade: GradeItem
    index: number
    animationConfig: ReturnType<typeof getAnimationConfig>
    getGradeColor: (cj: string) => string
    getGradeGradient: (cj: string) => string
  }) => {
    return (
      <motion.div
        initial={animationConfig.enabled ? {
          opacity: 0,
          y: animationConfig.reduceMotion ? 0 : 20,
          scale: animationConfig.reduceMotion ? 1 : 0.95
        } : false}
        animate={animationConfig.enabled ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{
          delay: animationConfig.reduceMotion ? 0 : index * 0.05,
          duration: animationConfig.duration,
          type: "tween",
          ease: "easeOut"
        }}
        whileHover={animationConfig.disableHoverEffects ? {} : { y: -5, scale: 1.02 }}
        style={animationConfig.useGPU ? { transform: 'translateZ(0)', willChange: 'transform' } : {}}
      >
        <Card className={`border-purple-400/30 bg-gradient-to-br ${getGradeGradient(grade.cj)} bg-slate-800/60 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-xl'} hover:border-purple-400/60 transition-all duration-300 shadow-lg`}>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6">
              {/* 课程信息 */}
              <div className="md:col-span-7">
                <motion.h3
                  className="font-bold text-lg sm:text-xl text-white mb-2 sm:mb-3"
                  whileHover={animationConfig.disableHoverEffects ? {} : { x: 5 }}
                >
                  {grade.kcmc}
                </motion.h3>
                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-300">
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500">课程号:</span>
                    <span className="text-white">{grade.kch}</span>
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500">学分:</span>
                    <span className="text-white font-semibold">{grade.xf}</span>
                  </span>
                  {grade.kcxzmc && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 border border-purple-400/30">
                        {grade.kcxzmc}
                      </span>
                    </>
                  )}
                </div>
                {grade.kssj && (
                  <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    考试时间: {grade.kssj}
                  </div>
                )}
              </div>

              {/* 成绩信息 */}
              <div className="md:col-span-5 flex items-center justify-between mt-4 md:mt-0">
                <div className="flex items-center gap-4 sm:gap-6">
                  <motion.div
                    whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="text-xs text-gray-400 mb-1 sm:mb-2">成绩</div>
                    <div className={`text-3xl sm:text-4xl font-bold ${getGradeColor(grade.cj)}`}>
                      {grade.cj || '未评分'}
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="text-xs text-gray-400 mb-2">绩点</div>
                    <div className="text-3xl font-semibold text-purple-400">
                      {grade.jd || '0.0'}
                    </div>
                  </motion.div>
                </div>

                {/* 其他信息 */}
                {grade.ksxzmc && (
                  <div className="text-right">
                    <span className="px-3 py-1 bg-slate-700/50 rounded-lg text-xs text-gray-300 border border-gray-600/50">
                      {grade.ksxzmc}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  })

  GradeCard.displayName = 'GradeCard'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-1.5 sm:p-4">
      <div className="w-full max-w-full lg:max-w-[78vw] mx-auto space-y-3 sm:space-y-6 rounded-2xl overflow-hidden">
        {/* 标题和操作栏 */}
        <motion.div
          initial={animationConfig.enabled ? { opacity: 0, y: -20 } : false}
          animate={animationConfig.enabled ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: animationConfig.duration }}
        >
          <Card className={`border-purple-500/30 bg-slate-800/80 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-xl'} shadow-2xl`}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-1.5 sm:gap-3 text-lg sm:text-3xl text-white mb-1 sm:mb-2">
                    {animationConfig.reduceMotion ? (
                      <Award className="h-5 w-5 sm:h-8 sm:w-8 text-purple-400" />
                    ) : (
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <Award className="h-5 w-5 sm:h-8 sm:w-8 text-purple-400" />
                      </motion.div>
                    )}
                    成绩查询
                  </CardTitle>
                  <CardDescription className="text-gray-300 mt-1 sm:mt-2 text-xs sm:text-base">
                    查询并查看您的课程成绩信息
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <motion.div
                    whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05 }}
                    whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.95 }}
                    className="flex-1 sm:flex-none"
                  >
                    <Button
                      onClick={exportGrades}
                      disabled={grades.length === 0 || isLoading}
                      variant="outline"
                      className="border-purple-400/50 bg-slate-700/50 hover:bg-purple-500/20 text-white hover:text-white w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4"
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">导出成绩单</span>
                      <span className="sm:hidden">导出</span>
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05 }}
                    whileTap={animationConfig.disableHoverEffects ? {} : { scale: 0.95 }}
                    className="flex-1 sm:flex-none"
                  >
                    <Button
                      onClick={fetchGrades}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/50 w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">查询成绩</span>
                      <span className="sm:hidden">查询</span>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                {/* 学年选择 */}
                <CustomSelect
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={yearOptions}
                  icon={<Calendar className="h-5 w-5 text-purple-400" />}
                  label="学年:"
                  delay={0.1}
                />

                {/* 学期选择 */}
                <CustomSelect
                  value={selectedTerm}
                  onChange={setSelectedTerm}
                  options={[
                    { value: '3', label: '上学期' },
                    { value: '12', label: '下学期' }
                  ]}
                  icon={<BookOpen className="h-5 w-5 text-purple-400" />}
                  label="学期:"
                  delay={0.2}
                />

                {/* 最后更新时间 */}
                <AnimatePresence>
                  {lastUpdated && (
                    <motion.div
                      className="w-full sm:w-auto sm:ml-auto text-xs sm:text-sm text-gray-400 flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">最后更新: </span>
                      {new Date(lastUpdated).toLocaleString('zh-CN')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 统计信息 */}
              <AnimatePresence>
                {grades.length > 0 && (
                  <motion.div
                    className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 relative"
                    initial={animationConfig.enabled ? { opacity: 0, y: 20 } : false}
                    animate={animationConfig.enabled ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: animationConfig.reduceMotion ? 0 : 0.3, duration: animationConfig.duration }}
                    style={animationConfig.useGPU ? { transform: 'translateZ(0)', willChange: 'transform' } : { zIndex: 1 }}
                  >
                    <motion.div
                      className={`p-3 sm:p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-400/30 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-sm'}`}
                      whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05, y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                        <div className="text-xs sm:text-sm text-gray-300">课程总数</div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{grades.length}</div>
                    </motion.div>
                    <motion.div
                      className="p-3 sm:p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-400/30 backdrop-blur-sm"
                      whileHover={{ scale: 1.05, y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                        <div className="text-xs sm:text-sm text-gray-300">总学分</div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{calculateTotalCredits()}</div>
                    </motion.div>
                    <motion.div
                      className="p-3 sm:p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-400/30 backdrop-blur-sm"
                      whileHover={{ scale: 1.05, y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                        <div className="text-xs sm:text-sm text-gray-300">平均绩点</div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-green-400">{calculateAverageGPA()}</div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* 成绩列表 */}
        <AnimatePresence mode="wait" key={`${forceUpdate}-${isLoading}`}>
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-purple-500/30 bg-slate-800/80 backdrop-blur-xl">
                <CardContent className="flex items-center justify-center py-8 sm:py-16">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2 sm:mr-4"
                  >
                    <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                  </motion.div>
                  <span className="text-gray-300 text-sm sm:text-lg">正在加载成绩数据...</span>
                </CardContent>
              </Card>
            </motion.div>
          ) : grades.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-purple-500/30 bg-slate-800/80 backdrop-blur-xl">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertCircle className="h-16 w-16 text-gray-500 mb-4" />
                  </motion.div>
                  <p className="text-gray-400 text-xl mb-2">暂无成绩数据</p>
                  <p className="text-gray-500 text-sm">
                    {lastUpdated
                      ? `${yearOptions.find(y => y.value === selectedYear)?.label || selectedYear} ${selectedTerm === '3' ? '上学期' : '下学期'}暂无成绩记录`
                      : '请选择学年和学期后点击"查询成绩"'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="grades"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {grades.map((grade, index) => (
                <GradeCard
                  key={`${grade.kch_id || index}-${grade.kcmc}`}
                  grade={grade}
                  index={index}
                  animationConfig={animationConfig}
                  getGradeColor={getGradeColor}
                  getGradeGradient={getGradeGradient}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 总体成绩查询区域 */}
        <motion.div
          initial={animationConfig.enabled ? { opacity: 0, y: 20 } : false}
          animate={animationConfig.enabled ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: animationConfig.duration, delay: animationConfig.reduceMotion ? 0 : 0.2 }}
        >
          <Card className="border-purple-500/30 bg-slate-800/80 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl text-white mb-2">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <TrendingUp className="h-6 w-6 text-green-400" />
                    </motion.div>
                    学生总体成绩查询
                  </CardTitle>
                  <CardDescription className="text-gray-300 mt-2">
                    查询您的所有课程总体成绩信息
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={fetchOverallGrades}
                      disabled={isLoadingOverall}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/50"
                    >
                      {isLoadingOverall ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      查询总体成绩
                    </Button>
                  </motion.div>
                </div>
              </div>
              {lastUpdatedOverall && (
                <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  最后更新: {new Date(lastUpdatedOverall).toLocaleString('zh-CN')}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {isLoadingOverall ? (
                  <motion.div
                    key="loading-overall"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex items-center justify-center py-16">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-4"
                      >
                        <Loader2 className="h-8 w-8 text-green-400" />
                      </motion.div>
                      <span className="text-gray-300 text-lg">正在加载总体成绩数据...</span>
                    </div>
                  </motion.div>
                ) : overallGrades.length === 0 ? (
                  <motion.div
                    key="empty-overall"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div className="flex flex-col items-center justify-center py-16">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <AlertCircle className="h-16 w-16 text-gray-500 mb-4" />
                      </motion.div>
                      <p className="text-gray-400 text-xl mb-2">暂无总体成绩数据</p>
                      <p className="text-gray-500 text-sm">
                        {lastUpdatedOverall
                          ? '该查询暂无总体成绩记录'
                          : '点击"查询总体成绩"按钮获取数据'}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="overall-grades"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* 总体成绩统计 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <motion.div
                        className={`p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-400/30 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-sm'}`}
                        whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05, y: -5 }}
                        transition={{ type: "tween", duration: animationConfig.duration }}
                        style={animationConfig.useGPU ? { transform: 'translateZ(0)', willChange: 'transform' } : {}}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="h-5 w-5 text-green-400" />
                          <div className="text-sm text-gray-300">总课程数</div>
                        </div>
                        <div className="text-3xl font-bold text-white">{overallGrades.length}</div>
                      </motion.div>
                      <motion.div
                        className={`p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-400/30 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-sm'}`}
                        whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05, y: -5 }}
                        transition={{ type: "tween", duration: animationConfig.duration }}
                        style={animationConfig.useGPU ? { transform: 'translateZ(0)', willChange: 'transform' } : {}}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-5 w-5 text-blue-400" />
                          <div className="text-sm text-gray-300">总学分</div>
                        </div>
                        <div className="text-3xl font-bold text-white">
                          {overallGrades.reduce((sum, grade) => sum + (parseFloat(grade.xf) || 0), 0).toFixed(1)}
                        </div>
                      </motion.div>
                      <motion.div
                        className={`p-4 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl border border-purple-400/30 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-sm'}`}
                        whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05, y: -5 }}
                        transition={{ type: "tween", duration: animationConfig.duration }}
                        style={animationConfig.useGPU ? { transform: 'translateZ(0)', willChange: 'transform' } : {}}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-purple-400" />
                          <div className="text-sm text-gray-300">平均绩点</div>
                        </div>
                        <div className="text-3xl font-bold text-purple-400">
                          {(() => {
                            // 只考虑有成绩的课程
                            const gradedCourses = overallGrades.filter(grade => hasGrade(grade.cj))

                            if (gradedCourses.length === 0) return '0.00'

                            const totalPoints = gradedCourses.reduce((sum, grade) => {
                              const jd = parseFloat(grade.jd) || 0
                              const xf = parseFloat(grade.xf) || 0
                              return sum + jd * xf
                            }, 0)

                            const totalCredits = gradedCourses.reduce((sum, grade) => sum + (parseFloat(grade.xf) || 0), 0)

                            return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00'
                          })()}
                        </div>
                      </motion.div>
                      {overallGPA && (
                        <motion.div
                          className={`p-4 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl border border-red-400/30 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-sm'}`}
                          initial={animationConfig.enabled ? { opacity: 0, scale: 0.9 } : false}
                          animate={animationConfig.enabled ? { opacity: 1, scale: 1 } : {}}
                          whileHover={animationConfig.disableHoverEffects ? {} : { scale: 1.05, y: -5 }}
                          transition={{ type: "tween", duration: animationConfig.duration }}
                          style={animationConfig.useGPU ? { transform: 'translateZ(0)', willChange: 'transform' } : {}}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="h-5 w-5 text-red-400" />
                            <div className="text-sm text-gray-300">总体GPA</div>
                          </div>
                          <div className="text-3xl font-bold text-red-400">
                            {overallGPA}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">来自系统</div>
                        </motion.div>
                      )}
                    </div>

                    {/* 树状结构展示 */}
                    <div className="space-y-3">
                      {groupedGrades.map((group, groupIndex) => {
                        const isExpanded = expandedCategories.has(group.id)

                        return (
                          <motion.div
                            key={group.id}
                            initial={animationConfig.enabled ? { opacity: 0, y: animationConfig.reduceMotion ? 0 : 20 } : false}
                            animate={animationConfig.enabled ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: animationConfig.reduceMotion ? 0 : groupIndex * 0.05, duration: animationConfig.duration, type: "tween" }}
                            className="relative"
                            style={animationConfig.useGPU ? { transform: 'translateZ(0)', willChange: 'transform' } : {}}
                          >
                            {/* 连接线 */}
                            {groupIndex < groupedGrades.length - 1 && (
                              <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-blue-500/30" />
                            )}

                            {/* 左侧连接点 */}
                            <div className="absolute left-5 top-6 w-2 h-2 rounded-full bg-blue-400 border-2 border-slate-800" />

                            {/* 分类卡片 */}
                            <Card className={`border-blue-400/30 bg-slate-700/50 ${animationConfig.disableBackdropBlur ? '' : 'backdrop-blur-xl'} hover:border-blue-400/60 transition-all duration-300`}>
                              <CardContent className="p-0">
                                <motion.button
                                  onClick={() => toggleCategory(group.id)}
                                  className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-600/50 transition-colors rounded-t-lg"
                                  whileHover={animationConfig.disableHoverEffects ? {} : { x: 2 }}
                                  transition={{ type: "tween", duration: animationConfig.duration }}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <motion.div
                                      animate={animationConfig.enabled ? { rotate: isExpanded ? 90 : 0 } : {}}
                                      transition={{ duration: animationConfig.duration, type: "tween" }}
                                    >
                                      <ChevronRight className="h-5 w-5 text-blue-400" />
                                    </motion.div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-semibold text-lg text-white">{group.categoryName}</h3>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                                        <span>
                                          <span className="text-gray-400">要求学分:</span>{' '}
                                          <span className="text-white font-semibold">{group.requiredCredits.toFixed(1)}</span>
                                        </span>
                                        <span>
                                          <span className="text-gray-400">获得学分:</span>{' '}
                                          <span className="text-green-400 font-semibold">{group.passedCredits.toFixed(1)}</span>
                                        </span>
                                        <span>
                                          <span className="text-gray-400">未获得学分:</span>{' '}
                                          <span className="text-orange-400 font-semibold">{(group.requiredCredits - group.passedCredits).toFixed(1)}</span>
                                        </span>
                                        <span>
                                          共({group.totalCount})门通过({group.passedCount})门
                                        </span>
                                      </div>
                                    </div>
                                    <motion.div
                                      animate={animationConfig.enabled ? { rotate: isExpanded ? 180 : 0 } : {}}
                                      transition={{ duration: animationConfig.duration, type: "tween" }}
                                    >
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    </motion.div>
                                  </div>
                                </motion.button>

                                {/* 课程列表（可展开/折叠） */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={animationConfig.enabled ? { height: 0, opacity: 0 } : false}
                                      animate={animationConfig.enabled ? { height: 'auto', opacity: 1 } : {}}
                                      exit={animationConfig.enabled ? { height: 0, opacity: 0 } : undefined}
                                      transition={{ duration: animationConfig.duration, type: "tween" }}
                                      className="overflow-hidden"
                                    >
                                      <div className="border-t border-slate-600/50 p-4 space-y-2">
                                        {/* 表头 */}
                                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-300 mb-3 pb-2 border-b border-slate-500/50 bg-slate-700/30 px-2 py-2 rounded">
                                          <div className="col-span-1 text-center">修读状态</div>
                                          <div className="col-span-2">课程号</div>
                                          <div className="col-span-4">课程名称</div>
                                          <div className="col-span-1 text-center">学分</div>
                                          <div className="col-span-1 text-center">最大成绩</div>
                                          <div className="col-span-1 text-center">绩点</div>
                                          <div className="col-span-2">课程性质</div>
                                        </div>

                                        {/* 课程项 */}
                                        {group.courses.map((grade, courseIndex) => (
                                          <motion.div
                                            key={`${grade.kch || courseIndex}-${grade.kcmc}`}
                                            initial={animationConfig.enabled ? { opacity: 0, x: animationConfig.reduceMotion ? 0 : -20 } : false}
                                            animate={animationConfig.enabled ? { opacity: 1, x: 0 } : {}}
                                            transition={{ delay: animationConfig.reduceMotion ? 0 : courseIndex * 0.02, duration: animationConfig.duration, type: "tween" }}
                                            className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded hover:bg-slate-600/30 transition-colors"
                                            style={animationConfig.useGPU ? { transform: 'translateZ(0)', willChange: 'transform' } : {}}
                                          >
                                            <div className="col-span-1 flex justify-center">
                                              {getCourseStatusIcon(grade.cj)}
                                            </div>
                                            <div className="col-span-2 text-blue-300 text-sm font-mono">
                                              {grade.kch}
                                            </div>
                                            <div className="col-span-4 text-white text-sm">
                                              {grade.kcmc}
                                            </div>
                                            <div className="col-span-1 text-center text-gray-300 text-sm">
                                              {grade.xf}
                                            </div>
                                            <div className={`col-span-1 text-center font-semibold text-sm ${getGradeColor(grade.cj)}`}>
                                              {grade.MAXCJ || grade.cj || '-'}
                                            </div>
                                            <div className="col-span-1 text-center text-green-400 text-sm">
                                              {grade.jd || '0.0'}
                                            </div>
                                            <div className="col-span-2 text-gray-400 text-xs">
                                              {grade.kcxzmc || '-'}
                                            </div>
                                          </motion.div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
