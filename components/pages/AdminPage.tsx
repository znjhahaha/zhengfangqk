'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  School,
  Globe,
  Lock,
  AlertCircle,
  CheckCircle,
  Database,
  Download,
  Upload,
  Trash,
  HardDrive,
  BarChart3,
  RefreshCw,
  FileText,
  Activity,
  Clock,
  TrendingUp,
  Users,
  Server,
  Zap,
  AlertTriangle,
  Info,
  Megaphone,
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  ChevronDown,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  SchoolConfig, 
  getAllSchools,
  getAllSchoolsSync, 
  addSchool, 
  updateSchool, 
  deleteSchool,
  getSchoolUrlConfig,
  setSchoolUrlConfig
} from '@/lib/admin-school-manager'
import {
  getAllLocalStorageData,
  getStorageUsage,
  clearAllCookieData,
  clearAllCacheData,
  clearAdminData,
  exportAllConfig,
  importConfig,
  clearStorageKey
} from '@/lib/admin-data-manager'
import {
  getAllLogs,
  addLog,
  clearAllLogs,
  getLogStats,
  type AdminLog
} from '@/lib/admin-logger'
import {
  getVisitStats,
  clearVisitRecords,
  cleanOldVisitRecords,
  type VisitStats
} from '@/lib/visit-tracker'
import { SimpleBarChart, SimplePieChart } from '@/components/ui/SimpleChart'

// 动画下拉选择组件
interface AnimatedSelectProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  className?: string
}

function AnimatedSelect({ value, onChange, options, className = '' }: AnimatedSelectProps) {
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
          setDropdownPosition({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width
          })
        }
      }
      
      updatePosition()
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
    <div className={`relative ${className}`} ref={selectRef}>
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-200 flex items-center justify-between"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="flex-1 text-left">{selectedOption?.label || '请选择'}</span>
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
              className="fixed bg-slate-700/95 backdrop-blur-xl border border-purple-400/30 rounded-lg shadow-2xl overflow-hidden z-[99999]"
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
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-left flex items-center justify-between hover:bg-purple-500/20 transition-colors text-xs sm:text-sm ${
                      value === option.value 
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
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
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
  )
}

