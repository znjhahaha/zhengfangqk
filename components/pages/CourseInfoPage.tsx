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
  Calendar
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

  // 获取可选课程 - 使用useCallback避免重复创建
  const fetchAvailableCourses = useCallback(async () => {
    // 如果已经加载过且数据存在，不重复请求
    if (dataLoaded.available && availableCourses.length > 0) {
      console.log('📦 可选课程已缓存，跳过请求')
      return
    }
    
    setIsLoading(true)
    try {
      const response = await courseAPI.getAvailableCourses() as any
      if (response.success) {
        setAvailableCourses(response.data || [])
        toast.success('可选课程获取成功')
      } else {
        toast.error(response.error || '获取可选课程失败')
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
  const fetchSelectedCourses = useCallback(async () => {
    // 如果已经加载过且数据存在，不重复请求
    if (dataLoaded.selected && selectedCourses.length > 0) {
      console.log('📦 已选课程已缓存，跳过请求')
      return
    }
    
    setIsLoading(true)
    try {
      console.log('🔍 前端：开始获取已选课程...')
      const response = await courseAPI.getSelectedCourses() as any
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
        
        if (courses.length > 0) {
          toast.success(`已选课程获取成功，共 ${courses.length} 门课程`)
        } else {
          toast('当前没有已选课程')
        }
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
      const response = await courseAPI.executeSingleCourseSelection({
        jxb_id: course.jxb_id,
        do_jxb_id: course.do_jxb_id || course.jxb_id,
        kch_id: course.kch_id,
        jxbzls: course.jxbzls || '1',
        kklxdm: course.kklxdm || '01', // 课程类型代码 (01=必修, 10=选修)
        kcmc: course.kcmc,
        jxbmc: course.jxbmc || course.jsxm
      }) as any
      
      if (response.success) {
        toast.success(`课程 "${course.kcmc}" 抢课成功！`)
        // 刷新课程列表
        if (selectedTab === 'available') {
          fetchAvailableCourses()
        } else {
          fetchSelectedCourses()
        }
      } else {
        toast.error(response.message || response.error || '抢课失败')
      }
    } catch (error: any) {
      toast.error(error.message || '抢课失败')
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

  // 初始化加载 - 只在组件挂载时加载一次
  useEffect(() => {
    fetchAvailableCourses()
  }, [fetchAvailableCourses])

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
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">请先配置Cookie</h3>
                <p className="text-muted-foreground mb-6">
                  您需要先在"系统设置"页面配置有效的Cookie才能查看课程信息
                </p>
                <Button 
                  onClick={() => {
                    // 这里可以添加跳转到设置页面的逻辑
                    toast('请切换到"系统设置"页面配置Cookie')
                  }}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
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
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">📚 课程信息</h2>
          <p className="text-muted-foreground">查看可选课程和已选课程，支持快速抢课</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={fetchAvailableCourses}
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
        className="flex items-center space-x-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索课程名称、教师姓名或课程类别..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex space-x-2">
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
            className="btn-hover"
          >
            <Filter className="h-4 w-4 mr-2" />
            {selectedTab === 'available' ? '查看已选课程' : '查看可选课程'}
          </Button>
          
          <Button
            onClick={() => setGroupByCategory(!groupByCategory)}
            variant={groupByCategory ? "default" : "outline"}
            className="btn-hover"
          >
            {groupByCategory ? <FolderOpen className="h-4 w-4 mr-2" /> : <Folder className="h-4 w-4 mr-2" />}
            {groupByCategory ? '取消分类' : '按名称'}
          </Button>
          
          {groupByCategory && (
            <Button
              onClick={toggleAllCategories}
              variant="outline"
              className="btn-hover"
            >
              {expandedCategories.size === 0 ? (
                <ChevronRight className="h-4 w-4 mr-2" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-2" />
              )}
              {expandedCategories.size === 0 ? '展开全部' : '收起全部'}
            </Button>
          )}
          
          <Button
            onClick={() => {
              // 强制刷新当前标签页的数据
              if (selectedTab === 'available') {
                clearAvailableCourses()
                fetchAvailableCourses()
              } else {
                clearSelectedCourses()
                fetchSelectedCourses()
              }
            }}
            variant="outline"
            className="btn-hover"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </motion.div>

      {/* 课程统计 */}
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
                <div className="text-2xl font-bold text-white">{availableCourses.length}</div>
                <div className="text-sm text-muted-foreground">可选课程</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-white">{selectedCourses.length}</div>
                <div className="text-sm text-muted-foreground">已选课程</div>
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
  showGrabButton 
}: { 
  course: Course
  onGrab: () => void
  isGrabbing: boolean
  showGrabButton: boolean
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
      <Card className="glass card-hover relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <motion.div 
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.h3 
                  className="text-lg font-semibold text-white"
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
          
          {showGrabButton && (
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
                  onClick={onGrab}
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
