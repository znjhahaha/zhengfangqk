'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  RefreshCw, 
  Search,
  Loader2,
  AlertCircle,
  Download,
  FileText,
  Image
} from 'lucide-react'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
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
}

export default function SchedulePage() {
  const [scheduleData, setScheduleData] = useState<ScheduleCourse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<ScheduleCourse | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false) // 标记是否已经加载过一次
  
  // 缓存键
  const CACHE_KEY = 'schedule_data_cache'
  const CACHE_TIMESTAMP_KEY = 'schedule_data_timestamp'
  const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  // 星期名称映射
  const weekdays = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
  
  // 节次名称映射
  const periods = [
    { name: '第1-2节', start: 1, end: 2 },
    { name: '第3-4节', start: 3, end: 4 },
    { name: '第5-6节', start: 5, end: 6 },
    { name: '第7-8节', start: 7, end: 8 },
    { name: '第9-10节', start: 9, end: 10 }
  ]

  // 缓存相关函数
  const getCachedData = (): ScheduleCourse[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
      
      if (cached && timestamp) {
        const now = Date.now()
        const cacheTime = parseInt(timestamp)
        
        // 检查缓存是否过期
        if (now - cacheTime < CACHE_DURATION) {
          console.log('📦 从缓存加载课表数据')
          return JSON.parse(cached)
        } else {
          console.log('⏰ 缓存已过期，清理缓存')
          clearCache()
        }
      }
    } catch (error) {
      console.error('读取缓存失败:', error)
      clearCache()
    }
    return null
  }

  const setCachedData = (data: ScheduleCourse[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
      console.log('💾 课表数据已缓存')
    } catch (error) {
      console.error('保存缓存失败:', error)
    }
  }

  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(CACHE_TIMESTAMP_KEY)
      console.log('🗑️ 课表缓存已清理')
    } catch (error) {
      console.error('清理缓存失败:', error)
    }
  }

  // 获取课表数据
  const fetchScheduleData = async (forceRefresh: boolean = false) => {
    // 如果不是强制刷新，先尝试从缓存加载
    if (!forceRefresh) {
      const cachedData = getCachedData()
      if (cachedData && cachedData.length > 0) {
        setScheduleData(cachedData)
        setHasLoadedOnce(true)
        console.log('📦 使用缓存的课表数据')
        return
      }
    }

    // 如果已经有数据且不是强制刷新，直接返回
    if (scheduleData.length > 0 && !forceRefresh) {
      console.log('📦 课表数据已存在，跳过请求')
      return
    }

    setIsLoading(true)
    try {
      const result = await courseAPI.getScheduleData() as any
      
      if (result.success) {
        setScheduleData(result.data)
        setHasLoadedOnce(true)
        
        // 缓存数据
        setCachedData(result.data)
        
        // 只在第一次加载或强制刷新时显示成功提示
        if (!hasLoadedOnce || forceRefresh) {
          toast.success(`成功获取课表，共 ${result.data.length} 门课程`)
        }
      } else {
        if (result.action === 'go_to_settings') {
          toast.error(result.message)
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
  }

  // 过滤课程
  // 筛选课程 - 使用useMemo优化性能
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return scheduleData
    
    return scheduleData.filter(course => 
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.location.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [scheduleData, searchTerm])

  // 获取指定时间段和星期的课程 - 使用useCallback优化性能
  const getCourseAtTime = useCallback((day: number, periodStart: number) => {
    return filteredCourses.filter(course => 
      course.day === day && course.period === periodStart
    )
  }, [filteredCourses])

  // 使用useMemo优化唯一天数计算
  const uniqueDays = useMemo(() => {
    return Array.from(new Set(scheduleData.map(course => course.day))).sort()
  }, [scheduleData])

  // 导出课表为CSV格式
  const exportToCSV = useCallback(() => {
    if (scheduleData.length === 0) {
      toast.error('没有课表数据可导出')
      return
    }

    setIsExporting(true)
    try {
      const headers = ['课程名称', '教师', '地点', '星期', '节次', '时间', '周次', '教学班', '学分', '考核方式', '课程类型', '校区', '总学时', '讲课学时']
      const csvContent = [
        headers.join(','),
        ...scheduleData.map(course => [
          `"${course.name}"`,
          `"${course.teacher}"`,
          `"${course.location}"`,
          `"${weekdays[course.day]}"`,
          `"${periods.find(p => p.start === course.period)?.name || ''}"`,
          `"${course.time}"`,
          `"${course.weeks}"`,
          `"${course.class}"`,
          `"${course.credit}"`,
          `"${course.assessment}"`,
          `"${course.course_type}"`,
          `"${course.campus}"`,
          `"${course.hours.total}"`,
          `"${course.hours.lecture}"`
        ].join(','))
      ].join('\n')

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `课表_${new Date().toLocaleDateString()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('课表已导出为CSV文件')
    } catch (error) {
      console.error('导出CSV失败:', error)
      toast.error('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }, [scheduleData, weekdays, periods])

  // 导出课表为JSON格式
  const exportToJSON = useCallback(() => {
    if (scheduleData.length === 0) {
      toast.error('没有课表数据可导出')
      return
    }

    setIsExporting(true)
    try {
      const jsonData = {
        exportTime: new Date().toISOString(),
        totalCourses: scheduleData.length,
        courses: scheduleData.map(course => ({
          ...course,
          weekday: weekdays[course.day],
          periodName: periods.find(p => p.start === course.period)?.name || ''
        }))
      }

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `课表_${new Date().toLocaleDateString()}.json`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('课表已导出为JSON文件')
    } catch (error) {
      console.error('导出JSON失败:', error)
      toast.error('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }, [scheduleData, weekdays, periods])

  // 导出课表为图片格式
  const exportToImage = useCallback(async () => {
    if (scheduleData.length === 0) {
      toast.error('没有课表数据可导出')
      return
    }

    setIsExporting(true)
    try {
      // 创建临时容器
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.width = '1200px'
      tempContainer.style.backgroundColor = '#1a1a2e'
      tempContainer.style.padding = '30px'
      tempContainer.style.fontFamily = 'Arial, sans-serif'
      tempContainer.style.color = 'white'
      
      // 创建课表HTML
      const scheduleHTML = `
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #e94560; font-size: 28px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">我的课表</h1>
            <p style="color: #888; margin: 10px 0 0 0; font-size: 14px;">导出时间: ${new Date().toLocaleString()}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
            <thead>
              <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <th style="border: 1px solid rgba(255,255,255,0.3); padding: 15px; text-align: center; font-size: 16px; font-weight: bold; color: white;">时间</th>
                ${weekdays.slice(1).map(day => `
                  <th style="border: 1px solid rgba(255,255,255,0.3); padding: 15px; text-align: center; font-size: 16px; font-weight: bold; color: white;">${day}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${periods.map(period => `
                <tr>
                  <td style="border: 1px solid rgba(255,255,255,0.2); padding: 15px; text-align: center; background: rgba(255,255,255,0.1); font-weight: bold; color: #e94560;">${period.name}</td>
                  ${weekdays.slice(1).map((_, dayIndex) => {
                    const day = dayIndex + 1
                    const courses = getCourseAtTime(day, period.start)
                    return `
                      <td style="border: 1px solid rgba(255,255,255,0.2); padding: 10px; min-height: 80px; vertical-align: top; background: rgba(255,255,255,0.05);">
                        ${courses.map(course => `
                          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 8px; margin-bottom: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                            <div style="font-weight: bold; color: white; font-size: 13px; margin-bottom: 2px;">${course.name}</div>
                            <div style="color: #e0e0e0; font-size: 11px; margin-bottom: 2px;">${course.teacher}</div>
                            <div style="color: #b0b0b0; font-size: 10px;">${course.location}</div>
                          </div>
                        `).join('')}
                      </td>
                    `
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
            <p>共 ${scheduleData.length} 门课程 | 生成时间: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
      
      tempContainer.innerHTML = scheduleHTML
      document.body.appendChild(tempContainer)
      
      // 使用html2canvas生成图片
      const canvas = await html2canvas(tempContainer, {
        useCORS: true,
        allowTaint: true,
        logging: false
      })
      
      // 转换为blob并下载
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a')
          const url = URL.createObjectURL(blob)
          link.setAttribute('href', url)
          link.setAttribute('download', `课表_${new Date().toLocaleDateString()}.png`)
          link.style.visibility = 'hidden'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          toast.success('课表已导出为图片')
        } else {
          toast.error('图片生成失败')
        }
      }, 'image/png', 0.95)
      
      // 清理临时元素
      document.body.removeChild(tempContainer)
      
    } catch (error) {
      console.error('导出图片失败:', error)
      toast.error('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }, [scheduleData, weekdays, periods, getCourseAtTime])

  // 初始化加载
  useEffect(() => {
    // 先尝试从缓存加载，如果没有缓存再请求API
    const cachedData = getCachedData()
    if (cachedData && cachedData.length > 0) {
      setScheduleData(cachedData)
      setHasLoadedOnce(true)
      console.log('📦 初始化时使用缓存的课表数据')
    } else {
      fetchScheduleData()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Calendar className="h-10 w-10 text-purple-400" />
            我的课表
          </h1>
          <p className="text-muted-foreground">查看本学期课程安排</p>
        </motion.div>

        {/* 操作栏 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 items-center justify-between"
        >
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索课程、教师或地点..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-muted-foreground"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => fetchScheduleData(true)}
              disabled={isLoading}
              className="btn-hover"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              刷新课表
            </Button>
            
            <Button
              onClick={() => {
                clearCache()
                setScheduleData([])
                setHasLoadedOnce(false)
                toast.success('缓存已清理，下次查询将重新获取数据')
              }}
              variant="outline"
              className="btn-hover"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              清理缓存
            </Button>
            
            <div className="relative group">
              <Button
                disabled={isExporting || scheduleData.length === 0}
                className="btn-hover"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                导出课表
              </Button>
              
              {/* 导出选项下拉菜单 */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  <button
                    onClick={exportToCSV}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors flex items-center"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    CSV格式
                  </button>
                  <button
                    onClick={exportToJSON}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors flex items-center"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    JSON格式
                  </button>
                  <button
                    onClick={exportToImage}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left text-white hover:bg-white/10 transition-colors flex items-center"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    图片格式
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 统计信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{scheduleData.length}</div>
                  <div className="text-sm text-muted-foreground">总课程数</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {new Set(scheduleData.map(c => c.day)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">上课天数</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{filteredCourses.length}</div>
                  <div className="text-sm text-muted-foreground">筛选结果</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 课表主体 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        >
          {/* 课表表格 */}
          <div className="lg:col-span-3">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  课程表
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <motion.div 
                    className="flex flex-col items-center justify-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="mb-4"
                      animate={{ rotate: 360 }}
                      transition={{ 
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <Calendar className="h-12 w-12 text-primary" />
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-white mb-2">正在加载课表</h3>
                      <p className="text-muted-foreground">请稍候，正在获取课程安排信息...</p>
                    </div>
                    <div className="mt-4 w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ 
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </div>
                  </motion.div>
                ) : scheduleData.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">暂无课表数据</h3>
                    <p className="text-muted-foreground mb-4">请点击刷新按钮获取课表信息</p>
                    <Button onClick={() => fetchScheduleData(true)} className="btn-hover">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      获取课表
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <motion.tr
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <th className="border border-white/20 bg-white/10 text-white p-3 text-center font-semibold">
                            时间
                          </th>
                          {weekdays.slice(1).map((day, index) => (
                            <th 
                              key={index} 
                              className="border border-white/20 bg-white/10 text-white p-3 text-center font-semibold"
                            >
                              {day}
                            </th>
                          ))}
                        </motion.tr>
                      </thead>
                      <tbody>
                        {periods.map((period, periodIndex) => (
                          <motion.tr 
                            key={periodIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              duration: 0.3,
                              delay: periodIndex * 0.05
                            }}
                          >
                            <td className="border border-white/20 bg-white/10 text-white p-3 text-center font-semibold hover:bg-white/15 transition-colors">
                              {period.name}
                            </td>
                            {weekdays.slice(1).map((_, dayIndex) => {
                              const day = dayIndex + 1
                              const courses = getCourseAtTime(day, period.start)
                              return (
                                <td 
                                  key={dayIndex} 
                                  className="border border-white/20 p-2 min-h-[80px]"
                                >
                                  <AnimatePresence>
                                    {courses.map((course, courseIndex) => (
                                      <motion.div
                                        key={`${course.name}-${courseIndex}`}
                                        className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-lg p-2 mb-1 cursor-pointer hover:from-purple-500/30 hover:to-blue-500/30 transition-all duration-200 relative overflow-hidden group"
                                        onClick={() => setSelectedCourse(course)}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ 
                                          duration: 0.2,
                                          delay: courseIndex * 0.05
                                        }}
                                        whileHover={{ 
                                          scale: 1.02,
                                          y: -1,
                                          transition: { duration: 0.15 }
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <div className="text-xs font-semibold text-white truncate relative z-10">
                                          {course.name}
                                        </div>
                                        <div className="text-xs text-purple-200 truncate relative z-10">
                                          {course.teacher}
                                        </div>
                                        <div className="text-xs text-blue-200 truncate relative z-10">
                                          {course.location}
                                        </div>
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                </td>
                              )
                            })}
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 课程详情 */}
          <div className="lg:col-span-1">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  课程详情
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {selectedCourse ? (
                    <motion.div 
                      key={`course-details-${selectedCourse.name}-${selectedCourse.teacher}`}
                      className="space-y-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {selectedCourse.name}
                        </h3>
                        <Badge variant="secondary" className="mb-2">
                          {selectedCourse.course_type}
                        </Badge>
                      </div>
                      
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
                            className="flex items-center space-x-2 hover:bg-white/5 p-2 rounded transition-colors"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                              duration: 0.2,
                              delay: index * 0.03
                            }}
                          >
                            {item.icon && (
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-muted-foreground">{item.label}:</span>
                            <span className="text-white font-medium">{item.value}</span>
                          </motion.div>
                        ))}
                        
                        <div className="pt-2 border-t border-white/20">
                          <div className="text-xs text-muted-foreground">
                            总学时: {selectedCourse.hours.total} | 讲课学时: {selectedCourse.hours.lecture}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="no-selection"
                      className="text-center py-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">点击课表中的课程查看详细信息</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
