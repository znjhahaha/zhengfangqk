'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    Clock,
    Search,
    Loader2,
    CheckCircle,
    AlertCircle,
    Key,
    Calendar,
    Play,
    School
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

interface ScheduledCourseModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
}

export default function ScheduledCourseModal({
    isOpen,
    onClose,
    userId
}: ScheduledCourseModalProps) {
    // 表单状态
    const [cookie, setCookie] = useState('')
    const [courseKeywords, setCourseKeywords] = useState('')
    const [scheduledTime, setScheduledTime] = useState('')

    // UI状态
    const [isValidatingCookie, setIsValidatingCookie] = useState(false)
    const [cookieValid, setCookieValid] = useState<boolean | null>(null)
    const [cookieStudentInfo, setCookieStudentInfo] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [currentSchool, setCurrentSchool] = useState<{ id: string; name: string } | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // 获取当前学校（与外部同步）
    useEffect(() => {
        if (isOpen) {
            const loadCurrentSchool = async () => {
                try {
                    const { getCurrentSchool } = await import('@/lib/global-school-state')
                    const school = getCurrentSchool()
                    setCurrentSchool({ id: school.id, name: school.name })
                } catch (error) {
                    console.error('获取当前学校失败:', error)
                }
            }
            loadCurrentSchool()

            // 设置默认时间为当前时间 + 5分钟
            const now = new Date()
            now.setMinutes(now.getMinutes() + 5)
            const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)
            setScheduledTime(localTime)
        }
    }, [isOpen])

    // 验证Cookie - 使用GET方法
    const validateCookie = useCallback(async (cookieValue: string) => {
        if (!cookieValue.trim() || !currentSchool?.id) {
            setCookieValid(null)
            setCookieStudentInfo(null)
            return
        }

        setIsValidatingCookie(true)
        setCookieValid(null)
        setCookieStudentInfo(null)

        try {
            // 使用学生信息API验证Cookie - 使用GET方法
            const response = await fetch(`/api/student-info?schoolId=${currentSchool.id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-course-cookie': cookieValue
                }
            })

            const result = await response.json()

            if (result.success && result.data) {
                setCookieValid(true)
                setCookieStudentInfo(result.data)
                toast.success(`Cookie有效！欢迎 ${result.data.name || result.data.xm || '用户'}`)
            } else {
                setCookieValid(false)
                setCookieStudentInfo(null)
                toast.error(result.message || 'Cookie无效或已过期')
            }
        } catch (error) {
            console.error('验证Cookie失败:', error)
            setCookieValid(false)
            setCookieStudentInfo(null)
            toast.error('Cookie验证失败，请检查网络连接')
        } finally {
            setIsValidatingCookie(false)
        }
    }, [currentSchool?.id])

    // Cookie输入防抖验证
    useEffect(() => {
        if (!cookie.trim() || !currentSchool?.id) return

        const timer = setTimeout(() => {
            validateCookie(cookie)
        }, 1000)

        return () => clearTimeout(timer)
    }, [cookie, currentSchool?.id, validateCookie])

    // 提交定时抢课任务
    const handleSubmit = async () => {
        // 验证表单
        if (!cookie.trim()) {
            toast.error('请输入Cookie')
            return
        }

        if (!cookieValid) {
            toast.error('请先验证Cookie有效性')
            return
        }

        if (!currentSchool?.id) {
            toast.error('未获取到当前学校')
            return
        }

        if (!courseKeywords.trim()) {
            toast.error('请输入课程关键词')
            return
        }

        if (!scheduledTime) {
            toast.error('请设置开始抢课时间')
            return
        }

        const scheduledTimestamp = new Date(scheduledTime).getTime()
        if (scheduledTimestamp <= Date.now()) {
            toast.error('抢课时间必须是未来时间')
            return
        }

        if (scheduledTimestamp - Date.now() > 24 * 60 * 60 * 1000) {
            toast.error('抢课时间不能超过24小时')
            return
        }

        setIsSubmitting(true)

        try {
            // 提交定时抢课任务
            const response = await fetch('/api/scheduled-course-selection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    cookie,
                    schoolId: currentSchool.id,
                    keywords: courseKeywords.split(/[,，\s]+/).filter(k => k.trim()),
                    scheduledTime: scheduledTimestamp,
                    studentInfo: cookieStudentInfo
                })
            })

            const result = await response.json()

            if (result.success) {
                toast.success('定时抢课任务已创建！')
                onClose()
                // 重置表单
                setCookie('')
                setCookieValid(null)
                setCookieStudentInfo(null)
                setCourseKeywords('')
            } else {
                toast.error(result.message || result.error || '创建任务失败')
            }
        } catch (error: any) {
            console.error('创建定时抢课任务失败:', error)
            toast.error(error.message || '创建任务失败')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!mounted || !isOpen) return null

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* 背景遮罩 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* 模态框内容 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-lg max-h-[90vh] overflow-hidden"
                >
                    {/* 头部 */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-gradient-to-r from-purple-600/10 to-blue-600/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Clock className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">定时抢课</h2>
                                <p className="text-sm text-gray-400">设置关键词，到时间自动抢课</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>

                    {/* 表单内容 */}
                    <div className="p-6 space-y-5 max-h-[calc(90vh-200px)] overflow-y-auto">
                        {/* 当前学校（只读显示） */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <School className="h-4 w-4" />
                                当前学校
                            </label>
                            <div className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-400">
                                {currentSchool?.name || '加载中...'}
                            </div>
                        </div>

                        {/* Cookie输入 */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <Key className="h-4 w-4" />
                                Cookie <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <textarea
                                    value={cookie}
                                    onChange={(e) => {
                                        setCookie(e.target.value)
                                        setCookieValid(null)
                                        setCookieStudentInfo(null)
                                    }}
                                    placeholder="请粘贴您的登录Cookie..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none text-sm"
                                />
                                {/* Cookie验证状态 */}
                                <div className="absolute right-2 top-2">
                                    {isValidatingCookie && (
                                        <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                                    )}
                                    {!isValidatingCookie && cookieValid === true && (
                                        <CheckCircle className="h-5 w-5 text-green-400" />
                                    )}
                                    {!isValidatingCookie && cookieValid === false && (
                                        <AlertCircle className="h-5 w-5 text-red-400" />
                                    )}
                                </div>
                            </div>
                            {/* Cookie验证结果 */}
                            {cookieValid === true && cookieStudentInfo && (
                                <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                                    <span className="text-sm text-green-300">
                                        验证通过：{cookieStudentInfo.name || cookieStudentInfo.xm} ({cookieStudentInfo.studentId || cookieStudentInfo.xh})
                                    </span>
                                </div>
                            )}
                            {cookieValid === false && (
                                <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                                    <span className="text-sm text-red-300">Cookie无效或已过期，请重新获取</span>
                                </div>
                            )}
                        </div>

                        {/* 课程关键词 */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <Search className="h-4 w-4" />
                                课程关键词 <span className="text-red-400">*</span>
                            </label>
                            <Input
                                value={courseKeywords}
                                onChange={(e) => setCourseKeywords(e.target.value)}
                                placeholder="例如：高等数学, 大学英语（多个关键词用逗号分隔）"
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                            <p className="text-xs text-gray-500">
                                系统会在抢课时间自动获取课程列表，匹配关键词相似度最高的课程进行抢课
                            </p>
                        </div>

                        {/* 开始时间 */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                <Calendar className="h-4 w-4" />
                                开始抢课时间 <span className="text-red-400">*</span>
                            </label>
                            <Input
                                type="datetime-local"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                            <p className="text-xs text-gray-500">
                                到达设定时间后，服务器会自动开始抢课（最长24小时）
                            </p>
                        </div>

                        {/* 提示信息 */}
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-xs text-blue-300">
                                💡 提示：服务器会在设定时间自动获取可选课程，并匹配您提供的关键词。
                                匹配度最高的课程将被选中，系统会持续尝试直到抢课成功。
                            </p>
                        </div>
                    </div>

                    {/* 底部按钮 */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700/50 bg-slate-900/50">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                            取消
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !cookieValid || !courseKeywords.trim() || !scheduledTime}
                            className="bg-gradient-to-r from-purple-600 to-blue-600"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    创建中...
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 mr-2" />
                                    创建定时任务
                                </>
                            )}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    )
}
