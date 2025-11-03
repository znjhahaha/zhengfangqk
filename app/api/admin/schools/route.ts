import { NextRequest, NextResponse } from 'next/server'
import { SchoolConfig } from '@/lib/admin-school-manager'
import path from 'path'
import { getDataDir, loadDataFromFile, saveDataToFile, ensureDataDir } from '@/lib/data-storage'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { isCosEnabled, saveToCos, loadFromCos } from '@/lib/cos-storage'

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

// 数据目录和文件路径（延迟初始化）
let DATA_DIR: string | null = null
let SCHOOLS_FILE: string | null = null
let URL_CONFIGS_FILE: string | null = null

// 初始化数据目录和文件路径
async function initDataPaths() {
  if (!DATA_DIR) {
    DATA_DIR = await getDataDir()
    SCHOOLS_FILE = path.join(DATA_DIR, 'schools.json')
    URL_CONFIGS_FILE = path.join(DATA_DIR, 'url-configs.json')
  }
  return { dataDir: DATA_DIR, schoolsFile: SCHOOLS_FILE!, urlConfigsFile: URL_CONFIGS_FILE! }
}

// 从文件加载学校列表
async function loadSchools(): Promise<SchoolConfig[]> {
  const { schoolsFile } = await initDataPaths()
  const loaded = await loadDataFromFile<SchoolConfig>(schoolsFile, 'schools', [])
  // 如果文件为空，返回默认学校
  return loaded.length > 0 ? loaded : [...defaultSchools]
}

// 保存学校列表到文件
async function saveSchools(schools: SchoolConfig[]) {
  const { dataDir, schoolsFile } = await initDataPaths()
  await saveDataToFile<SchoolConfig>(schoolsFile, 'schools', schools, dataDir)
}

// 从文件或 COS 加载URL配置
async function loadUrlConfigs(): Promise<Record<string, any>> {
  const { urlConfigsFile } = await initDataPaths()
  
  // 优先使用 COS 存储
  if (isCosEnabled()) {
    try {
      const cosKey = `qiangke-data/${path.basename(urlConfigsFile)}`
      const data = await loadFromCos(cosKey)
      if (data && data.urlConfigs) {
        console.log(`✅ 从 COS 加载URL配置: ${cosKey}`)
        return data.urlConfigs
      }
    } catch (error: any) {
      console.warn('⚠️ 从 COS 加载URL配置失败，尝试使用文件系统:', error?.message)
    }
  }

  // 使用文件系统
  try {
    if (existsSync(urlConfigsFile)) {
      const content = await readFile(urlConfigsFile, 'utf-8')
      const data = JSON.parse(content)
      return data.urlConfigs || {}
    }
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error('⚠️ 加载URL配置失败:', {
        file: urlConfigsFile,
        error: error?.message
      })
    }
  }
  return {}
}

// 保存URL配置到文件或 COS
async function saveUrlConfigs(urlConfigs: Record<string, any>) {
  const { dataDir, urlConfigsFile } = await initDataPaths()
  const data = {
    urlConfigs,
    lastUpdated: Date.now()
  }

  // 优先使用 COS 存储
  if (isCosEnabled()) {
    try {
      const cosKey = `qiangke-data/${path.basename(urlConfigsFile)}`
      await saveToCos(cosKey, data)
      console.log(`✅ URL配置已保存到 COS: ${cosKey}`)
      return
    } catch (error: any) {
      console.warn('⚠️ 保存URL配置到 COS 失败，尝试使用文件系统:', error?.message)
    }
  }

  // 使用文件系统
  await ensureDataDir(dataDir)
  await writeFile(urlConfigsFile, JSON.stringify(data, null, 2), 'utf-8')
  console.log('✅ URL配置已保存到文件:', urlConfigsFile)
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

