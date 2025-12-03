'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageZoomModalProps {
    src: string
    alt?: string
    isOpen: boolean
    onClose: () => void
}

export default function ImageZoomModal({ src, alt = '图片预览', isOpen, onClose }: ImageZoomModalProps) {
    const [scale, setScale] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    // ESC 键关闭
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen])

    if (!isOpen) return null

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setScale(prev => Math.max(0.5, Math.min(5, prev + delta)))
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) return // 点击背景关闭
        setIsDragging(true)
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const resetTransform = () => {
        setScale(1)
        setRotation(0)
        setPosition({ x: 0, y: 0 })
    }

    const handleClose = () => {
        resetTransform()
        onClose()
    }

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                {/* 背景遮罩 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                />

                {/* 工具栏 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/90 rounded-lg p-2 backdrop-blur-sm z-10"
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScale(prev => Math.min(5, prev + 0.2))}
                        className="text-white hover:bg-slate-700"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScale(prev => Math.max(0.5, prev - 0.2))}
                        className="text-white hover:bg-slate-700"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRotation(prev => prev + 90)}
                        className="text-white hover:bg-slate-700"
                    >
                        <RotateCw className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-px bg-slate-600 mx-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetTransform}
                        className="text-white hover:bg-slate-700 text-xs"
                    >
                        重置
                    </Button>
                    <div className="text-slate-400 text-xs px-2">
                        {Math.round(scale * 100)}%
                    </div>
                </motion.div>

                {/* 关闭按钮 */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 bg-slate-800/90 rounded-full text-white hover:bg-slate-700 transition-colors z-10"
                >
                    <X className="h-5 w-5" />
                </motion.button>

                {/* 图片容器 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative max-w-[95vw] max-h-[95vh] overflow-hidden cursor-move"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <img
                        src={src}
                        alt={alt}
                        className="max-w-full max-h-full object-contain select-none"
                        style={{
                            transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                            cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                        draggable={false}
                    />
                </motion.div>

                {/* 提示信息 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-400 text-sm bg-slate-800/90 px-4 py-2 rounded-lg backdrop-blur-sm"
                >
                    滚轮缩放 • 拖拽移动 • ESC 关闭
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    )
}
