'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { School, ChevronDown, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SUPPORTED_SCHOOLS, getCurrentSchool, saveCurrentSchool, type SchoolConfig } from '@/lib/school-config'
import { updateSchoolConfig } from '@/lib/course-api'

interface SchoolSelectorProps {
  onSchoolChange?: (school: SchoolConfig) => void
}

export default function SchoolSelector({ onSchoolChange }: SchoolSelectorProps) {
  const [selectedSchool, setSelectedSchool] = useState<SchoolConfig>(getCurrentSchool())
  const [isOpen, setIsOpen] = useState(false)

  // 处理学校切换
  const handleSchoolChange = (school: SchoolConfig) => {
    setSelectedSchool(school)
    saveCurrentSchool(school)
    updateSchoolConfig(school.id)
    setIsOpen(false)

    // 通知父组件学校已更改
    if (onSchoolChange) {
      onSchoolChange(school)
    }

    console.log(`🏫 已切换到: ${school.name}`)
  }

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="glass w-full sm:w-72 shadow-2xl border border-white/10 overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-4">
              {/* 标题 - 使用渐变文字 */}
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <School className="h-5 w-5 text-blue-400" />
                </motion.div>
                <h3 className="text-sm font-semibold text-white">学校选择</h3>
                <Sparkles className="h-4 w-4 text-purple-400 ml-auto" />
              </div>

              {/* 当前选中的学校 - 玻璃态卡片 */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 font-medium">当前学校</div>
                <motion.div
                  className="relative group cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsOpen(!isOpen)}
                >
                  {/* 渐变边框效果 */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-300"></div>

                  <div className="relative flex items-center justify-between p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-white/20 backdrop-blur-sm">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
                        {selectedSchool.name}
                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                          在线
                        </span>
                      </div>
                      <div className="text-xs text-blue-300/80 truncate mt-0.5">
                        {selectedSchool.domain}
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="ml-2"
                    >
                      <ChevronDown className="h-4 w-4 text-blue-400" />
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              {/* 学校列表 - 展开动画 */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.3, ease: "easeInOut" },
                      opacity: { duration: 0.2 }
                    }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-3 border-t border-white/10">
                      {SUPPORTED_SCHOOLS.map((school, index) => {
                        const isSelected = selectedSchool.id === school.id

                        return (
                          <motion.div
                            key={school.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{
                              duration: 0.2,
                              delay: index * 0.05
                            }}
                          >
                            <Button
                              onClick={() => handleSchoolChange(school)}
                              variant="ghost"
                              className={`
                                w-full justify-start p-3 h-auto rounded-lg
                                transition-all duration-200 group
                                ${isSelected
                                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20'
                                  : 'hover:bg-white/5 text-gray-300 hover:text-white border border-transparent hover:border-white/10'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex-1 min-w-0 text-left">
                                  <div className={`text-sm font-medium truncate ${isSelected ? 'text-green-300' : ''}`}>
                                    {school.name}
                                  </div>
                                  <div className={`text-xs truncate mt-0.5 ${isSelected ? 'text-green-400/70' : 'text-gray-500'}`}>
                                    {school.domain}
                                  </div>
                                </div>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 500,
                                      damping: 15
                                    }}
                                    className="ml-2"
                                  >
                                    <div className="relative">
                                      <div className="absolute inset-0 bg-green-400 rounded-full blur-sm opacity-50"></div>
                                      <Check className="h-4 w-4 text-green-400 relative" />
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </Button>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 提示信息 - 玻璃态警告框 */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: 0.2 }}
                    className="relative group"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                    <div className="relative text-xs text-yellow-300/90 bg-yellow-500/10 p-2.5 rounded-lg border border-yellow-500/20 backdrop-blur-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-400 mt-0.5">💡</span>
                        <span>切换学校后需要重新登录获取Cookie</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
