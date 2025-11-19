'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Sparkles, CheckCircle } from 'lucide-react'

interface WelcomeAnimationProps {
  studentName: string
  onAnimationComplete: () => void
  showTopBar?: boolean
}

export default function WelcomeAnimation({ studentName, onAnimationComplete, showTopBar: externalShowTopBar }: WelcomeAnimationProps) {
  const [showWelcome, setShowWelcome] = useState(true)
  const [internalShowTopBar, setInternalShowTopBar] = useState(false)
  
  // 使用外部传入的showTopBar状态，如果没有则使用内部状态
  const showTopBar = externalShowTopBar !== undefined ? externalShowTopBar : internalShowTopBar

  useEffect(() => {
    // 如果外部没有控制showTopBar，则使用内部逻辑
    if (externalShowTopBar === undefined) {
      // 显示欢迎信息1秒
      const welcomeTimer = setTimeout(() => {
        setShowWelcome(false)
        setInternalShowTopBar(true)
      }, 1000)

      // 动画完成后回调（但不隐藏顶部栏）
      const completeTimer = setTimeout(() => {
        onAnimationComplete()
      }, 2000) // 减少到2秒，因为顶部栏会持续显示

      return () => {
        clearTimeout(welcomeTimer)
        clearTimeout(completeTimer)
      }
    } else {
      // 如果外部控制showTopBar，则只处理欢迎弹窗
      const welcomeTimer = setTimeout(() => {
        setShowWelcome(false)
      }, 1000)

      const completeTimer = setTimeout(() => {
        onAnimationComplete()
      }, 2000)

      return () => {
        clearTimeout(welcomeTimer)
        clearTimeout(completeTimer)
      }
    }
  }, [onAnimationComplete, externalShowTopBar])

  return (
    <>
      {/* 欢迎信息 - 居中显示 */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-sm w-full mx-4"
              initial={{ scale: 0.7, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: -60 }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 20,
                duration: 0.7 
              }}
            >
              <div className="text-center">
                {/* 状态指示器 */}
                <motion.div
                  className="mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                >
                  <div className="relative inline-block">
                    <motion.div
                      className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg"
                      animate={{ 
                        scale: [1, 1.05, 1],
                        boxShadow: [
                          "0 10px 25px rgba(34, 197, 94, 0.3)",
                          "0 15px 35px rgba(34, 197, 94, 0.4)",
                          "0 10px 25px rgba(34, 197, 94, 0.3)"
                        ]
                      }}
                      transition={{ 
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                    >
                      <User className="w-10 h-10 text-white" />
                    </motion.div>
                    
                    {/* 成功状态指示 */}
                    <motion.div
                      className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <CheckCircle className="w-5 h-5 text-white" />
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
                
                {/* 标题 */}
                <motion.h2
                  className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  登录成功
                </motion.h2>
                
                {/* 学生信息 */}
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                    {studentName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    欢迎使用 TYUST 选课系统
                  </p>
                </motion.div>
                
                {/* 状态条 */}
                <motion.div
                  className="mt-6 flex items-center justify-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    系统已就绪
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 固定顶部学生信息栏 */}
      <AnimatePresence>
        {showTopBar && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25,
              duration: 0.8 
            }}
          >
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                {/* 左侧：学生信息 */}
                <motion.div
                  className="flex items-center space-x-4"
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <motion.div
                    className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-md"
                    animate={{ 
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <User className="w-5 h-5 text-white" />
                  </motion.div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">当前用户</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{studentName}</p>
                  </div>
                </motion.div>
                
                {/* 右侧：状态指示 */}
                <motion.div
                  className="flex items-center space-x-3"
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  {/* 在线状态指示器 */}
                  <div className="flex items-center space-x-2">
                    <motion.div
                      className="w-2 h-2 bg-green-500 rounded-full"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">在线</span>
                  </div>
                  
                  {/* 系统状态 */}
                  <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300 font-medium">已连接</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
