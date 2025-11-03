'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Search, 
  RefreshCw,
  Download,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Filter,
  Settings,
  Star,
  Heart,
  Eye,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI } from '@/lib/api'

interface ScheduleCourse {
  name: string
  teacher: string
  location: string
  day: number
  period: number
  time: string
  weeks: string
  class: string
  credit: string
  assessment: string
  course_type: string
  campus: string
  hours: {
    total: string
    lecture: string
  }
  kch_id?: string
  jxb_id?: string
  xqjmc?: string  // 原始星期字段
  jcs?: string    // 原始节次字段
  xqj?: string    // 原始星期数字字段
}

export default function ModernSchedulePage() {
  const [scheduleData, setScheduleData] = useState<ScheduleCourse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<ScheduleCourse | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showEmptySlots, setShowEmptySlots] = useState(false)
  const [favoriteCourses, setFavoriteCourses] = useState<Set<string>>(new Set())
  const [currentWeek, setCurrentWeek] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  
  // 使用ref来存储稳定的函数引用
  const scheduleDataRef = useRef<ScheduleCourse[]>([])
  const isExportingRef = useRef(false)

  // 星期配置
  const weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  
  // 动态生成时间段配置 - 根据实际数据
  const dynamicPeriods = useMemo(() => {
    if (scheduleData.length === 0) {
      // 默认时间段配置
      return [
        { name: '1-2节', start: 1, end: 2, time: '08:00-09:40', color: 'from-blue-500 to-blue-600' },
        { name: '3-4节', start: 3, end: 4, time: '10:00-11:40', color: 'from-green-500 to-green-600' },
        { name: '5-6节', start: 5, end: 6, time: '14:00-15:40', color: 'from-purple-500 to-purple-600' },
        { name: '7-8节', start: 7, end: 8, time: '16:00-17:40', color: 'from-orange-500 to-orange-600' },
        { name: '9-10节', start: 9, end: 10, time: '19:00-20:40', color: 'from-pink-500 to-pink-600' }
      ]
    }

    // 从实际数据中提取所有时间段
    const periodSet = new Set<number>()
    scheduleData.forEach(course => {
      if (course.period && typeof course.period === 'number') {
        periodSet.add(course.period)
      }
    })

    // 将时间段转换为数组并排序
    const periods = Array.from(periodSet).sort((a, b) => a - b)
    
    // 生成时间段配置
    const periodConfigs = periods.map(period => {
      const timeMap: Record<number, string> = {
        1: '08:00-08:45', 2: '08:55-09:40',
        3: '10:00-10:45', 4: '10:55-11:40',
        5: '14:00-14:45', 6: '14:55-15:40',
        7: '16:00-16:45', 8: '16:55-17:40',
        9: '19:00-19:45', 10: '19:55-20:40',
        11: '21:00-21:45', 12: '21:55-22:40'
      }
      
      const colors = [
        'from-blue-500 to-blue-600',
        'from-green-500 to-green-600', 
        'from-purple-500 to-purple-600',
        'from-orange-500 to-orange-600',
        'from-pink-500 to-pink-600',
        'from-indigo-500 to-indigo-600',
        'from-teal-500 to-teal-600',
        'from-red-500 to-red-600',
        'from-yellow-500 to-yellow-600',
        'from-cyan-500 to-cyan-600',
        'from-emerald-500 to-emerald-600',
        'from-violet-500 to-violet-600'
      ]

      return {
        name: `${period}节`,
        start: period,
        end: period,
        time: timeMap[period] || `${period}:00-${period}:45`,
        color: colors[(period - 1) % colors.length]
      }
    })

    console.log('🔍 动态生成的时间段配置:', periodConfigs)
    return periodConfigs
  }, [scheduleData])

  // 使用动态时间段
  const periods = dynamicPeriods

  // 获取课表数据
  const fetchScheduleData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true)
    try {
      console.log('🚀 开始获取课表数据...')
      
      // 获取当前学校ID（从localStorage读取，确保用户隔离）
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      
      // 如果不是强制刷新，尝试从本地存储加载
      if (!forceRefresh && typeof window !== 'undefined') {
        try {
          const storageKey = `schedule-${currentSchool.id}`
          const cachedData = localStorage.getItem(storageKey)
          if (cachedData) {
            const parsed = JSON.parse(cachedData)
            // 检查缓存是否有效（1小时内）
            if (parsed.timestamp && Date.now() - parsed.timestamp < 60 * 60 * 1000) {
              setScheduleData(parsed.data)
              scheduleDataRef.current = parsed.data
              console.log('✅ 从本地缓存加载课表数据')
              setIsLoading(false)
              return
            }
          }
        } catch (error) {
          console.warn('⚠️ 从本地存储加载课表数据失败:', error)
        }
      }
      
      // 检查Cookie是否设置 - 使用LocalCookieManager
      const { default: LocalCookieManager } = await import('@/lib/local-cookie-manager')
      const cookie = LocalCookieManager.getCookie()
      console.log('🍪 获取到的Cookie:', cookie ? '已获取' : '未获取')
      console.log('🍪 Cookie长度:', cookie ? cookie.length : 0)
      
      if (!cookie) {
        toast.error('请先在设置页面配置Cookie')
        setIsLoading(false)
        return
      }
      
      // 直接调用API而不是通过courseAPI，传递schoolId参数
      const response = await fetch(`/api/schedule?schoolId=${currentSchool.id}`, {
        method: 'GET',
        headers: {
          'x-course-cookie': cookie
        }
      })
      
      const result = await response.json()
      console.log('📊 API返回结果:', result)
      
      if (result.success && result.data) {
        // API已经返回格式化好的数据，直接使用（和原始课表页面一样）
        console.log('📊 API返回的原始数据:', result)
        console.log('📊 API返回的data字段:', result.data)
        console.log('📊 data字段类型:', typeof result.data)
        console.log('📊 data字段长度:', Array.isArray(result.data) ? result.data.length : '不是数组')
        
        if (Array.isArray(result.data) && result.data.length > 0) {
          console.log('📊 第一个课程的所有字段:', result.data[0])
          console.log('📊 第一个课程的day值:', result.data[0].day)
          console.log('📊 第一个课程的xqjmc值:', result.data[0].xqjmc)
          console.log('📊 第一个课程的xqj值:', result.data[0].xqj)
        }
        
        setScheduleData(result.data)
        scheduleDataRef.current = result.data
        
        // 保存课表数据到本地存储（以学校ID为键，确保用户隔离）
        try {
          const storageKey = `schedule-${currentSchool.id}`
          localStorage.setItem(storageKey, JSON.stringify({
            data: result.data,
            timestamp: Date.now(),
            schoolId: currentSchool.id
          }))
          console.log('✅ 课表数据已保存到本地存储')
        } catch (error) {
          console.warn('⚠️ 保存课表数据到本地存储失败:', error)
        }
        
        toast.success(`成功获取课表，共 ${result.data.length} 门课程`)
        console.log('✅ 课表数据获取成功:', result.data)
        
        // 调试：打印前几个课程的数据结构
        if (result.data.length > 0) {
          console.log('🔍 第一个课程数据结构:', result.data[0])
          console.log('🔍 所有课程的day和period值:', result.data.map((c: any) => ({ 
            name: c.name, 
            day: c.day, 
            period: c.period,
            dayType: typeof c.day,
            periodType: typeof c.period,
            originalXqjmc: c.xqjmc
          })))
          
          // 统计每天有多少课程
          const dayStats: Record<string, number> = {}
          result.data.forEach((course: any) => {
            const day = course.day
            if (!dayStats[day]) dayStats[day] = 0
            dayStats[day]++
          })
          console.log('🔍 每天课程统计:', dayStats)
        }
      } else {
        console.error('❌ 课表数据获取失败:', result)
        if (result.action === 'go_to_settings') {
          toast.error(result.message || '请先配置Cookie')
        } else {
          toast.error(result.message || '获取课表失败')
        }
      }
    } catch (error: any) {
      console.error('获取课表数据失败:', error)
      const errorMessage = error.message || '获取课表数据失败'
      if (errorMessage.includes('Cookie未设置')) {
        toast.error('请先配置Cookie', {
          duration: 5000
        })
      } else {
        toast.error('获取课表数据失败，请检查网络连接')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 过滤课程
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return scheduleData
    
    return scheduleData.filter(course => 
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [scheduleData, searchTerm])

  // 获取指定时间段和星期的课程
  const getCourseAtTime = useCallback((day: number, periodStart: number) => {
    const result = filteredCourses.filter(course => 
      course.day === day && course.period === periodStart
    )
    
    // 调试信息：只在有数据时打印，避免日志过多
    if (result.length > 0) {
      console.log(`🎯 getCourseAtTime(${day}, ${periodStart}):`, {
        filteredCoursesLength: filteredCourses.length,
        resultLength: result.length,
        result: result.map(c => ({ name: c.name, day: c.day, period: c.period }))
      })
    }
    
    return result
  }, [filteredCourses])

  // 切换收藏状态
  const toggleFavorite = useCallback((courseName: string) => {
    setFavoriteCourses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(courseName)) {
        newSet.delete(courseName)
        toast.success('已取消收藏')
      } else {
        newSet.add(courseName)
        toast.success('已添加到收藏')
      }
      return newSet
    })
  }, [])

  // 选择课程 - 使用useCallback避免重新渲染
  const selectCourse = useCallback((course: ScheduleCourse) => {
    setSelectedCourse(course)
  }, [])

  // 导出课表为图片 - 高端设计
  const exportSchedule = useCallback(async () => {
    const data = scheduleDataRef.current
    if (data.length === 0) {
      toast.error('没有课表数据可导出')
      return
    }

    if (isExportingRef.current) {
      toast.error('正在导出中，请稍候')
      return
    }

    isExportingRef.current = true
    setIsExporting(true)
    
    try {
      // 创建Canvas元素
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        toast.error('无法创建Canvas上下文')
        return
      }

      // 高端设计参数 - 增大尺寸
      const cellWidth = 320
      const cellHeight = 180
      const headerHeight = 90
      const timeColumnWidth = 180
      const weekdayCount = 7
      const padding = 80
      const cornerRadius = 20
      
      // 使用动态时间段 - 不使用钩子，直接计算
      const periodSet = new Set<number>()
      data.forEach(course => {
        if (course.period && typeof course.period === 'number') {
          periodSet.add(course.period)
        }
      })
      const periodsArray = Array.from(periodSet).sort((a, b) => a - b)
      const dynamicPeriods = periodsArray.map(period => ({
        name: `${period}节`,
        start: period,
        end: period,
        time: `${period}:00-${period}:45`
      }))
      
      canvas.width = padding * 2 + timeColumnWidth + (weekdayCount * cellWidth)
      canvas.height = padding * 2 + headerHeight + (dynamicPeriods.length * cellHeight)

      // 绘制高端渐变背景
      const bgGradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height))
      bgGradient.addColorStop(0, '#0a0a0a')
      bgGradient.addColorStop(0.3, '#1a1a2e')
      bgGradient.addColorStop(0.7, '#16213e')
      bgGradient.addColorStop(1, '#0f0f23')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 绘制高端装饰网格
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.lineWidth = 1
      const gridSize = 40
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // 绘制装饰性光效
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const size = Math.random() * 6 + 3
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }

      // 绘制高端标题区域 - 增大尺寸
      const titleHeight = 140
      const titleGradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
      titleGradient.addColorStop(0, '#667eea')
      titleGradient.addColorStop(0.5, '#764ba2')
      titleGradient.addColorStop(1, '#f093fb')
      
      // 绘制标题背景
      ctx.fillStyle = titleGradient
      ctx.fillRect(0, 0, canvas.width, titleHeight)
      
      // 绘制标题阴影效果
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
      ctx.shadowBlur = 30
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 15
      
      // 绘制主标题 - 增大字体
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('我的课表', canvas.width / 2, titleHeight / 2 - 15)
      
      // 绘制副标题 - 增大字体
      ctx.shadowBlur = 0
      ctx.font = '24px "Segoe UI", Arial, sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fillText(`${new Date().toLocaleDateString()}`, canvas.width / 2, titleHeight / 2 + 25)

      // 绘制表格区域
      const tableY = titleHeight + padding
      const tableX = padding
      
      // 绘制圆角表格背景卡片
      const tableWidth = canvas.width - padding * 2
      const tableHeight = canvas.height - tableY - padding
      const tableRadius = 20
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.beginPath()
      ctx.roundRect(tableX, tableY, tableWidth, tableHeight, tableRadius)
      ctx.fill()
      
      // 绘制圆角表格边框
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(tableX, tableY, tableWidth, tableHeight, tableRadius)
      ctx.stroke()

      // 绘制圆角表头
      const headerGradient = ctx.createLinearGradient(0, 0, 0, headerHeight)
      headerGradient.addColorStop(0, '#2d3748')
      headerGradient.addColorStop(1, '#1a202c')
      
      ctx.fillStyle = headerGradient
      ctx.beginPath()
      ctx.roundRect(tableX, tableY, tableWidth, headerHeight, [tableRadius, tableRadius, 0, 0])
      ctx.fill()
      
      // 绘制圆角时间列标题
      const timeGradient = ctx.createLinearGradient(0, 0, 0, headerHeight)
      timeGradient.addColorStop(0, '#4a5568')
      timeGradient.addColorStop(1, '#2d3748')
      
      ctx.fillStyle = timeGradient
      ctx.beginPath()
      ctx.roundRect(tableX, tableY, timeColumnWidth, headerHeight, [tableRadius, 0, 0, 0])
      ctx.fill()
      
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('时间', tableX + timeColumnWidth / 2, tableY + headerHeight / 2)

      // 绘制高端星期标题
      const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      const dayColors = [
        { start: '#ff6b6b', end: '#ee5a52' }, // 周一 - 红色系
        { start: '#4ecdc4', end: '#44a08d' }, // 周二 - 青色系
        { start: '#45b7d1', end: '#2196f3' }, // 周三 - 蓝色系
        { start: '#96ceb4', end: '#4caf50' }, // 周四 - 绿色系
        { start: '#feca57', end: '#ff9800' }, // 周五 - 橙色系
        { start: '#ff9ff3', end: '#e91e63' }, // 周六 - 粉色系
        { start: '#54a0ff', end: '#3f51b5' }  // 周日 - 紫色系
      ]
      
      for (let i = 0; i < weekdayCount; i++) {
        const x = tableX + timeColumnWidth + (i * cellWidth)
        const dayGradient = ctx.createLinearGradient(0, 0, 0, headerHeight)
        dayGradient.addColorStop(0, dayColors[i].start)
        dayGradient.addColorStop(1, dayColors[i].end)
        
        ctx.fillStyle = dayGradient
        ctx.beginPath()
        // 只有最后一个星期标题有右上角圆角
        const topRightRadius = i === weekdayCount - 1 ? tableRadius : 0
        ctx.roundRect(x, tableY, cellWidth, headerHeight, [0, topRightRadius, 0, 0])
        ctx.fill()
        
        // 绘制星期文字阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif'
        ctx.fillText(weekdays[i], x + cellWidth / 2, tableY + headerHeight / 2)
        
        ctx.shadowBlur = 0
      }

      // 绘制时间段和课程
      for (let periodIndex = 0; periodIndex < dynamicPeriods.length; periodIndex++) {
        const period = dynamicPeriods[periodIndex]
        const y = tableY + headerHeight + (periodIndex * cellHeight)

        // 绘制圆角时间段背景
        const periodGradient = ctx.createLinearGradient(0, 0, 0, cellHeight)
        periodGradient.addColorStop(0, '#4a5568')
        periodGradient.addColorStop(1, '#2d3748')
        
        ctx.fillStyle = periodGradient
        ctx.beginPath()
        // 只有最后一行时间段有左下角圆角
        const bottomLeftRadius = periodIndex === dynamicPeriods.length - 1 ? tableRadius : 0
        ctx.roundRect(tableX, y, timeColumnWidth, cellHeight, [0, 0, bottomLeftRadius, 0])
        ctx.fill()
        
        // 绘制时间段文字 - 增大字体
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif'
        ctx.fillText(period.name, tableX + timeColumnWidth / 2, y + cellHeight / 2 - 15)
        
        ctx.font = '16px "Segoe UI", Arial, sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.fillText(period.time, tableX + timeColumnWidth / 2, y + cellHeight / 2 + 20)

        // 绘制每天的课程
        for (let day = 1; day <= weekdayCount; day++) {
          const x = tableX + timeColumnWidth + ((day - 1) * cellWidth)
          
          // 查找该时间段的课程
          const courses = data.filter(course => 
            course.day === day && course.period === period.start
          )

          if (courses.length > 0) {
            // 绘制圆角课程背景渐变
            const courseGradient = ctx.createLinearGradient(0, 0, 0, cellHeight)
            courseGradient.addColorStop(0, '#667eea')
            courseGradient.addColorStop(0.5, '#764ba2')
            courseGradient.addColorStop(1, '#f093fb')
            
            ctx.fillStyle = courseGradient
            ctx.beginPath()
            // 只有右下角的课程卡片有右下角圆角
            const bottomRightRadius = (day === weekdayCount && periodIndex === dynamicPeriods.length - 1) ? tableRadius : 12
            ctx.roundRect(x, y, cellWidth, cellHeight, bottomRightRadius)
            ctx.fill()
            
            // 绘制圆角课程边框
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.roundRect(x, y, cellWidth, cellHeight, bottomRightRadius)
            ctx.stroke()

            // 绘制课程信息 - 优化文字显示
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif'
            ctx.textAlign = 'center'
            
            const course = courses[0] // 取第一个课程
            const lines = [
              course.name,
              course.teacher,
              course.location
            ].filter(line => line && line.trim())

            const lineHeight = 22
            const padding = 10
            const maxWidth = cellWidth - padding * 2
            const startY = y + (cellHeight - (lines.length * lineHeight)) / 2 + lineHeight

            for (let i = 0; i < lines.length; i++) {
              let text = lines[i]
              
              // 智能截断文字，确保不超出单元格
              if (ctx.measureText(text).width > maxWidth) {
                while (ctx.measureText(text + '...').width > maxWidth && text.length > 0) {
                  text = text.substring(0, text.length - 1)
                }
                text = text + '...'
              }
              
              ctx.fillText(text, x + cellWidth / 2, startY + (i * lineHeight))
            }

            // 如果有多个课程，显示高端数量徽章 - 增大尺寸
            if (courses.length > 1) {
              // 绘制徽章背景
              ctx.fillStyle = '#ff4757'
              ctx.beginPath()
              ctx.arc(x + cellWidth - 35, y + 35, 20, 0, Math.PI * 2)
              ctx.fill()
              
              // 绘制徽章边框
              ctx.strokeStyle = '#ffffff'
              ctx.lineWidth = 3
              ctx.stroke()
              
              // 绘制徽章文字
              ctx.fillStyle = '#ffffff'
              ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif'
              ctx.fillText(courses.length.toString(), x + cellWidth - 35, y + 42)
            }
          } else {
            // 绘制圆角空单元格
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
            ctx.beginPath()
            // 只有右下角的空单元格有右下角圆角
            const bottomRightRadius = (day === weekdayCount && periodIndex === dynamicPeriods.length - 1) ? tableRadius : 12
            ctx.roundRect(x, y, cellWidth, cellHeight, bottomRightRadius)
            ctx.fill()
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.roundRect(x, y, cellWidth, cellHeight, bottomRightRadius)
            ctx.stroke()
          }
        }
      }

      // 绘制圆角底部装饰 - 增大尺寸
      const footerY = canvas.height - 60
      const footerGradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
      footerGradient.addColorStop(0, 'rgba(102, 126, 234, 0.1)')
      footerGradient.addColorStop(1, 'rgba(118, 75, 162, 0.1)')
      
      ctx.fillStyle = footerGradient
      ctx.beginPath()
      ctx.roundRect(0, footerY, canvas.width, 60, [0, 0, 20, 20])
      ctx.fill()
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.font = '18px "Segoe UI", Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Generated by TYUST Course Selector', canvas.width / 2, footerY + 35)

      console.log('高端课表绘制完成，尺寸:', canvas.width, 'x', canvas.height)

      // 下载图片
      const link = document.createElement('a')
      link.download = `高端课表_${new Date().toLocaleDateString()}.png`
      link.href = canvas.toDataURL('image/png')
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('高端课表导出成功！')
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败，请重试')
    } finally {
      isExportingRef.current = false
      setIsExporting(false)
    }
  }, []) // 空依赖数组，使用ref

  // 初始化加载 - 使用更稳定的方式
  useEffect(() => {
    // 页面加载时自动获取课表数据
    fetchScheduleData()
  }, []) // 空依赖数组，只在挂载时执行一次

  // 课程卡片组件
  const CourseCard = ({ course, index }: { course: ScheduleCourse; index: number }) => {
    const isFavorite = favoriteCourses.has(course.name)
    const periodInfo = periods.find(p => p.start === course.period)
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        transition={{ 
          duration: 0.3,
          delay: index * 0.1,
          type: "spring",
          stiffness: 100
        }}
        whileHover={{ 
          scale: 1.05,
          y: -5,
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.95 }}
        className="relative group cursor-pointer"
        onClick={() => selectCourse(course)}
      >
        <div className={`
          relative overflow-hidden rounded-lg sm:rounded-xl p-1.5 sm:p-3 shadow-lg
          bg-gradient-to-br ${periodInfo?.color || 'from-gray-500 to-gray-600'}
          border border-white/20 backdrop-blur-sm
          hover:shadow-2xl hover:border-white/40
          transition-all duration-300
        `}>
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* 收藏按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite(course.name)
            }}
            className="absolute top-1 right-1 sm:top-2 sm:right-2 p-0.5 sm:p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Heart 
              className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-white'}`} 
            />
          </button>

          {/* 课程信息 */}
          <div className="relative z-10 pr-4 sm:pr-0">
            <h4 className="font-bold text-white text-[10px] sm:text-sm mb-0.5 sm:mb-1 truncate leading-tight">
              {course.name}
            </h4>
            <div className="space-y-0.5 sm:space-y-1 text-[9px] sm:text-xs text-white/90">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                <span className="truncate leading-tight">{course.teacher}</span>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                <span className="truncate leading-tight">{course.location}</span>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                <span className="leading-tight">{course.time}</span>
              </div>
            </div>
          </div>

          {/* 悬浮效果 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
      </motion.div>
    )
  }

  // 空时间段组件
  const EmptySlot = ({ day, period }: { day: number; period: number }) => {
    if (!showEmptySlots) return null
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-10 sm:h-20 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center"
      >
        <span className="text-white/40 text-[9px] sm:text-xs">空闲</span>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-2 sm:p-4">
      <div className="w-full max-w-full lg:max-w-[78vw] mx-auto space-y-4 sm:space-y-6 rounded-2xl overflow-hidden">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl sm:text-4xl font-bold text-white flex items-center justify-center gap-2 sm:gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Calendar className="h-6 w-6 sm:h-10 sm:w-10 text-blue-400" />
            </motion.div>
            我的课表
          </h1>
          <p className="text-white/70 text-sm sm:text-lg">现代化课程安排管理</p>
        </motion.div>

        {/* 控制面板 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col lg:flex-row gap-4 items-center justify-between"
        >
          {/* 搜索和筛选 */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="搜索课程、教师或地点..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowEmptySlots(!showEmptySlots)}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {showEmptySlots ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              空时段
            </Button>
            
            <Button
              onClick={() => fetchScheduleData(true)}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              刷新
            </Button>
            
            <Button
              onClick={exportSchedule}
              disabled={isExporting || scheduleData.length === 0}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              导出
            </Button>
            
            <Button
              onClick={() => {
                console.log('🔍 调试信息:')
                console.log('scheduleData:', scheduleData)
                console.log('filteredCourses:', filteredCourses)
                console.log('所有课程的day分布:', scheduleData.map(c => ({ 
                  name: c.name, 
                  day: c.day,
                  period: c.period,
                  dayType: typeof c.day,
                  periodType: typeof c.period,
                  originalXqjmc: c.xqjmc
                })))
                
                // 统计每天有多少课程
                const dayStats: Record<string, number> = {}
                scheduleData.forEach((course: any) => {
                  const day = course.day
                  if (!dayStats[day]) dayStats[day] = 0
                  dayStats[day]++
                })
                console.log('每天课程统计:', dayStats)
                
                // 测试getCourseAtTime函数
                console.log('测试getCourseAtTime函数:')
                for (let day = 1; day <= 7; day++) {
                  for (let period = 1; period <= 9; period += 2) {
                    const matches = filteredCourses.filter(course => 
                      course.day === day && course.period === period
                    )
                    if (matches.length > 0) {
                      console.log(`D${day}P${period}: ${matches.length}门课`, matches.map(m => m.name))
                    }
                  }
                }
              }}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              🔍 调试
            </Button>
            
            <Button
              onClick={() => {
                // 清除所有缓存
                localStorage.removeItem('course_selector_cookie')
                localStorage.removeItem('course_selector_user_info')
                localStorage.removeItem('course_selector_last_used')
                // 清除API缓存
                if (typeof window !== 'undefined' && window.caches) {
                  caches.keys().then(names => {
                    names.forEach(name => {
                      if (name.includes('schedule') || name.includes('course')) {
                        caches.delete(name)
                      }
                    })
                  })
                }
                toast.success('缓存已清除')
              }}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              🗑️ 清除缓存
            </Button>
          </div>
        </motion.div>



        {/* 统计信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4"
        >
          <Card className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-400/30">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1 sm:p-2 bg-blue-500/20 rounded-lg">
                  <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-white">{scheduleData.length}</p>
                  <p className="text-[10px] sm:text-sm text-white/70">总课程数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-400/30">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1 sm:p-2 bg-green-500/20 rounded-lg">
                  <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-white">
                    {new Set(scheduleData.map(c => c.day)).size}
                  </p>
                  <p className="text-[10px] sm:text-sm text-white/70">上课天数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-400/30">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1 sm:p-2 bg-purple-500/20 rounded-lg">
                  <Star className="h-4 w-4 sm:h-6 sm:w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-white">{favoriteCourses.size}</p>
                  <p className="text-[10px] sm:text-sm text-white/70">收藏课程</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-400/30">
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-1 sm:p-2 bg-orange-500/20 rounded-lg">
                  <Search className="h-4 w-4 sm:h-6 sm:w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-white">{filteredCourses.length}</p>
                  <p className="text-[10px] sm:text-sm text-white/70">筛选结果</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 课表表格 */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                    课程表
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-8 w-8 text-blue-400" />
                      </motion.div>
                    </div>
                  ) : scheduleData.length === 0 ? (
                    <div className="text-center py-12">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <Calendar className="h-16 w-16 text-white/30 mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-white mb-2">暂无课表数据</h3>
                      <p className="text-white/60 mb-4">请点击刷新按钮获取课表信息</p>
                      <Button 
                        onClick={() => fetchScheduleData(true)} 
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        获取课表
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto sm:overflow-x-visible">
                      <div className="min-w-full inline-block">
                        <table className="w-full border-collapse schedule-table">
                          <thead>
                            <motion.tr
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <th className="border border-white/20 bg-white/10 text-white p-1.5 sm:p-3 text-center font-semibold rounded-l-lg text-[10px] sm:text-sm">
                                时间
                              </th>
                              {weekdays.slice(1).map((day, index) => (
                                <motion.th 
                                  key={index}
                                  initial={{ opacity: 0, y: -20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                                  className="border border-white/20 bg-white/10 text-white p-1.5 sm:p-3 text-center font-semibold text-[10px] sm:text-sm"
                                >
                                  {day}
                                </motion.th>
                              ))}
                            </motion.tr>
                          </thead>
                          <tbody>
                            {periods.map((period, periodIndex) => (
                              <motion.tr 
                                key={periodIndex}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ 
                                  duration: 0.3,
                                  delay: periodIndex * 0.1
                                }}
                              >
                                <td className="border border-white/20 bg-white/10 text-white p-1.5 sm:p-3 text-center font-semibold">
                                  <div className="space-y-0.5 sm:space-y-1">
                                    <div className="text-[10px] sm:text-sm font-bold leading-tight">{period.name}</div>
                                    <div className="text-[9px] sm:text-xs text-white/70 leading-tight">{period.time}</div>
                                  </div>
                                </td>
                                {weekdays.slice(1).map((_, dayIndex) => {
                                  const day = dayIndex + 1
                                  const courses = getCourseAtTime(day, period.start)
                                  return (
                                    <td 
                                      key={dayIndex} 
                                      className="border border-white/20 p-0.5 sm:p-2 min-h-[50px] sm:min-h-[100px] align-top"
                                    >
                                      <div className="space-y-1 sm:space-y-2">
                                        <AnimatePresence>
                                          {courses.map((course, courseIndex) => (
                                            <CourseCard 
                                              key={`${course.name}-${courseIndex}`}
                                              course={course}
                                              index={courseIndex}
                                            />
                                          ))}
                                        </AnimatePresence>
                                        {courses.length === 0 && (
                                          <EmptySlot day={day} period={period.start} />
                                        )}
                                      </div>
                                    </td>
                                  )
                                })}
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* 课程详情 */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 sticky top-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-400" />
                    课程详情
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <AnimatePresence mode="wait">
                    {selectedCourse ? (
                      <motion.div 
                        key={`course-details-${selectedCourse.name}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <h3 className="text-lg font-semibold text-white">
                            {selectedCourse.name}
                          </h3>
                          <button
                            onClick={() => toggleFavorite(selectedCourse.name)}
                            className="p-1 rounded-full hover:bg-white/10 transition-colors"
                          >
                            <Heart 
                              className={`h-5 w-5 ${
                                favoriteCourses.has(selectedCourse.name) 
                                  ? 'text-red-500 fill-red-500' 
                                  : 'text-white/60'
                              }`} 
                            />
                          </button>
                        </div>
                        
                        <Badge 
                          variant="secondary" 
                          className="bg-blue-500/20 text-blue-300 border-blue-400/30"
                        >
                          {selectedCourse.course_type}
                        </Badge>
                        
                        <div className="space-y-3 text-sm">
                          {[
                            { icon: User, label: "教师", value: selectedCourse.teacher },
                            { icon: MapPin, label: "地点", value: selectedCourse.location },
                            { icon: Clock, label: "时间", value: `${weekdays[selectedCourse.day]} ${periods.find(p => p.start === selectedCourse.period)?.name}` },
                            { icon: Calendar, label: "周次", value: selectedCourse.weeks },
                            { icon: BookOpen, label: "学分", value: selectedCourse.credit },
                            { icon: null, label: "教学班", value: selectedCourse.class },
                            { icon: null, label: "考核方式", value: selectedCourse.assessment },
                            { icon: null, label: "校区", value: selectedCourse.campus }
                          ].map((item, index) => (
                            <motion.div 
                              key={`${selectedCourse.name}-${item.label}-${index}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ 
                                duration: 0.2,
                                delay: index * 0.05
                              }}
                              className="flex items-center space-x-2 hover:bg-white/5 p-2 rounded transition-colors"
                            >
                              {item.icon && (
                                <item.icon className="h-4 w-4 text-white/60" />
                              )}
                              <span className="text-white/70">{item.label}:</span>
                              <span className="text-white font-medium">{item.value}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8"
                      >
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <BookOpen className="h-16 w-16 text-white/30 mx-auto mb-4" />
                        </motion.div>
                        <p className="text-white/60">点击课表中的课程查看详细信息</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
