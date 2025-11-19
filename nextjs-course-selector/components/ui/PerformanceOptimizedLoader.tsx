'use client'

import { motion } from 'framer-motion'
import { Loader2 } from './optimized-icons'

interface PerformanceOptimizedLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
}

export default function PerformanceOptimizedLoader({ 
  size = 'md', 
  color = 'text-blue-400',
  text 
}: PerformanceOptimizedLoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <motion.div
        className={`${sizeClasses[size]} ${color}`}
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 1, 
          repeat: Infinity, 
          ease: "linear",
          // 优化动画性能
          type: "tween"
        }}
        style={{
          // GPU加速
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      >
        <Loader2 className="h-full w-full" />
      </motion.div>
      
      {text && (
        <motion.p 
          className="mt-4 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}
