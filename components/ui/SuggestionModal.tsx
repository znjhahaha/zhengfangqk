'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, School, Bug, Lightbulb, MessageSquare } from 'lucide-react'
import { Button } from './button'
import toast from 'react-hot-toast'

interface SuggestionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SuggestionModal({ isOpen, onClose }: SuggestionModalProps) {
  const [type, setType] = useState<'add_school' | 'bug_report' | 'feature_request' | 'other'>('other')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [schoolInfo, setSchoolInfo] = useState({
    name: '',
    domain: '',
    protocol: 'https' as 'http' | 'https',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const typeOptions = [
    { value: 'add_school', label: '添加学校', icon: School, color: 'text-blue-400' },
    { value: 'bug_report', label: 'BUG反馈', icon: Bug, color: 'text-red-400' },
    { value: 'feature_request', label: '功能建议', icon: Lightbulb, color: 'text-yellow-400' },
    { value: 'other', label: '其他', icon: MessageSquare, color: 'text-gray-400' }
  ]

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和内容')
      return
    }

    if (type === 'add_school') {
      if (!schoolInfo.name.trim() || !schoolInfo.domain.trim()) {
        toast.error('添加学校时，请填写学校名称和域名')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create',
          suggestion: {
            type,
            title: title.trim(),
            content: content.trim(),
            contact: contact.trim() || undefined,
            schoolInfo: type === 'add_school' ? schoolInfo : undefined,
            createdBy: contact.trim() || '匿名用户'
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(result.message || '建议提交成功，感谢您的反馈！')
        handleReset()
        onClose()
      } else {
        toast.error(result.message || '提交失败，请稍后重试')
      }
    } catch (error: any) {
      console.error('提交建议失败:', error)
      toast.error('提交失败，请检查网络连接')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setType('other')
    setTitle('')
    setContent('')
    setContact('')
    setSchoolInfo({
      name: '',
      domain: '',
      protocol: 'https',
      description: ''
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* 模态框 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-lg border border-purple-500/30 shadow-2xl"
        >
          {/* 头部 */}
          <div className="sticky top-0 bg-slate-900/80 backdrop-blur-sm border-b border-purple-500/30 p-4 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">💡 提交建议</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 内容 */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* 类型选择 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white mb-2">
                建议类型
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {typeOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => setType(option.value as any)}
                      className={`flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border transition-all ${
                        type === option.value
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${option.color}`} />
                      <span className="text-[10px] sm:text-xs text-white">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 标题 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white mb-2">
                标题 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请简要描述您的建议"
                className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 text-xs sm:text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 内容 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white mb-2">
                详细内容 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请详细描述您的建议、问题或需求..."
                rows={6}
                className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 text-xs sm:text-sm focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* 学校信息（当类型为添加学校时显示） */}
            {type === 'add_school' && (
              <div className="space-y-3 p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="text-xs sm:text-sm font-medium text-white">学校信息</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] sm:text-xs text-white/70 mb-1">
                      学校名称 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={schoolInfo.name}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                      placeholder="例如：某某大学"
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/40 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs text-white/70 mb-1">
                      域名 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={schoolInfo.domain}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, domain: e.target.value })}
                      placeholder="例如：jwc.example.edu.cn"
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/40 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs text-white/70 mb-1">
                      协议
                    </label>
                    <select
                      value={schoolInfo.protocol}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, protocol: e.target.value as 'http' | 'https' })}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="https">HTTPS</option>
                      <option value="http">HTTP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs text-white/70 mb-1">
                      描述（可选）
                    </label>
                    <input
                      type="text"
                      value={schoolInfo.description}
                      onChange={(e) => setSchoolInfo({ ...schoolInfo, description: e.target.value })}
                      placeholder="学校教务系统描述"
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/40 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 联系方式（可选） */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-white mb-2">
                联系方式（可选）
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="邮箱、QQ或微信号（方便我们联系您）"
                className="w-full px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 text-xs sm:text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 sm:gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 text-xs sm:text-sm"
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs sm:text-sm"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                {isSubmitting ? '提交中...' : '提交'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