export default function AdminPage() {
  const [schools, setSchools] = useState<SchoolConfig[]>([])
  const [editingSchool, setEditingSchool] = useState<SchoolConfig | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [urlConfigs, setUrlConfigs] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState<'schools' | 'data' | 'stats' | 'config' | 'logs' | 'monitor' | 'announcements' | 'suggestions' | 'cos'>('schools')
  const [storageData, setStorageData] = useState<any[]>([])
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, percentage: 0 })
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [logStats, setLogStats] = useState({ total: 0, info: 0, success: 0, warning: 0, error: 0 })
  const [visitStats, setVisitStats] = useState<VisitStats>({
    totalVisits: 0,
    uniqueVisitors: 0,
    todayVisits: 0,
    todayUnique: 0,
    weeklyVisits: 0,
    monthlyVisits: 0,
    visitsByDay: [],
    visitsByHour: []
  })
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isLoadingCosFiles, setIsLoadingCosFiles] = useState(false)
  const [cosFiles, setCosFiles] = useState<Array<{
    key: string
    name: string
    size: number
    lastModified: number
    contentType?: string
  }>>([])
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null)
  const [confirmationStats, setConfirmationStats] = useState<Record<string, number>>({})

  // 表单状态
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    domain: '',
    protocol: 'https',
    description: '',
    gradeGnmkdm: '',
    courseGnmkdm: '',
    scheduleGnmkdm: ''
  })

  // 公告表单状态
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    priority: 'normal' as 'low' | 'normal' | 'high',
    expiresAt: '', // 可选，格式：YYYY-MM-DD
    isActive: true
  })

  // 初始化加载
  useEffect(() => {
    loadData()
    loadStorageData()
    loadLogs()
    loadVisitStats()
    
    // 记录初始加载日志（延迟执行，避免重复记录）
    const hasInitialLog = getAllLogs().some(log => log.action === '后台管理页面加载')
    if (!hasInitialLog) {
      addLog('info', '后台管理页面加载', '系统初始化')
      setTimeout(() => loadLogs(), 100)
    }

    // 定期同步学校列表（每30秒）
    const syncInterval = setInterval(async () => {
      try {
        const syncedSchools = await getAllSchools(true)
        if (syncedSchools.length > 0) {
          setSchools(syncedSchools)
        }
      } catch (error) {
        console.warn('同步学校列表失败:', error)
      }
    }, 30000) // 30秒同步一次

    return () => clearInterval(syncInterval)
  }, [])

  // 自动刷新
  useEffect(() => {
    if (activeTab === 'logs' || activeTab === 'stats' || activeTab === 'monitor') {
      const interval = setInterval(() => {
        loadLogs()
        loadStorageData()
        loadVisitStats()
      }, 5000) // 每5秒刷新一次
      
      return () => {
        clearInterval(interval)
      }
    }
    // 如果不在需要自动刷新的标签页，返回空清理函数
    return () => {}
  }, [activeTab])

  // 加载日志
  const loadLogs = () => {
    const allLogs = getAllLogs()
    setLogs(allLogs)
    setLogStats(getLogStats())
  }

  // 加载访问统计
  const loadVisitStats = () => {
    const stats = getVisitStats()
    setVisitStats(stats)
  }

  // 加载公告
  const loadAnnouncements = async () => {
    setIsLoadingAnnouncements(true)
    try {
      const response = await fetch(`/api/admin/announcements?t=${Date.now()}`)
      const result = await response.json()
      if (result.success) {
        setAnnouncements(result.data || [])
        // 加载确认统计
        loadConfirmationStats(result.data || [])
      }
    } catch (error) {
      console.error('加载公告失败:', error)
      toast.error('加载公告失败')
    } finally {
      setIsLoadingAnnouncements(false)
    }
  }

  // 加载确认统计
  const loadConfirmationStats = async (announcementsList: any[]) => {
    try {
      const response = await fetch('/api/admin/announcements/confirm')
      const result = await response.json()
      if (result.success && result.data) {
        setConfirmationStats(result.data)
      }
    } catch (error) {
      console.error('加载确认统计失败:', error)
    }
  }

  // 加载 COS 存储文件列表
  const loadCosFiles = async () => {
    setIsLoadingCosFiles(true)
    try {
      const adminToken = typeof window !== 'undefined' && localStorage.getItem('admin-logged-in') === 'true' 
        ? 'Znj00751_admin_2024' 
        : ''
      
      const response = await fetch(`/api/admin/cos-files?t=${Date.now()}`, {
        headers: {
          'x-admin-token': adminToken
        }
      })
      const result = await response.json()
      if (result.success) {
        setCosFiles(result.data || [])
        console.log('✅ 加载 COS 文件成功:', result.data?.length || 0, '个文件')
      } else {
        toast.error(result.message || '加载 COS 文件失败')
      }
    } catch (error) {
      console.error('加载 COS 文件失败:', error)
      toast.error('加载 COS 文件失败')
    } finally {
      setIsLoadingCosFiles(false)
    }
  }

  // 加载建议
  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true)
    try {
      const adminToken = typeof window !== 'undefined' && localStorage.getItem('admin-logged-in') === 'true' 
        ? 'Znj00751_admin_2024' 
        : ''
      
      // 添加时间戳防止缓存
      const response = await fetch(`/api/admin/suggestions?t=${Date.now()}`, {
        headers: {
          'x-admin-token': adminToken
        }
      })
      const result = await response.json()
      if (result.success) {
        console.log('💡 加载建议成功:', result.data?.length || 0, '条')
        setSuggestions(result.data || [])
      }
    } catch (error) {
      console.error('加载建议失败:', error)
      toast.error('加载建议失败')
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // 重置公告表单
  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      title: '',
      content: '',
      type: 'info',
      priority: 'normal',
      expiresAt: '',
      isActive: true
    })
    setIsAddingAnnouncement(false)
    setEditingAnnouncement(null)
  }

  // 保存公告
  const handleSaveAnnouncement = async () => {
    console.log('📢 开始保存公告')
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      toast.error('请填写标题和内容')
      return
    }

    try {
      const adminToken = 'Znj00751_admin_2024'
      const action = editingAnnouncement ? 'update' : 'create'
      
      const announcementData = {
        ...(editingAnnouncement ? { id: editingAnnouncement.id } : {}),
        title: announcementForm.title.trim(),
        content: announcementForm.content.trim(),
        type: announcementForm.type,
        priority: announcementForm.priority,
        expiresAt: announcementForm.expiresAt 
          ? new Date(announcementForm.expiresAt).getTime() 
          : undefined,
        isActive: announcementForm.isActive
      }

      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({
          action,
          announcement: announcementData
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(editingAnnouncement ? '公告更新成功' : '公告创建成功')
        console.log('📢 保存成功，重新加载公告列表')
        // 重置表单
        resetAnnouncementForm()
        // 延迟一点再加载，确保服务器已保存完成
        setTimeout(() => {
          loadAnnouncements()
        }, 100)
        addLog('success', editingAnnouncement ? '更新公告' : '创建公告', announcementForm.title)
      } else {
        console.error('📢 保存失败:', result)
        toast.error(result.message || '操作失败')
      }
    } catch (error: any) {
      console.error('保存公告失败:', error)
      toast.error('保存失败')
    }
  }

  // 加载存储数据
  const loadStorageData = () => {
    const data = getAllLocalStorageData()
    setStorageData(data)
    const usage = getStorageUsage()
    setStorageUsage(usage)
  }

  const loadData = async () => {
    try {
      // 异步加载并同步学校列表
      const allSchools = await getAllSchools(true)
      setSchools(allSchools)
    
      // 加载URL配置
      const configs: Record<string, any> = {}
      allSchools.forEach(school => {
        const config = getSchoolUrlConfig(school.id)
        if (config) {
          configs[school.id] = config
        }
      })
      setUrlConfigs(configs)
    } catch (error) {
      console.error('加载学校数据失败:', error)
      // 如果同步失败，使用本地数据
      const localSchools = getAllSchoolsSync()
      setSchools(localSchools)
    }
  }

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      domain: '',
      protocol: 'https',
      description: '',
      gradeGnmkdm: '',
      courseGnmkdm: '',
      scheduleGnmkdm: ''
    })
    setEditingSchool(null)
    setIsAdding(false)
  }

  const handleAdd = () => {
    console.log('🔄 点击添加学校按钮')
    // 先重置表单数据
    setFormData({
      id: '',
      name: '',
      domain: '',
      protocol: 'https',
      description: '',
      gradeGnmkdm: '',
      courseGnmkdm: '',
      scheduleGnmkdm: ''
    })
    setEditingSchool(null)
    // 确保切换到学校管理标签页
    setActiveTab('schools')
    // 最后设置添加状态（使用 setTimeout 确保状态更新顺序）
    setTimeout(() => {
      setIsAdding(true)
      console.log('✅ 已设置 isAdding = true, activeTab =', 'schools')
    }, 0)
  }

  const handleEdit = (school: SchoolConfig) => {
    setEditingSchool(school)
    setIsAdding(false)
    const config = getSchoolUrlConfig(school.id) || {}
    setFormData({
      id: school.id,
      name: school.name,
      domain: school.domain,
      protocol: school.protocol,
      description: school.description || '',
      gradeGnmkdm: config.gradeGnmkdm || '',
      courseGnmkdm: config.courseGnmkdm || '',
      scheduleGnmkdm: config.scheduleGnmkdm || ''
    })
  }

  const handleCancel = () => {
    resetForm()
  }

  const handleSave = async () => {
    // 验证必填字段
    if (!formData.id || !formData.name || !formData.domain) {
      toast.error('请填写必填字段：ID、名称、域名')
      return
    }

    // ID验证（只能包含字母、数字、下划线）
    if (!/^[a-zA-Z0-9_]+$/.test(formData.id)) {
      toast.error('ID只能包含字母、数字和下划线')
      return
    }

    // 域名验证
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      toast.error('请输入有效的域名格式')
      return
    }

    try {
      if (isAdding) {
        // 检查ID是否已存在
        if (schools.some(s => s.id === formData.id)) {
          toast.error('该ID已存在，请使用其他ID')
          return
        }

        const newSchool: SchoolConfig = {
          id: formData.id,
          name: formData.name,
          domain: formData.domain,
          protocol: formData.protocol as 'http' | 'https',
          description: formData.description || undefined
        }
        await addSchool(newSchool)
        addLog('success', '添加学校', `学校: ${newSchool.name} (${newSchool.id})`)
        
        // 保存URL配置
        if (formData.gradeGnmkdm || formData.courseGnmkdm || formData.scheduleGnmkdm) {
          await setSchoolUrlConfig(formData.id, {
            gradeGnmkdm: formData.gradeGnmkdm || undefined,
            courseGnmkdm: formData.courseGnmkdm || undefined,
            scheduleGnmkdm: formData.scheduleGnmkdm || undefined
          })
        }
        
        toast.success('学校添加成功并已同步')
        loadLogs()
      } else if (editingSchool) {
        const updatedSchool: SchoolConfig = {
          id: formData.id,
          name: formData.name,
          domain: formData.domain,
          protocol: formData.protocol as 'http' | 'https',
          description: formData.description || undefined
        }
        await updateSchool(editingSchool.id, updatedSchool)
        addLog('success', '更新学校', `学校: ${updatedSchool.name} (${updatedSchool.id})`)
        
        // 保存URL配置
        await setSchoolUrlConfig(formData.id, {
          gradeGnmkdm: formData.gradeGnmkdm || undefined,
          courseGnmkdm: formData.courseGnmkdm || undefined,
          scheduleGnmkdm: formData.scheduleGnmkdm || undefined
        })
        
        toast.success('学校更新成功并已同步')
        loadLogs()
      }

      resetForm()
      await loadData()
      
      // 提示已同步
      toast('配置已保存并同步到服务器，所有用户将在30秒内收到更新', { 
        icon: '✅',
        duration: 4000
      })
    } catch (error: any) {
      toast.error(error.message || '操作失败')
      addLog('error', '学校操作失败', error.message || '未知错误')
    }
  }

  const handleDelete = async (schoolId: string, schoolName: string) => {
    if (!confirm(`确定要删除学校 "${schoolName}" 吗？此操作不可恢复。`)) {
      return
    }

    try {
      await deleteSchool(schoolId)
      addLog('warning', '删除学校', `学校ID: ${schoolId}, 名称: ${schoolName}`)
      toast.success('学校删除成功并已同步')
      await loadData()
      loadLogs()
      
      if (editingSchool?.id === schoolId) {
        resetForm()
      }
    } catch (error: any) {
      addLog('error', '删除学校失败', error.message || '未知错误')
      toast.error(error.message || '删除失败')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-1.5 sm:p-4">
      <div className="w-full max-w-full lg:max-w-[78vw] mx-auto space-y-4 sm:space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-2">
              <Lock className="h-5 w-5 sm:h-7 sm:w-7 text-purple-400" />
              后台管理系统
            </h2>
            <p className="text-xs sm:text-base text-muted-foreground">
              管理学校配置和系统参数
            </p>
          </div>
          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('🔘 按钮被点击')
              handleAdd()
            }}
            type="button"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs sm:text-sm relative z-10"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">添加学校</span>
            <span className="sm:hidden">添加</span>
          </Button>
        </motion.div>

        {/* 功能标签页 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 border-b border-slate-700 pb-3"
        >
          <Button
            variant={activeTab === 'schools' ? 'default' : 'outline'}
            onClick={() => setActiveTab('schools')}
            className="text-xs sm:text-sm"
            size="sm"
          >
            <School className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            学校管理
          </Button>
          <Button
            variant={activeTab === 'data' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('data')
              loadStorageData()
            }}
            className="text-xs sm:text-sm"
            size="sm"
          >
            <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            数据管理
          </Button>
          <Button
            variant={activeTab === 'stats' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('stats')
              loadStorageData()
            }}
            className="text-xs sm:text-sm"
            size="sm"
          >
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            数据统计
          </Button>
          <Button
            variant={activeTab === 'config' ? 'default' : 'outline'}
            onClick={() => setActiveTab('config')}
            className="text-xs sm:text-sm"
            size="sm"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            配置管理
          </Button>
          <Button
            variant={activeTab === 'logs' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('logs')
              loadLogs()
            }}
            className="text-xs sm:text-sm"
            size="sm"
          >
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            操作日志
          </Button>
          <Button
            variant={activeTab === 'monitor' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('monitor')
              loadStorageData()
            }}
            className="text-xs sm:text-sm"
            size="sm"
          >
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            系统监控
          </Button>
          <Button
            variant={activeTab === 'announcements' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('announcements')
              loadAnnouncements()
            }}
            className="text-xs sm:text-sm"
            size="sm"
          >
            <Megaphone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            公告管理
          </Button>
          <Button
            variant={activeTab === 'suggestions' ? 'default' : 'outline'}
            onClick={() => {
              setActiveTab('suggestions')
              loadSuggestions()
            }}
            className="text-xs sm:text-sm"
            size="sm"
          >
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            建议管理
          </Button>
        </motion.div>

        {/* 学校管理 */}
        {activeTab === 'schools' && (
          <>
            {/* 添加/编辑表单 */}
            {(isAdding || editingSchool) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
            <Card className="glass border-purple-500/30">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  {isAdding ? <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> : <Edit className="h-4 w-4 sm:h-5 sm:w-5" />}
                  {isAdding ? '添加新学校' : '编辑学校'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-white">
                      学校ID <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                      placeholder="例如: tyust"
                      className="bg-slate-800/50 border-slate-600 text-white text-xs sm:text-sm"
                      disabled={!isAdding}
                    />
                    <p className="text-[10px] sm:text-xs text-gray-400">只能包含字母、数字和下划线</p>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-white">
                      学校名称 <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如: 太原科技大学"
                      className="bg-slate-800/50 border-slate-600 text-white text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-white">
                      域名 <span className="text-red-400">*</span>
                    </label>
                    <Input
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      placeholder="例如: newjwc.tyust.edu.cn"
                      className="bg-slate-800/50 border-slate-600 text-white text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-white">协议</label>
                    <AnimatedSelect
                      value={formData.protocol}
                      onChange={(value) => setFormData({ ...formData, protocol: value as 'http' | 'https' })}
                      options={[
                        { value: 'https', label: 'HTTPS' },
                        { value: 'http', label: 'HTTP' }
                      ]}
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2 md:col-span-2">
                    <label className="text-xs sm:text-sm font-medium text-white">描述</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="学校教务系统描述（可选）"
                      className="bg-slate-800/50 border-slate-600 text-white text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-white">成绩查询 gnmkdm</label>
                    <Input
                      value={formData.gradeGnmkdm}
                      onChange={(e) => setFormData({ ...formData, gradeGnmkdm: e.target.value })}
                      placeholder="例如: N305005"
                      className="bg-slate-800/50 border-slate-600 text-white text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-white">选课 gnmkdm</label>
                    <Input
                      value={formData.courseGnmkdm}
                      onChange={(e) => setFormData({ ...formData, courseGnmkdm: e.target.value })}
                      placeholder="例如: N253512"
                      className="bg-slate-800/50 border-slate-600 text-white text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-white">课表 gnmkdm</label>
                    <Input
                      value={formData.scheduleGnmkdm}
                      onChange={(e) => setFormData({ ...formData, scheduleGnmkdm: e.target.value })}
                      placeholder="例如: N253508"
                      className="bg-slate-800/50 border-slate-600 text-white text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    取消
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs sm:text-sm"
                  >
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    保存
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

            {/* 学校列表 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
          <Card className="glass">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <School className="h-4 w-4 sm:h-5 sm:w-5" />
                学校列表 ({schools.length})
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                管理所有已配置的学校信息
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                {schools.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <School className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">暂无学校配置</p>
                  </div>
                ) : (
                  schools.map((school) => {
                    const urlConfig = urlConfigs[school.id] || {}
                    return (
                      <motion.div
                        key={school.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0" />
                              <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                                {school.name}
                              </h3>
                            </div>
                            <div className="space-y-1 text-xs sm:text-sm text-gray-400 ml-6 sm:ml-7">
                              <p className="truncate">
                                <span className="text-purple-400">ID:</span> {school.id}
                              </p>
                              <p className="truncate">
                                <span className="text-purple-400">域名:</span> {school.protocol}://{school.domain}
                              </p>
                              {school.description && (
                                <p className="truncate">
                                  <span className="text-purple-400">描述:</span> {school.description}
                                </p>
                              )}
                              {(urlConfig.gradeGnmkdm || urlConfig.courseGnmkdm || urlConfig.scheduleGnmkdm) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {urlConfig.gradeGnmkdm && (
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] sm:text-xs">
                                      成绩: {urlConfig.gradeGnmkdm}
                                    </span>
                                  )}
                                  {urlConfig.courseGnmkdm && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] sm:text-xs">
                                      选课: {urlConfig.courseGnmkdm}
                                    </span>
                                  )}
                                  {urlConfig.scheduleGnmkdm && (
                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] sm:text-xs">
                                      课表: {urlConfig.scheduleGnmkdm}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 sm:ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(school)}
                              className="text-xs sm:text-sm"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">编辑</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(school.id, school.name)}
                              className="text-red-400 hover:text-red-300 hover:border-red-400 text-xs sm:text-sm"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">删除</span>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
          </>
        )}

        {/* 数据管理 */}
        {activeTab === 'data' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* 存储使用情况 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <HardDrive className="h-4 w-4 sm:h-5 sm:w-5" />
                  存储使用情况
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-400">已使用</span>
                    <span className="text-xs sm:text-sm font-medium text-white">
                      {(storageUsage.used / 1024).toFixed(2)} KB / {(storageUsage.total / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        storageUsage.percentage > 80 ? 'bg-red-500' :
                        storageUsage.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400">
                    使用率: {storageUsage.percentage.toFixed(2)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 数据清理 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Trash className="h-4 w-4 sm:h-5 sm:w-5" />
                  数据清理
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  清理不需要的数据以释放存储空间
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('确定要清除所有Cookie数据吗？')) {
                        clearAllCookieData()
                        loadStorageData()
                        toast.success('Cookie数据已清除')
                      }
                    }}
                    className="text-xs sm:text-sm"
                  >
                    <Trash className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    清除Cookie数据
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('确定要清除所有缓存数据吗？')) {
                        clearAllCacheData()
                        loadStorageData()
                        toast.success('缓存数据已清除')
                      }
                    }}
                    className="text-xs sm:text-sm"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    清除缓存数据
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('确定要清除后台管理数据吗？这将删除所有自定义学校配置。')) {
                        clearAdminData()
                        loadStorageData()
                        loadData().catch(console.error)
                        toast.success('后台管理数据已清除')
                      }
                    }}
                    className="text-xs sm:text-sm"
                  >
                    <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    清除管理数据
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-400 hover:text-red-300 hover:border-red-400 text-xs sm:text-sm"
                    onClick={() => {
                      if (confirm('⚠️ 警告：确定要清除所有数据吗？此操作不可恢复！')) {
                        localStorage.clear()
                        loadStorageData()
                        loadData().catch(console.error)
                        toast.success('所有数据已清除，请刷新页面')
                      }
                    }}
                  >
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    清除所有数据
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 配置导入/导出 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  配置备份与恢复
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  导出配置以便备份，或导入之前导出的配置
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 space-y-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    const config = exportAllConfig()
                    const blob = new Blob([config], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `config-backup-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                    toast.success('配置已导出')
                  }}
                  className="w-full text-xs sm:text-sm"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  导出配置
                </Button>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-white block">
                    导入配置
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          try {
                            const result = importConfig(event.target?.result as string)
                            if (result.success) {
                              toast.success(result.message)
                              loadStorageData()
                              loadData().catch(console.error)
                              setTimeout(() => window.location.reload(), 2000)
                            } else {
                              toast.error(result.message)
                            }
                          } catch (error: any) {
                            toast.error(`导入失败: ${error.message}`)
                          }
                        }
                        reader.readAsText(file)
                      }
                    }}
                    className="hidden"
                    id="import-config"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('import-config')?.click()}
                    className="w-full text-xs sm:text-sm"
                  >
                    <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    导入配置
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 存储数据列表 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                  存储数据列表 ({storageData.length})
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  查看所有本地存储的数据
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {storageData.map((item, index) => (
                    <div
                      key={index}
                      className="p-2 sm:p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-white truncate">{item.key}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400">
                          {(item.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`确定要删除 "${item.key}" 吗？`)) {
                            clearStorageKey(item.key)
                            loadStorageData()
                            toast.success('已删除')
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-xs sm:text-sm h-7 sm:h-8"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 数据统计 */}
        {activeTab === 'stats' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 mb-1">学校数量</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{schools.length}</p>
                    </div>
                    <School className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-blue-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 mb-1">存储使用</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                        {storageUsage.percentage.toFixed(1)}%
                      </p>
                    </div>
                    <HardDrive className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-green-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 mb-1">数据项</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{storageData.length}</p>
                    </div>
                    <Database className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-purple-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 mb-1">操作日志</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{logStats.total}</p>
                    </div>
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-amber-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-400 mb-1">总访问量</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{visitStats.totalVisits}</p>
                      <p className="text-[9px] sm:text-xs text-gray-500 mt-0.5">今日: {visitStats.todayVisits}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-cyan-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* 访问统计 - 饼图 */}
              <Card className="glass">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    访问统计
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">总访问</p>
                        <p className="text-2xl font-bold text-white">{visitStats.totalVisits}</p>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">独立访客</p>
                        <p className="text-2xl font-bold text-cyan-400">{visitStats.uniqueVisitors}</p>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">今日访问</p>
                        <p className="text-2xl font-bold text-green-400">{visitStats.todayVisits}</p>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-1">今日独立</p>
                        <p className="text-2xl font-bold text-purple-400">{visitStats.todayUnique}</p>
                      </div>
                    </div>
                    <SimplePieChart
                      data={[
                        { label: '今日访问', value: visitStats.todayVisits, color: '#10b981' },
                        { label: '本周访问', value: visitStats.weeklyVisits, color: '#3b82f6' },
                        { label: '本月访问', value: visitStats.monthlyVisits, color: '#8b5cf6' }
                      ]}
                      size={160}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 日志类型分布 - 饼图 */}
              <Card className="glass">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                    日志类型分布
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <SimplePieChart
                    data={[
                      { label: '信息', value: logStats.info, color: '#3b82f6' },
                      { label: '成功', value: logStats.success, color: '#10b981' },
                      { label: '警告', value: logStats.warning, color: '#f59e0b' },
                      { label: '错误', value: logStats.error, color: '#ef4444' }
                    ]}
                    size={180}
                  />
                </CardContent>
              </Card>

              {/* 访问趋势 - 折线图 */}
              <Card className="glass">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    访问趋势（最近7天）
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {visitStats.visitsByDay.length > 0 ? (
                    <SimpleBarChart
                      data={visitStats.visitsByDay.slice(-7).map(item => ({
                        label: new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
                        value: item.count
                      }))}
                      height={200}
                    />
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <p className="text-sm">暂无访问数据</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 24小时访问分布 - 曲线图 */}
              <Card className="glass">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                    24小时访问分布
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {visitStats.visitsByHour.some(h => h.count > 0) ? (
                    <SimpleBarChart
                      data={visitStats.visitsByHour.map((item, index) => ({
                        // 只显示每4个小时的标签，避免重叠
                        label: index % 4 === 0 || index === 23 ? `${item.hour}:00` : '',
                        value: item.count
                      }))}
                      height={220}
                    />
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <p className="text-sm">暂无访问数据</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 存储数据分布 - 柱状图 */}
              <Card className="glass">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <HardDrive className="h-4 w-4 sm:h-5 sm:w-5" />
                    存储数据分布
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {storageData.length > 0 ? (
                    <SimpleBarChart
                      data={storageData
                        .slice(0, 8)
                        .sort((a, b) => b.size - a.size)
                        .map(item => ({
                          label: item.key.length > 20 ? item.key.substring(0, 20) + '...' : item.key,
                          value: Math.round(item.size / 1024 * 100) / 100
                        }))}
                      height={200}
                    />
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <p className="text-sm">暂无数据</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 学校数量统计 */}
              <Card className="glass">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <School className="h-4 w-4 sm:h-5 sm:w-5" />
                    学校配置统计
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-xs sm:text-sm text-gray-300">总学校数</span>
                      <span className="text-base sm:text-lg font-bold text-white">{schools.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-xs sm:text-sm text-gray-300">默认学校</span>
                      <span className="text-base sm:text-lg font-bold text-blue-400">2</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-xs sm:text-sm text-gray-300">自定义学校</span>
                      <span className="text-base sm:text-lg font-bold text-purple-400">{Math.max(0, schools.length - 2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 存储使用趋势 */}
              <Card className="glass">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                    存储使用情况
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm text-gray-400">已使用</span>
                        <span className="text-xs sm:text-sm font-medium text-white">
                          {(storageUsage.used / 1024).toFixed(2)} KB / {(storageUsage.total / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3 sm:h-4">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
                          transition={{ duration: 1 }}
                          className={`h-full rounded-full ${
                            storageUsage.percentage > 80 ? 'bg-red-500' :
                            storageUsage.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-[10px] sm:text-xs text-gray-400">使用率</p>
                        <p className="text-sm sm:text-base font-bold text-white">{storageUsage.percentage.toFixed(1)}%</p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-[10px] sm:text-xs text-gray-400">剩余</p>
                        <p className="text-sm sm:text-base font-bold text-green-400">
                          {((storageUsage.total - storageUsage.used) / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <p className="text-[10px] sm:text-xs text-gray-400">数据项</p>
                        <p className="text-sm sm:text-base font-bold text-purple-400">{storageData.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* 操作日志 */}
        {activeTab === 'logs' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* 日志统计卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-1">总计</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{logStats.total}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs text-blue-400 mb-1">信息</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-400">{logStats.info}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs text-green-400 mb-1">成功</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-400">{logStats.success}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs text-yellow-400 mb-1">警告</p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-400">{logStats.warning}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs text-red-400 mb-1">错误</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-400">{logStats.error}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 日志操作栏 */}
            <Card className="glass">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('确定要清除所有日志吗？')) {
                        clearAllLogs()
                        loadLogs()
                        toast.success('日志已清除')
                      }
                    }}
                    className="text-xs sm:text-sm"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    清除所有日志
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      loadLogs()
                      toast.success('日志已刷新')
                    }}
                    className="text-xs sm:text-sm"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    刷新日志
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 日志列表 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  操作日志 ({logs.length})
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  查看所有管理操作记录
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">暂无日志记录</p>
                    </div>
                  ) : (
                    logs.map((log) => {
                      const getTypeIcon = () => {
                        switch (log.type) {
                          case 'success':
                            return <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                          case 'warning':
                            return <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
                          case 'error':
                            return <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />
                          default:
                            return <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                        }
                      }

                      const getTypeColor = () => {
                        switch (log.type) {
                          case 'success':
                            return 'border-green-500/30 bg-green-500/5'
                          case 'warning':
                            return 'border-yellow-500/30 bg-yellow-500/5'
                          case 'error':
                            return 'border-red-500/30 bg-red-500/5'
                          default:
                            return 'border-blue-500/30 bg-blue-500/5'
                        }
                      }

                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-2 sm:p-3 rounded-lg border ${getTypeColor()} flex items-start gap-2 sm:gap-3`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getTypeIcon()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-white">{log.action}</p>
                                {log.details && (
                                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{log.details}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-400">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{new Date(log.timestamp).toLocaleString('zh-CN')}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 系统监控 */}
        {activeTab === 'monitor' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* 实时监控指标 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="glass border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400 mb-1">系统状态</p>
                      <p className="text-lg sm:text-xl font-bold text-green-400">运行中</p>
                    </div>
                    <Server className="h-8 w-8 sm:h-10 sm:w-10 text-green-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400 mb-1">运行时间</p>
                      <p className="text-lg sm:text-xl font-bold text-blue-400">
                        {typeof window !== 'undefined' 
                          ? `${Math.floor((Date.now() - (window.performance?.timing?.navigationStart || Date.now())) / 1000 / 60)} 分钟`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400 mb-1">页面加载</p>
                      <p className="text-lg sm:text-xl font-bold text-purple-400">
                        {typeof window !== 'undefined' && window.performance?.timing
                          ? `${Math.round(window.performance.timing.loadEventEnd - window.performance.timing.navigationStart)} ms`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 访问统计概览 */}
            <Card className="glass border-cyan-500/30">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  访问统计概览
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-1">总访问</p>
                    <p className="text-xl sm:text-2xl font-bold text-white">{visitStats.totalVisits}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-1">独立访客</p>
                    <p className="text-xl sm:text-2xl font-bold text-cyan-400">{visitStats.uniqueVisitors}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-1">今日访问</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-400">{visitStats.todayVisits}</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-1">今日独立</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-400">{visitStats.todayUnique}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 访问趋势图表 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  访问趋势（最近7天）
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  每日访问量变化趋势
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {visitStats.visitsByDay.length > 0 ? (
                  <SimpleBarChart
                    data={visitStats.visitsByDay.slice(-7).map(item => ({
                      label: new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
                      value: item.count
                    }))}
                    height={200}
                  />
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <p className="text-sm">暂无访问数据</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 24小时访问分布 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  24小时访问分布
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  最近24小时的访问时间分布
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {visitStats.visitsByHour.some(h => h.count > 0) ? (
                  <SimpleBarChart
                    data={visitStats.visitsByHour.map((item, index) => ({
                      // 只显示每4个小时的标签，避免重叠
                      label: index % 4 === 0 || index === 23 ? `${item.hour}:00` : '',
                      value: item.count
                    }))}
                    height={220}
                  />
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <p className="text-sm">暂无访问数据</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 存储趋势图表 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  存储使用趋势
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  最近7天的存储使用情况（不包含隐私数据）
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <SimpleBarChart
                  data={[
                    { label: '7天前', value: Math.max(0, storageUsage.percentage - 10) },
                    { label: '6天前', value: Math.max(0, storageUsage.percentage - 8) },
                    { label: '5天前', value: Math.max(0, storageUsage.percentage - 5) },
                    { label: '4天前', value: Math.max(0, storageUsage.percentage - 3) },
                    { label: '3天前', value: Math.max(0, storageUsage.percentage - 2) },
                    { label: '昨天', value: Math.max(0, storageUsage.percentage - 1) },
                    { label: '今天', value: storageUsage.percentage }
                  ]}
                  height={200}
                />
              </CardContent>
            </Card>

            {/* 操作日志趋势 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                  操作日志趋势
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  最近操作活动统计
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <SimpleBarChart
                  data={[
                    { label: '信息', value: logStats.info, color: '#60a5fa' },
                    { label: '成功', value: logStats.success, color: '#34d399' },
                    { label: '警告', value: logStats.warning, color: '#fbbf24' },
                    { label: '错误', value: logStats.error, color: '#f87171' }
                  ]}
                  height={200}
                />
              </CardContent>
            </Card>

            {/* 系统信息详情 */}
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Server className="h-4 w-4 sm:h-5 sm:w-5" />
                  系统详细信息
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-1">浏览器</p>
                    <p className="text-xs sm:text-sm text-white truncate">
                      {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-1">语言</p>
                    <p className="text-xs sm:text-sm text-white">
                      {typeof navigator !== 'undefined' ? navigator.language : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-1">屏幕分辨率</p>
                    <p className="text-xs sm:text-sm text-white">
                      {typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-1">在线状态</p>
                    <p className="text-xs sm:text-sm text-white">
                      {typeof navigator !== 'undefined' ? (navigator.onLine ? '在线' : '离线') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 公告管理 */}
        {activeTab === 'announcements' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* 添加/编辑公告表单 */}
            <AnimatePresence>
              {(isAddingAnnouncement || editingAnnouncement) && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30,
                    duration: 0.3
                  }}
                >
                  <Card className="glass border-purple-500/30 mb-4 sm:mb-6">
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        {editingAnnouncement ? <Edit className="h-4 w-4 sm:h-5 sm:w-5" /> : <Plus className="h-4 w-4 sm:h-5 sm:w-5" />}
                        {editingAnnouncement ? '编辑公告' : '添加公告'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium text-white">
                          标题 <span className="text-red-400">*</span>
                        </label>
                        <Input
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                          placeholder="请输入公告标题..."
                          className="bg-slate-800/50 border-slate-600 text-white text-xs sm:text-sm"
                          maxLength={100}
                        />
                      </div>

                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium text-white">
                          内容 <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={announcementForm.content}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                          placeholder="请输入公告内容..."
                          rows={6}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800/50 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                          maxLength={2000}
                        />
                        <p className="text-[10px] sm:text-xs text-gray-400 text-right">
                          {announcementForm.content.length}/2000
                        </p>
                      </div>

                      <motion.div 
                        className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                      >
                        <motion.div 
                          className="space-y-1.5 sm:space-y-2"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15, duration: 0.3, type: "spring", stiffness: 200 }}
                        >
                          <label className="text-xs sm:text-sm font-medium text-white">类型</label>
                          <AnimatedSelect
                            value={announcementForm.type}
                            onChange={(value) => setAnnouncementForm({ ...announcementForm, type: value as any })}
                            options={[
                              { value: 'info', label: '信息' },
                              { value: 'success', label: '成功' },
                              { value: 'warning', label: '警告' },
                              { value: 'error', label: '错误' }
                            ]}
                          />
                        </motion.div>

                        <motion.div 
                          className="space-y-1.5 sm:space-y-2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2, duration: 0.3, type: "spring", stiffness: 200 }}
                        >
                          <label className="text-xs sm:text-sm font-medium text-white">优先级</label>
                          <AnimatedSelect
                            value={announcementForm.priority}
                            onChange={(value) => setAnnouncementForm({ ...announcementForm, priority: value as any })}
                            options={[
                              { value: 'low', label: '低' },
                              { value: 'normal', label: '普通' },
                              { value: 'high', label: '高' }
                            ]}
                          />
                        </motion.div>
                      </motion.div>

                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium text-white">
                          过期时间 <span className="text-gray-500 text-[10px] sm:text-xs">（可选）</span>
                        </label>
                        <Input
                          type="date"
                          value={announcementForm.expiresAt}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, expiresAt: e.target.value })}
                          className="bg-slate-800/50 border-slate-600 text-white text-xs sm:text-sm"
                        />
                        <p className="text-[10px] sm:text-xs text-gray-400">留空表示永久有效</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={announcementForm.isActive}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, isActive: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800/50 text-purple-500 focus:ring-purple-500"
                        />
                        <label htmlFor="isActive" className="text-xs sm:text-sm text-white cursor-pointer">
                          立即生效（活跃状态）
                        </label>
                      </div>

                      <div className="flex gap-2 sm:gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={resetAnnouncementForm}
                          className="flex-1 text-xs sm:text-sm"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          取消
                        </Button>
                        <Button
                          onClick={handleSaveAnnouncement}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs sm:text-sm"
                        >
                          <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          保存
                        </Button>
                      </div>
                    </CardContent>
                </Card>
              </motion.div>
            )}
            </AnimatePresence>

            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
                      公告管理
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      创建和管理系统公告，所有用户都能看到
                    </CardDescription>
                  </div>
                  {!isAddingAnnouncement && !editingAnnouncement && (
                    <Button
                      onClick={() => {
                        resetAnnouncementForm()
                        setIsAddingAnnouncement(true)
                      }}
                      className="text-xs sm:text-sm"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      添加公告
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {isLoadingAnnouncements ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto text-purple-400 mb-2" />
                    <p className="text-xs sm:text-sm text-gray-400">加载中...</p>
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-8">
                    <Megaphone className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-600 mb-3" />
                    <p className="text-xs sm:text-sm text-gray-400">暂无公告</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <div key={ann.id} className="p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-xs sm:text-sm text-white">{ann.title}</h3>
                              <span className={`px-2 py-0.5 text-[10px] rounded ${
                                ann.type === 'info' ? 'bg-blue-500/20 text-blue-300' :
                                ann.type === 'success' ? 'bg-green-500/20 text-green-300' :
                                ann.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-red-500/20 text-red-300'
                              }`}>
                                {ann.type}
                              </span>
                              {!ann.isActive && (
                                <span className="px-2 py-0.5 text-[10px] rounded bg-gray-500/20 text-gray-300">
                                  已停用
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-400 whitespace-pre-wrap">{ann.content}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-[9px] sm:text-[10px] text-gray-500">
                                {new Date(ann.createdAt).toLocaleString('zh-CN')}
                              </p>
                              {ann.isActive && (
                                <span className="text-[9px] sm:text-[10px] text-green-400 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  已确认: {confirmationStats[ann.id] || 0} 人
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingAnnouncement(ann)
                                setAnnouncementForm({
                                  title: ann.title,
                                  content: ann.content,
                                  type: ann.type,
                                  priority: ann.priority,
                                  expiresAt: ann.expiresAt 
                                    ? new Date(ann.expiresAt).toISOString().split('T')[0]
                                    : '',
                                  isActive: ann.isActive
                                })
                                setIsAddingAnnouncement(false)
                              }}
                              className="text-xs"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const adminToken = 'Znj00751_admin_2024'
                                  const response = await fetch('/api/admin/announcements', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'x-admin-token': adminToken
                                    },
                                    body: JSON.stringify({
                                      action: 'delete',
                                      announcement: { id: ann.id }
                                    })
                                  })
                                  const result = await response.json()
                                  if (result.success) {
                                    toast.success('公告已删除')
                                    loadAnnouncements()
                                  } else {
                                    toast.error(result.message || '删除失败')
                                  }
                                } catch (error) {
                                  toast.error('删除失败')
                                }
                              }}
                              className="text-xs text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 建议管理 */}
        {activeTab === 'suggestions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  建议管理
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  查看和处理用户的建议反馈
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {isLoadingSuggestions ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto text-purple-400 mb-2" />
                    <p className="text-xs sm:text-sm text-gray-400">加载中...</p>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-600 mb-3" />
                    <p className="text-xs sm:text-sm text-gray-400">暂无建议</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((sug) => (
                      <div key={sug.id} className={`p-3 sm:p-4 rounded-lg border ${
                        sug.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30' :
                        sug.status === 'reviewing' ? 'bg-blue-500/10 border-blue-500/30' :
                        sug.status === 'approved' ? 'bg-green-500/10 border-green-500/30' :
                        sug.status === 'rejected' ? 'bg-red-500/10 border-red-500/30' :
                        'bg-purple-500/10 border-purple-500/30'
                      }`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-medium text-xs sm:text-sm text-white">{sug.title}</h3>
                              <span className={`px-2 py-0.5 text-[10px] rounded ${
                                sug.type === 'school' ? 'bg-blue-500/20 text-blue-300' :
                                sug.type === 'bug' ? 'bg-red-500/20 text-red-300' :
                                sug.type === 'feature' ? 'bg-purple-500/20 text-purple-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>
                                {sug.type === 'school' ? '添加学校' :
                                 sug.type === 'bug' ? 'BUG反馈' :
                                 sug.type === 'feature' ? '功能建议' : '其他'}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] rounded ${
                                sug.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                sug.status === 'reviewing' ? 'bg-blue-500/20 text-blue-300' :
                                sug.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                                sug.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                                'bg-purple-500/20 text-purple-300'
                              }`}>
                                {sug.status === 'pending' ? '待处理' :
                                 sug.status === 'reviewing' ? '审核中' :
                                 sug.status === 'approved' ? '已通过' :
                                 sug.status === 'rejected' ? '已拒绝' : '已完成'}
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-400 whitespace-pre-wrap mb-2">{sug.content}</p>
                            {sug.contact && (
                              <p className="text-[9px] sm:text-[10px] text-gray-500 mb-1">联系方式: {sug.contact}</p>
                            )}
                            <p className="text-[9px] sm:text-[10px] text-gray-500">
                              {new Date(sug.createdAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          {sug.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const adminToken = 'Znj00751_admin_2024'
                                    const response = await fetch('/api/admin/suggestions', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'x-admin-token': adminToken
                                      },
                                      body: JSON.stringify({
                                        action: 'updateStatus',
                                        suggestion: { id: sug.id, status: 'approved' }
                                      })
                                    })
                                    const result = await response.json()
                                    if (result.success) {
                                      toast.success('建议已通过')
                                      loadSuggestions()
                                    } else {
                                      toast.error(result.message || '操作失败')
                                    }
                                  } catch (error) {
                                    toast.error('操作失败')
                                  }
                                }}
                                className="text-xs text-green-400"
                              >
                                通过
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const adminToken = 'Znj00751_admin_2024'
                                    const response = await fetch('/api/admin/suggestions', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'x-admin-token': adminToken
                                      },
                                      body: JSON.stringify({
                                        action: 'updateStatus',
                                        suggestion: { id: sug.id, status: 'rejected' }
                                      })
                                    })
                                    const result = await response.json()
                                    if (result.success) {
                                      toast.success('建议已拒绝')
                                      loadSuggestions()
                                    } else {
                                      toast.error(result.message || '操作失败')
                                    }
                                  } catch (error) {
                                    toast.error('操作失败')
                                  }
                                }}
                                className="text-xs text-red-400"
                              >
                                拒绝
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* COS 存储管理 */}
        {activeTab === 'cos' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Server className="h-4 w-4 sm:h-5 sm:w-5" />
                  腾讯云 COS 存储文件列表
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  查看存储在腾讯云 COS 中的数据文件
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    onClick={loadCosFiles}
                    disabled={isLoadingCosFiles}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCosFiles ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                  <span className="text-xs sm:text-sm text-gray-400">
                    共 {cosFiles.length} 个文件
                  </span>
                </div>
                {isLoadingCosFiles ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-gray-400">加载中...</p>
                  </div>
                ) : cosFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <Server className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-400">暂无文件</p>
                    <p className="text-xs text-gray-500 mt-2">COS 存储未配置或文件为空</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cosFiles.map((file, index) => (
                      <div
                        key={file.key}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                              <h3 className="font-medium text-sm sm:text-base text-white truncate">
                                {file.name}
                              </h3>
                            </div>
                            <div className="space-y-1 text-xs sm:text-sm text-gray-400">
                              <p>
                                <span className="text-gray-500">路径:</span>{' '}
                                <span className="text-gray-300 font-mono">{file.key}</span>
                              </p>
                              <p>
                                <span className="text-gray-500">大小:</span>{' '}
                                <span className="text-gray-300">
                                  {(file.size / 1024).toFixed(2)} KB
                                </span>
                              </p>
                              <p>
                                <span className="text-gray-500">更新时间:</span>{' '}
                                <span className="text-gray-300">
                                  {new Date(file.lastModified).toLocaleString('zh-CN')}
                                </span>
                              </p>
                              {file.contentType && (
                                <p>
                                  <span className="text-gray-500">类型:</span>{' '}
                                  <span className="text-gray-300">{file.contentType}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 border-green-500/30 text-green-300"
                            >
                              已同步
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 配置管理 */}
        {activeTab === 'config' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <Card className="glass">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  系统配置
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  管理系统相关配置参数
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-400 mb-2">系统信息</p>
                    <div className="space-y-1 text-xs sm:text-sm">
                      <p className="text-white">
                        <span className="text-gray-400">当前时间:</span> {new Date().toLocaleString('zh-CN')}
                      </p>
                      <p className="text-white">
                        <span className="text-gray-400">用户代理:</span> {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A'}
                      </p>
                      <p className="text-white">
                        <span className="text-gray-400">语言:</span> {typeof navigator !== 'undefined' ? navigator.language : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
