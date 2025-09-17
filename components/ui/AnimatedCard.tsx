'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReactNode } from 'react'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  delay?: number
  gradient?: 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'gray'
  direction?: 'up' | 'down' | 'left' | 'right'
}

const gradientMap = {
  purple: 'from-purple-500/5 to-blue-500/5',
  blue: 'from-blue-500/5 to-cyan-500/5',
  green: 'from-green-500/5 to-emerald-500/5',
  orange: 'from-orange-500/5 to-red-500/5',
  pink: 'from-pink-500/5 to-rose-500/5',
  gray: 'from-gray-500/5 to-slate-500/5'
}

const directionMap = {
  up: { y: 20 },
  down: { y: -20 },
  left: { x: 20 },
  right: { x: -20 }
}

export default function AnimatedCard({
  children,
  className = '',
  hover = true,
  delay = 0,
  gradient = 'purple',
  direction = 'up'
}: AnimatedCardProps) {
  const gradientClass = gradientMap[gradient]
  const directionOffset = directionMap[direction]

  return (
    <motion.div
      initial={{ opacity: 0, ...directionOffset, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ 
        delay,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={hover ? { 
        y: -5,
        scale: 1.02,
        transition: { duration: 0.2 }
      } : {}}
      layout
    >
      <Card className={`glass card-hover relative overflow-hidden ${className}`}>
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${gradientClass}`}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        <div className="relative z-10">
          {children}
        </div>
      </Card>
    </motion.div>
  )
}
