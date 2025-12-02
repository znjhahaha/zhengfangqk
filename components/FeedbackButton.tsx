'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X } from 'lucide-react'
import FeedbackModal from '@/components/FeedbackModal'

/**
 * 浮动反馈按钮
 * 固定在页面右下角，点击打开反馈表单
 */
export default function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    return (
        <>
            {/* 浮动按钮 */}
            <motion.button
                onClick={() => setIsOpen(true)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
            >
                <MessageSquare className="h-5 w-5" />
                <AnimatePresence>
                    {isHovered && (
                        <motion.span
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 'auto', opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="overflow-hidden whitespace-nowrap text-sm font-medium"
                        >
                            意见反馈
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* 反馈模态框 */}
            <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    )
}
