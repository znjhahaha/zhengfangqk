import { NextRequest, NextResponse } from 'next/server'
import { SchoolConfig } from '@/lib/admin-school-manager'

// 服务器端存储（使用内存存储，如果服务器重启会丢失，但可以通过文件系统持久化）
// 在生产环境中，建议使用数据库或外部存储服务
let serverSchools: SchoolConfig[] = []
let serverUrlConfigs: Record<string, any> = {}
let lastUpdateTime = Date.now()

// 初始化默认学校
const defaultSchools: SchoolConfig[] = [
  {
    id: 'tyust',
    name: '太原科技大学',
    domain: 'newjwc.tyust.edu.cn',
    protocol: 'https',
    description: '太原科技大学教务系统'
  },
  {
    id: 'zjut',
    name: '浙江工业大学',
    domain: 'www.gdjw.zjut.edu.cn',
    protocol: 'http',
    description: '浙江工业大学教务系统'
  }
]

// 初始化
if (serverSchools.length === 0) {
  serverSchools = [...defaultSchools]
}

// GET: 获取所有学校列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lastSync = searchParams.get('lastSync')
    
    return NextResponse.json({
      success: true,
      data: serverSchools,
      urlConfigs: serverUrlConfigs,
      lastUpdateTime,
      hasUpdate: lastSync ? parseInt(lastSync) < lastUpdateTime : true
    })
  } catch (error: any) {
    console.error('获取学校列表失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取学校列表失败'
    }, { status: 500 })
  }
}

// POST: 添加或更新学校（需要管理员权限）
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限（使用请求头中的管理员令牌）
    const adminToken = request.headers.get('x-admin-token')
    
    // 简单的权限验证（生产环境应使用更安全的验证方式）
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'
    if (adminToken !== validToken) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '需要管理员权限'
      }, { status: 401 })
    }

    const body = await request.json()
    const { action, school, schoolId, urlConfig } = body

    if (action === 'add' || action === 'update') {
      if (!school) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '学校信息不能为空'
        }, { status: 400 })
      }

      const schoolData: SchoolConfig = {
        id: school.id,
        name: school.name,
        domain: school.domain,
        protocol: school.protocol || 'https',
        description: school.description || ''
      }

      if (action === 'add') {
        // 检查ID是否已存在
        if (serverSchools.some(s => s.id === schoolData.id)) {
          return NextResponse.json({
            success: false,
            error: '学校已存在',
            message: `学校ID "${schoolData.id}" 已存在`
          }, { status: 400 })
        }
        serverSchools.push(schoolData)
      } else {
        // 更新
        const index = serverSchools.findIndex(s => s.id === (schoolId || schoolData.id))
        if (index >= 0) {
          serverSchools[index] = schoolData
        } else {
          serverSchools.push(schoolData)
        }
      }

      lastUpdateTime = Date.now()
      
      return NextResponse.json({
        success: true,
        message: `学校 "${schoolData.name}" ${action === 'add' ? '已添加' : '已更新'}`,
        data: schoolData,
        lastUpdateTime
      })
    }

    if (action === 'delete') {
      if (!schoolId) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '学校ID不能为空'
        }, { status: 400 })
      }

      // 不能删除默认学校
      const isDefault = defaultSchools.some(s => s.id === schoolId)
      if (isDefault) {
        return NextResponse.json({
          success: false,
          error: '无法删除默认学校',
          message: '不能删除默认学校'
        }, { status: 400 })
      }

      serverSchools = serverSchools.filter(s => s.id !== schoolId)
      delete serverUrlConfigs[schoolId]
      lastUpdateTime = Date.now()

      return NextResponse.json({
        success: true,
        message: `学校已删除`,
        lastUpdateTime
      })
    }

    if (action === 'setUrlConfig') {
      if (!schoolId || !urlConfig) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '学校ID和URL配置不能为空'
        }, { status: 400 })
      }

      serverUrlConfigs[schoolId] = urlConfig
      lastUpdateTime = Date.now()

      return NextResponse.json({
        success: true,
        message: 'URL配置已更新',
        lastUpdateTime
      })
    }

    return NextResponse.json({
      success: false,
      error: '未知操作',
      message: `未知的操作类型: ${action}`
    }, { status: 400 })

  } catch (error: any) {
    console.error('操作学校失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '操作失败'
    }, { status: 500 })
  }
}

