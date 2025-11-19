'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { School, ChevronDown, Check } from 'lucide-react'
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
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass w-64 shadow-lg border border-white/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* 标题 */}
              <div className="flex items-center space-x-2">
                <School className="h-5 w-5 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-700">学校选择</h3>
              </div>
              
              {/* 当前选中的学校 */}
              <div className="space-y-2">
                <div className="text-xs text-gray-500">当前学校</div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-blue-900 truncate">
                      {selectedSchool.name}
                    </div>
                    <div className="text-xs text-blue-600 truncate">
                      {selectedSchool.domain}
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsOpen(!isOpen)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-2"
                  >
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  </Button>
                </div>
              </div>
              
              {/* 学校列表 */}
              <motion.div
                initial={false}
                animate={{
                  height: isOpen ? 'auto' : 0,
                  opacity: isOpen ? 1 : 0
                }}
                transition={{
                  height: { duration: 0.3, ease: "easeInOut" },
                  opacity: { duration: 0.2, ease: "easeInOut" }
                }}
                className="overflow-hidden"
              >
                <div className="space-y-1 pt-2 border-t border-gray-200">
                  {SUPPORTED_SCHOOLS.map((school, index) => (
                    <motion.div
                      key={school.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: isOpen ? 1 : 0, 
                        y: isOpen ? 0 : 10 
                      }}
                      transition={{ 
                        duration: 0.2,
                        delay: isOpen ? index * 0.05 : 0
                      }}
                    >
                      <Button
                        onClick={() => handleSchoolChange(school)}
                        variant="ghost"
                        className={`w-full justify-start p-2 h-auto ${
                          selectedSchool.id === school.id 
                            ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 w-full">
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-sm font-medium truncate">
                              {school.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {school.domain}
                            </div>
                          </div>
                          {selectedSchool.id === school.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </motion.div>
                          )}
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              
              {/* 提示信息 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isOpen ? 1 : 0 }}
                transition={{ delay: isOpen ? 0.2 : 0 }}
                className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200"
              >
                💡 切换学校后需要重新登录获取Cookie
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
