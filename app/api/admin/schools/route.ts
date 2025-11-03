import { NextRequest, NextResponse } from 'next/server'
import { SchoolConfig } from '@/lib/admin-school-manager'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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

// 数据存储路径 - 优先使用项目目录，如果不可写则使用 /tmp
function getDataDir() {
  const projectDataDir = path.join(process.cwd(), 'data')
  // 检查项目目录是否可写，如果不可写则使用 /tmp
  try {
    if (existsSync(projectDataDir)) {
      return projectDataDir
    }
  } catch (error) {
    console.warn('无法访问项目数据目录，尝试使用 /tmp:', error)
  }
  
  // 在云环境中，/tmp 通常是唯一可写的目录
  const tmpDir = process.platform === 'win32' 
    ? path.join(process.env.TEMP || process.env.TMP || process.cwd(), 'data')
    : path.join('/tmp', 'qiangke-data')
  
  return tmpDir
}

const DATA_DIR = getDataDir()
const SCHOOLS_FILE = path.join(DATA_DIR, 'schools.json')
const URL_CONFIGS_FILE = path.join(DATA_DIR, 'url-configs.json')

// 确保数据目录存在
async function ensureDataDir() {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true })
      console.log('✅ 数据目录已创建:', DATA_DIR)
    }
  } catch (error: any) {
    console.error('❌ 无法创建数据目录:', DATA_DIR, error)
    throw new Error(`无法创建数据目录: ${error.message}`)
  }
}

// 从文件加载学校列表
async function loadSchools(): Promise<SchoolConfig[]> {
  try {
    // 尝试确保目录存在，但不抛出错误（允许目录创建失败）
    try {
      await ensureDataDir()
    } catch (dirError: any) {
      console.warn('⚠️ 数据目录可能不存在或无法创建，尝试继续:', dirError?.message)
    }
    
    if (existsSync(SCHOOLS_FILE)) {
      const content = await readFile(SCHOOLS_FILE, 'utf-8')
      const data = JSON.parse(content)
      return data.schools || []
    }
    // 文件不存在是正常情况（首次运行），返回默认学校
    return [...defaultSchools]
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    // 文件不存在（ENOENT）是正常情况，返回默认学校
    if (error?.code === 'ENOENT') {
      return [...defaultSchools]
    }
    console.error('⚠️ 加载学校数据失败:', {
      file: SCHOOLS_FILE,
      dir: DATA_DIR,
      error: errorMessage,
      code: error?.code
    })
    // 出错时返回默认学校
    return [...defaultSchools]
  }
}

// 保存学校列表到文件
async function saveSchools(schools: SchoolConfig[]) {
  try {
    await ensureDataDir()
    const data = {
      schools,
      lastUpdated: Date.now()
    }
    await writeFile(SCHOOLS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('✅ 学校数据已保存到文件:', SCHOOLS_FILE)
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error('❌ 保存学校数据失败:', {
      file: SCHOOLS_FILE,
      dir: DATA_DIR,
      error: errorMessage,
      code: error?.code
    })
    throw new Error(`保存学校数据失败: ${errorMessage}. 目录: ${DATA_DIR}`)
  }
}

// 从文件加载URL配置
async function loadUrlConfigs(): Promise<Record<string, any>> {
  try {
    try {
      await ensureDataDir()
    } catch (dirError: any) {
      console.warn('⚠️ 数据目录可能不存在或无法创建，尝试继续:', dirError?.message)
    }
    
    if (existsSync(URL_CONFIGS_FILE)) {
      const content = await readFile(URL_CONFIGS_FILE, 'utf-8')
      const data = JSON.parse(content)
      return data.urlConfigs || {}
    }
    return {}
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return {}
    }
    console.error('⚠️ 加载URL配置失败:', {
      file: URL_CONFIGS_FILE,
      dir: DATA_DIR,
      error: error?.message,
      code: error?.code
    })
    return {}
  }
}

// 保存URL配置到文件
async function saveUrlConfigs(urlConfigs: Record<string, any>) {
  try {
    await ensureDataDir()
    const data = {
      urlConfigs,
      lastUpdated: Date.now()
    }
    await writeFile(URL_CONFIGS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('✅ URL配置已保存到文件:', URL_CONFIGS_FILE)
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error('❌ 保存URL配置失败:', {
      file: URL_CONFIGS_FILE,
      dir: DATA_DIR,
      error: errorMessage,
      code: error?.code
    })
    throw new Error(`保存URL配置失败: ${errorMessage}. 目录: ${DATA_DIR}`)
  }
}

// 服务器端存储（内存缓存 + 文件持久化）
let serverSchools: SchoolConfig[] = []
let serverUrlConfigs: Record<string, any> = {}
let lastUpdateTime = Date.now()
let isLoaded = false

// 初始化加载
async function initSchools() {
  // 始终从文件加载最新数据，确保数据一致性
  serverSchools = await loadSchools()
  serverUrlConfigs = await loadUrlConfigs()
  isLoaded = true
  lastUpdateTime = Date.now()
  console.log('🏫 已加载学校数据:', serverSchools.length, '所学校')
  return { schools: serverSchools, configs: serverUrlConfigs }
}

// GET: 获取所有学校列表
export async function GET(request: NextRequest) {
  try {
    // 确保数据已加载
    await initSchools()
    
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

      // 确保数据已加载
      await initSchools()
      
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

      // 保存到文件系统
      await saveSchools(serverSchools)
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

      // 确保数据已加载
      await initSchools()

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
      
      // 保存到文件系统
      await saveSchools(serverSchools)
      await saveUrlConfigs(serverUrlConfigs)
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

      // 确保数据已加载
      await initSchools()

      serverUrlConfigs[schoolId] = urlConfig
      
      // 保存到文件系统
      await saveUrlConfigs(serverUrlConfigs)
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

