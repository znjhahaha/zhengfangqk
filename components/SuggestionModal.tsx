'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageSquare, Bug, Plus, Star, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

interface SuggestionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SuggestionModal({ isOpen, onClose }: SuggestionModalProps) {
  const [type, setType] = useState<'school' | 'bug' | 'feature' | 'other'>('other')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和内容')
      return
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
            contact: contact.trim() || undefined
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('建议提交成功！我们会尽快处理')
        // 重置表单
        setTitle('')
        setContent('')
        setContact('')
        setType('other')
        onClose()
      } else {
        toast.error(result.message || '提交失败')
      }
    } catch (error: any) {
      console.error('提交建议失败:', error)
      toast.error('提交失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const typeOptions = [
    { value: 'school', label: '添加学校', icon: Plus, desc: '建议添加新的学校教务地址' },
    { value: 'bug', label: 'BUG反馈', icon: Bug, desc: '报告发现的错误或问题' },
    { value: 'feature', label: '功能建议', icon: Star, desc: '提出新功能或改进建议' },
    { value: 'other', label: '其他', icon: MessageSquare, desc: '其他意见或建议' }
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
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
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-xl border border-purple-500/30 shadow-2xl"
        >
          {/* 头部 */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 border-b border-purple-500/30 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">提交建议</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </button>
          </div>

          {/* 内容 */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* 类型选择 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 sm:mb-3">
                建议类型
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {typeOptions.map((option) => {
                  const Icon = option.icon
                  const isSelected = type === option.value
                  return (
                    <button
                      key={option.value}
                      onClick={() => setType(option.value)}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-gray-600 bg-slate-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 sm:mb-2" />
                      <div className="text-[10px] sm:text-xs font-medium">{option.label}</div>
                      <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 sm:mt-1">
                        {option.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 标题 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                标题 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入建议标题..."
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800/50 border border-gray-600 rounded-lg text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                maxLength={100}
              />
            </div>

            {/* 内容 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                详细内容 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  type === 'school'
                    ? '请提供学校名称、教务系统网址等信息...'
                    : type === 'bug'
                    ? '请描述BUG的具体情况、复现步骤等...'
                    : '请详细描述您的建议...'
                }
                rows={6}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800/50 border border-gray-600 rounded-lg text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                maxLength={2000}
              />
              <div className="text-[10px] sm:text-xs text-gray-500 mt-1 text-right">
                {content.length}/2000
              </div>
            </div>

            {/* 联系方式（可选） */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                联系方式 <span className="text-gray-500 text-[10px] sm:text-xs">（可选）</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="邮箱、QQ等（便于我们联系您）"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800/50 border border-gray-600 rounded-lg text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                maxLength={100}
              />
            </div>

            {/* 提示 */}
            <div className="flex items-start gap-2 p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] sm:text-xs text-blue-300 leading-relaxed">
                感谢您的建议！我们会认真对待每一条反馈，并在后台管理中及时处理。
                {type === 'school' && '如果建议添加学校，请提供准确的学校名称和教务系统网址。'}
              </p>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="sticky bottom-0 flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-purple-500/30 bg-slate-900/50 backdrop-blur-sm">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-xs sm:text-sm"
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs sm:text-sm"
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {isSubmitting ? '提交中...' : '提交建议'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

