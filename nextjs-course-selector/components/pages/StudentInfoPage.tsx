'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  User, 
  Calendar, 
  BookOpen, 
  MapPin, 
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { courseAPI } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface StudentInfo {
  student_id?: string
  name?: string
  grade?: string
  major?: string
  college?: string
  class_name?: string
  academic_year?: string
  semester?: string
  njdm_id?: string
  zyh_id?: string
}

export default function StudentInfoPage() {
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({})
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // 获取学生信息
  const fetchStudentInfo = async () => {
    setIsLoading(true)
    try {
      const { getCurrentSchool } = require('@/lib/global-school-state')
      const currentSchool = getCurrentSchool()
      const response = await courseAPI.getStudentInfo(undefined, currentSchool.id) as any
      if (response.success) {
        setStudentInfo(response.data)
        setLastUpdated(new Date().toISOString())
        toast.success('学生信息获取成功')
      } else {
        toast.error(response.error || '获取学生信息失败')
      }
    } catch (error: any) {
      const errorMessage = error.message || '获取学生信息失败'
      if (errorMessage.includes('Cookie未设置')) {
        toast.error('请先配置Cookie', {
          duration: 5000
        })
      } else {
        toast.error(errorMessage)
      }
      console.error('获取学生信息失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 导出学生信息
  const exportStudentInfo = () => {
    const infoText = `学生信息导出
导出时间: ${formatDate(new Date())}

基本信息:
学号: ${studentInfo.student_id || '未知'}
姓名: ${studentInfo.name || '未知'}
年级: ${studentInfo.grade || '未知'}
专业: ${studentInfo.major || '未知'}
学院: ${studentInfo.college || '未知'}
班级: ${studentInfo.class_name || '未知'}

学籍信息:
学年: ${studentInfo.academic_year || '未知'}
学期: ${studentInfo.semester || '未知'}
年级代码: ${studentInfo.njdm_id || '未知'}
专业代码: ${studentInfo.zyh_id || '未知'}
`

    const blob = new Blob([infoText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `学生信息_${studentInfo.student_id || 'unknown'}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('学生信息导出成功')
  }

  // 计算信息完整度
  const getCompletenessPercentage = () => {
    const fields = [
      'student_id', 'name', 'grade', 'major', 'college', 
      'class_name', 'academic_year', 'semester', 'njdm_id', 'zyh_id'
    ]
    const filledFields = fields.filter(field => studentInfo[field as keyof StudentInfo])
    return Math.round((filledFields.length / fields.length) * 100)
  }

  const completeness = getCompletenessPercentage()

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">🎓 学生信息</h2>
          <p className="text-muted-foreground">查看和管理您的学生基本信息</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={fetchStudentInfo}
            disabled={isLoading}
            variant="outline"
            className="btn-hover"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            刷新信息
          </Button>
          <Button
            onClick={exportStudentInfo}
            disabled={Object.keys(studentInfo).length === 0}
            className="btn-hover"
          >
            <Download className="h-4 w-4 mr-2" />
            导出信息
          </Button>
        </div>
      </motion.div>

      {/* 信息完整度统计 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span>信息完整度统计</span>
            </CardTitle>
            <CardDescription>
              当前学生信息的完整程度
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">完整度</span>
                <span className="text-sm text-muted-foreground">{completeness}%</span>
              </div>
              <Progress value={completeness} className="h-2" />
              <div className="flex items-center space-x-2 text-sm">
                {completeness >= 80 ? (
                  <div className="flex items-center space-x-1 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span>信息完整</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>信息不完整，建议刷新</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 学生信息展示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 基本信息 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass card-hover">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>基本信息</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoItem
                label="学号"
                value={studentInfo.student_id}
                icon={<User className="h-4 w-4" />}
              />
              <InfoItem
                label="姓名"
                value={studentInfo.name}
                icon={<User className="h-4 w-4" />}
              />
              <InfoItem
                label="年级"
                value={studentInfo.grade}
                icon={<Calendar className="h-4 w-4" />}
              />
              <InfoItem
                label="专业"
                value={studentInfo.major}
                icon={<BookOpen className="h-4 w-4" />}
              />
              <InfoItem
                label="学院"
                value={studentInfo.college}
                icon={<MapPin className="h-4 w-4" />}
              />
              <InfoItem
                label="班级"
                value={studentInfo.class_name}
                icon={<BookOpen className="h-4 w-4" />}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* 学籍信息 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass card-hover">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>学籍信息</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoItem
                label="学年"
                value={studentInfo.academic_year}
                icon={<Calendar className="h-4 w-4" />}
              />
              <InfoItem
                label="学期"
                value={studentInfo.semester}
                icon={<Calendar className="h-4 w-4" />}
              />
              <InfoItem
                label="年级代码"
                value={studentInfo.njdm_id}
                icon={<BookOpen className="h-4 w-4" />}
              />
              <InfoItem
                label="专业代码"
                value={studentInfo.zyh_id}
                icon={<BookOpen className="h-4 w-4" />}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 最后更新时间 */}
      {lastUpdated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground"
        >
          最后更新: {formatDate(lastUpdated)}
        </motion.div>
      )}
    </div>
  )
}

// 信息项组件
function InfoItem({ 
  label, 
  value, 
  icon 
}: { 
  label: string
  value?: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center space-x-3">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`text-sm font-medium ${value ? 'text-white' : 'text-muted-foreground'}`}>
          {value || '未知'}
        </div>
      </div>
    </div>
  )
}
