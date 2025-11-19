'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Lock, User, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface AdminLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess: () => void
}

const ADMIN_USERNAME = '822069905'
const ADMIN_PASSWORD = 'Znj00751'

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }: AdminLoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showError, setShowError] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setShowError(false)

    // 模拟登录验证
    await new Promise(resolve => setTimeout(resolve, 500))

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      toast.success('登录成功')
      setUsername('')
      setPassword('')
      setIsLoading(false)
      onLoginSuccess()
    } else {
      setShowError(true)
      setIsLoading(false)
      toast.error('账号或密码错误')
    }
  }

  const handleClose = () => {
    setUsername('')
    setPassword('')
    setShowError(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md"
          >
            <Card className="glass border-purple-500/30 shadow-2xl">
              <CardHeader className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 rounded-full hover:bg-red-500/20"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  <Lock className="h-6 w-6 text-purple-400" />
                  后台管理登录
                </CardTitle>
                <CardDescription className="text-gray-300">
                  请输入管理员账号和密码
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      账号
                    </label>
                    <Input
                      type="text"
                      placeholder="请输入账号"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-gray-500"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                      <Lock className="h-4 w-4 text-gray-400" />
                      密码
                    </label>
                    <Input
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800/50 border-slate-600 text-white placeholder:text-gray-500"
                      disabled={isLoading}
                    />
                  </div>

                  {showError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>账号或密码错误，请重试</span>
                    </motion.div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      disabled={isLoading || !username || !password}
                    >
                      {isLoading ? '登录中...' : '登录'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
