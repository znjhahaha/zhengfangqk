'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

interface AnimatedButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  gradient?: 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'gray'
  icon?: ReactNode
  iconAnimation?: 'rotate' | 'pulse' | 'bounce' | 'none'
}

const gradientMap = {
  purple: 'from-purple-500/20 to-blue-500/20',
  blue: 'from-blue-500/20 to-cyan-500/20',
  green: 'from-green-500/20 to-emerald-500/20',
  orange: 'from-orange-500/20 to-red-500/20',
  pink: 'from-pink-500/20 to-rose-500/20',
  gray: 'from-gray-500/20 to-slate-500/20'
}

const iconAnimations = {
  rotate: {
    animate: { rotate: 360 },
    transition: { duration: 2, repeat: Infinity, ease: "linear" }
  },
  pulse: {
    animate: { 
      scale: [1, 1.2, 1],
      rotate: [0, 5, -5, 0]
    },
    transition: { 
      duration: 2,
      repeat: Infinity,
      repeatDelay: 1
    }
  },
  bounce: {
    animate: { 
      y: [0, -5, 0],
      scale: [1, 1.1, 1]
    },
    transition: { 
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  none: {}
}

export default function AnimatedButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'default',
  className = '',
  gradient = 'purple',
  icon,
  iconAnimation = 'pulse'
}: AnimatedButtonProps) {
  const gradientClass = gradientMap[gradient]
  const iconAnimationProps = iconAnimations[iconAnimation]

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Button
        onClick={onClick}
        disabled={disabled || loading}
        variant={variant}
        size={size}
        className={`btn-hover relative overflow-hidden ${className}`}
      >
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${gradientClass}`}
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.6 }}
        />
        
        <motion.div 
          className="flex items-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-4 w-4 mr-2" />
            </motion.div>
          ) : icon ? (
            <motion.div
              className="mr-2"
              {...iconAnimationProps}
            >
              {icon}
            </motion.div>
          ) : null}
          {children}
        </motion.div>
      </Button>
    </motion.div>
  )
}
