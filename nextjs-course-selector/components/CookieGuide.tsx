'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Key, 
  Monitor, 
  Copy, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CookieGuideProps {
  onClose?: () => void
}

export default function CookieGuide({ onClose }: CookieGuideProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(1)

  const steps = [
    {
      id: 1,
      title: '打开选课系统',
      description: '在浏览器中访问太原科技大学选课系统',
      details: [
        '打开浏览器，访问：https://newjwc.tyust.edu.cn',
        '使用您的学号和密码登录系统',
        '确保能够正常访问选课页面'
      ],
      icon: <Monitor className="h-5 w-5" />
    },
    {
      id: 2,
      title: '打开开发者工具',
      description: '按F12键或右键选择"检查"',
      details: [
        '按键盘上的F12键',
        '或者右键点击页面，选择"检查"或"审查元素"',
        '确保开发者工具面板已打开'
      ],
      icon: <Key className="h-5 w-5" />
    },
    {
      id: 3,
      title: '找到Cookie',
      description: '在Network标签页中查找请求的Cookie',
      details: [
        '点击开发者工具中的"Network"（网络）标签页',
        '刷新页面或进行任何操作',
        '找到任意一个请求，点击查看详情',
        '在请求头中找到"Cookie"字段',
        '复制完整的Cookie值'
      ],
      icon: <Copy className="h-5 w-5" />
    },
    {
      id: 4,
      title: '配置Cookie',
      description: '将Cookie值粘贴到选课工具中',
      details: [
        '回到选课工具的系统设置页面',
        '将复制的Cookie值粘贴到输入框中',
        '点击"保存配置"按钮',
        '点击"测试连接"验证配置是否正确'
      ],
      icon: <CheckCircle className="h-5 w-5" />
    }
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('已复制到剪贴板')
    }).catch(() => {
      toast.error('复制失败')
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-background border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-6 w-6 text-primary" />
                  <span>Cookie配置指南</span>
                </CardTitle>
                <CardDescription>
                  按照以下步骤获取并配置您的登录Cookie
                </CardDescription>
              </div>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-border rounded-lg p-4"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {step.id}
                    </div>
                    <div className="flex items-center space-x-2">
                      {step.icon}
                      <div>
                        <h3 className="font-medium text-foreground">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </div>
                  {expandedStep === step.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                <AnimatePresence>
                  {expandedStep === step.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pl-11"
                    >
                      <ul className="space-y-2">
                        {step.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-start space-x-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground mb-2">注意事项</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Cookie包含您的登录信息，请妥善保管，不要泄露给他人</li>
                    <li>• Cookie有时效性，如果登录失效需要重新获取</li>
                    <li>• 建议定期更新Cookie以确保功能正常</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => copyToClipboard('https://newjwc.tyust.edu.cn')}
                className="flex items-center space-x-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span>复制选课系统链接</span>
              </Button>
              {onClose && (
                <Button onClick={onClose}>
                  我知道了
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
