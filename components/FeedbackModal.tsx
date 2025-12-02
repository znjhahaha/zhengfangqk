'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bug, Lightbulb, HelpCircle, Camera, MessageSquare } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import toast from 'react-hot-toast'
import ErrorTracker from '@/lib/error-tracker'

interface FeedbackModalProps {
    isOpen: boolean
    onClose: () => void
    errorContext?: any
}

type FeedbackType = 'bug' | 'feature' | 'other'

/**
 * 反馈模态框
 * 允许用户提交Bug报告、功能建议等反馈
 */
export default function FeedbackModal({ isOpen, onClose, errorContext }: FeedbackModalProps) {
    const [type, setType] = useState<FeedbackType>('bug')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [contact, setContact] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [screenshot, setScreenshot] = useState<string | null>(null)

    // 自动填充错误上下文
    useEffect(() => {
        if (errorContext && isOpen) {
            setType('bug')
            setDescription(prev =>
                prev || `错误信息：${errorContext.message}\n\n请补充出现问题时的操作步骤...`
            )
        }
    }, [errorContext, isOpen])

    // 截图功能（使用 html2canvas）
    const takeScreenshot = async () => {
        try {
            // 动态导入 html2canvas（减小初始包大小）
            const html2canvas = (await import('html2canvas')).default
            const canvas = await html2canvas(document.body, {
                ignoreElements: (element) => {
                    // 忽略模态框本身
                    return element.classList.contains('feedback-modal')
                }
            })

            const dataUrl = canvas.toDataURL('image/png')
            setScreenshot(dataUrl)
            toast.success('截图已生成')
        } catch (error) {
            console.error('Screenshot failed:', error)
            toast.error('截图失败')
        }
    }

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            toast.error('请填写标题和描述')
            return
        }

        setIsSubmitting(true)

        try {
            // 收集系统信息
            const systemInfo = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                timestamp: new Date().toISOString()
            }

            // 收集错误日志（最近5条）
            const recentErrors = ErrorTracker.getErrorHistory(5)
            const recentActions = ErrorTracker.getActionHistory(10)

            const feedbackData = {
                type,
                title,
                description,
                contact,
                screenshot,
                systemInfo,
                recentErrors,
                recentActions,
                errorContext
            }

            // 记录到操作日志
            ErrorTracker.logAction('feedback_submitted', { type, title })

            // 发送到后台（这里使用建议API）
            const response = await fetch('/api/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'create',
                    suggestion: {
                        title,
                        content: description,
                        category: type,
                        contact,
                        metadata: {
                            systemInfo,
                            recentErrors: recentErrors.map(e => ({
                                message: e.error.message,
                                component: e.context.component,
                                timestamp: e.timestamp
                            })),
                            screenshot: screenshot ? 'included' : 'none'
                        }
                    }
                })
            })

            const result = await response.json()

            if (result.success) {
                toast.success('感谢您的反馈！')
                onClose()
                // 重置表单
                setTitle('')
                setDescription('')
                setContact('')
                setScreenshot(null)
                setType('bug')
            } else {
                toast.error('提交失败，请稍后重试')
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error)
            toast.error('提交失败')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    const feedbackTypes = [
        { value: 'bug' as FeedbackType, label: 'Bug反馈', icon: Bug, color: 'red' },
        { value: 'feature' as FeedbackType, label: '功能建议', icon: Lightbulb, color: 'yellow' },
        { value: 'other' as FeedbackType, label: '其他问题', icon: HelpCircle, color: 'blue' }
    ]

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 feedback-modal">
                {/* 背景遮罩 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* 模态框内容 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 头部 */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <MessageSquare className="h-6 w-6 text-purple-400" />
                            意见反馈
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>

                    {/* 内容 */}
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* 反馈类型选择 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                反馈类型
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {feedbackTypes.map(({ value, label, icon: Icon, color }) => (
                                    <button
                                        key={value}
                                        onClick={() => setType(value)}
                                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${type === value
                                            ? `border-${color}-500 bg-${color}-500/10`
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                            }`}
                                    >
                                        <Icon className={`h-5 w-5 ${type === value ? `text-${color}-400` : 'text-gray-400'}`} />
                                        <span className={`text-sm font-medium ${type === value ? 'text-white' : 'text-gray-400'}`}>
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 标题 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                标题 <span className="text-red-400">*</span>
                            </label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="简短描述问题或建议"
                                className="bg-slate-800/50 border-slate-700 text-white"
                            />
                        </div>

                        {/* 详细描述 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                详细描述 <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="请详细描述您遇到的问题或建议..."
                                rows={6}
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                            />
                        </div>

                        {/* 联系方式（可选） */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                联系方式（可选）
                            </label>
                            <Input
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                placeholder="QQ/微信/邮箱，方便我们联系您"
                                className="bg-slate-800/50 border-slate-700 text-white"
                            />
                        </div>

                        {/* 截图 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    截图（可选）
                                </label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={takeScreenshot}
                                    disabled={!!screenshot}
                                    className="text-xs"
                                >
                                    <Camera className="h-4 w-4 mr-1" />
                                    {screenshot ? '已截图' : '截取当前页面'}
                                </Button>
                            </div>
                            {screenshot && (
                                <div className="relative">
                                    <img src={screenshot} alt="Screenshot" className="w-full rounded-lg border border-slate-700" />
                                    <button
                                        onClick={() => setScreenshot(null)}
                                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                                    >
                                        <X className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 提示信息 */}
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-xs text-blue-300">
                                💡 提示：您的反馈将被发送给开发团队。为了更快解决问题，建议提供详细的操作步骤和截图。
                            </p>
                        </div>
                    </div>

                    {/* 底部按钮 */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700/50">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            取消
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !title.trim() || !description.trim()}
                            className="bg-gradient-to-r from-purple-600 to-blue-600"
                        >
                            {isSubmitting ? (
                                <>正在提交...</>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    提交反馈
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
