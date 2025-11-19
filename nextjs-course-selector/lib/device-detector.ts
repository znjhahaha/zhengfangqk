// 设备检测工具 - 用于性能优化
'use client'

import { useState, useEffect } from 'react'

// 检测是否为移动设备
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768
}

// 检测是否为低性能设备
export function isLowPerformanceDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  const isMobile = isMobileDevice()
  const hardwareConcurrency = navigator.hardwareConcurrency || 4
  const deviceMemory = (navigator as any).deviceMemory || 4
  
  // 移动设备或CPU核心数少于4或内存少于4GB的设备
  return isMobile || hardwareConcurrency < 4 || deviceMemory < 4
}

// React Hook: 检测设备类型
export function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isLowPerformance, setIsLowPerformance] = useState(false)
  
  useEffect(() => {
    setIsMobile(isMobileDevice())
    setIsLowPerformance(isLowPerformanceDevice())
  }, [])
  
  return { isMobile, isLowPerformance }
}

// 根据设备类型返回动画配置
export function getAnimationConfig(isMobile: boolean, isLowPerformance: boolean) {
  if (isLowPerformance || isMobile) {
    // 移动端和低性能设备：简化动画
    return {
      enabled: true, // 仍然启用动画，但简化
      duration: 0.2, // 缩短动画时长
      reduceMotion: true, // 减少动画
      disableBackdropBlur: true, // 禁用backdrop-blur
      disableHoverEffects: true, // 禁用hover效果
      useGPU: true // 使用GPU加速
    }
  }
  
  // 桌面端：完整动画
  return {
    enabled: true,
    duration: 0.3,
    reduceMotion: false,
    disableBackdropBlur: false,
    disableHoverEffects: false,
    useGPU: true
  }
}

