'use client'

import { motion } from 'framer-motion'
import { Loader2, Calendar, BookOpen, Target, Settings, User } from 'lucide-react'

interface AnimatedLoaderProps {
  type?: 'default' | 'course' | 'schedule' | 'selection' | 'settings' | 'student'
  message?: string
  subMessage?: string
  size?: 'sm' | 'md' | 'lg'
}

const iconMap = {
  default: Loader2,
  course: BookOpen,
  schedule: Calendar,
  selection: Target,
  settings: Settings,
  student: User
}

const colorMap = {
  default: 'text-primary',
  course: 'text-blue-400',
  schedule: 'text-orange-400',
  selection: 'text-pink-400',
  settings: 'text-gray-400',
  student: 'text-green-400'
}

const sizeMap = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
}

export default function AnimatedLoader({ 
  type = 'default', 
  message = '加载中...', 
  subMessage,
  size = 'md'
}: AnimatedLoaderProps) {
  const Icon = iconMap[type]
  const color = colorMap[type]
  const iconSize = sizeMap[size]

  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-8"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative mb-4"
        animate={{ 
          rotate: type === 'default' ? 360 : 0,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: type === 'default' ? { duration: 2, repeat: Infinity, ease: "linear" } : {},
          scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <Icon className={`${iconSize} ${color}`} />
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
        <h3 className="text-lg font-semibold text-white mb-2">{message}</h3>
        {subMessage && (
          <p className="text-muted-foreground">{subMessage}</p>
        )}
      </motion.div>
      
      <motion.div
        className="mt-4 w-64 h-1 bg-white/10 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className={`h-full rounded-full ${
            type === 'course' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
            type === 'schedule' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
            type === 'selection' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
            type === 'settings' ? 'bg-gradient-to-r from-gray-500 to-slate-500' :
            type === 'student' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
            'bg-gradient-to-r from-purple-500 to-blue-500'
          }`}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>
    </motion.div>
  )
}
