import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// 公告数据结构
export interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'error' | 'success'
  priority: 'low' | 'normal' | 'high'
  createdAt: number
  updatedAt: number
  expiresAt?: number // 过期时间（可选）
  isActive: boolean
}

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
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json')

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

// 从文件加载公告
async function loadAnnouncements(): Promise<Announcement[]> {
  try {
    // 尝试确保目录存在，但不抛出错误（允许目录创建失败）
    try {
      await ensureDataDir()
    } catch (dirError: any) {
      console.warn('⚠️ 数据目录可能不存在或无法创建，尝试继续:', dirError?.message)
      // 继续执行，尝试读取文件（如果文件在其他位置）
    }
    
    if (existsSync(ANNOUNCEMENTS_FILE)) {
      const content = await readFile(ANNOUNCEMENTS_FILE, 'utf-8')
      const data = JSON.parse(content)
      return data.announcements || []
    }
    // 文件不存在是正常情况（首次运行），返回空数组
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    // 文件不存在（ENOENT）是正常情况，不记录错误
    if (error?.code === 'ENOENT') {
      return []
    }
    console.error('⚠️ 加载公告数据失败:', {
      file: ANNOUNCEMENTS_FILE,
      dir: DATA_DIR,
      error: errorMessage,
      code: error?.code
    })
  }
  return []
}

// 保存公告到文件
async function saveAnnouncements(announcements: Announcement[]) {
  try {
    await ensureDataDir()
    const data = {
      announcements,
      lastUpdated: Date.now()
    }
    await writeFile(ANNOUNCEMENTS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('📢 公告数据已保存到文件:', ANNOUNCEMENTS_FILE)
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error('❌ 保存公告数据失败:', {
      file: ANNOUNCEMENTS_FILE,
      dir: DATA_DIR,
      error: errorMessage,
      code: error?.code
    })
    throw new Error(`保存公告数据失败: ${errorMessage}. 目录: ${DATA_DIR}`)
  }
}

// 获取下一个公告ID
async function getNextAnnouncementId(): Promise<number> {
  const announcements = await loadAnnouncements()
  if (announcements.length === 0) return 1
  const maxId = Math.max(...announcements.map(a => {
    const match = a.id.match(/announcement-(\d+)/)
    return match ? parseInt(match[1]) : 0
  }))
  return maxId + 1
}

// 服务器端存储（内存存储 + 文件持久化）
let announcements: Announcement[] = []
let isLoaded = false

// 初始化加载
async function initAnnouncements() {
  // 始终从文件加载最新数据，确保数据一致性
  announcements = await loadAnnouncements()
  isLoaded = true
  console.log('📢 已加载公告数据:', announcements.length, '条')
  return announcements
}

// GET: 获取所有公告（公开接口）
export async function GET(request: NextRequest) {
  try {
    await initAnnouncements()
    
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    
    let result = activeOnly 
      ? announcements.filter(a => {
          // 过滤：只返回活跃的且未过期的公告
          if (!a.isActive) return false
          if (a.expiresAt && a.expiresAt < Date.now()) return false
          return true
        })
      : announcements

    // 按优先级和创建时间排序（高优先级在前，新公告在前）
    result = result.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 }
      if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return b.createdAt - a.createdAt
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('获取公告失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取公告失败'
    }, { status: 500 })
  }
}

// POST: 创建或更新公告（需要管理员权限）
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminToken = request.headers.get('x-admin-token')
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'
    if (!adminToken || adminToken !== validToken) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '需要管理员权限'
      }, { status: 401 })
    }

    const body = await request.json()
    const { action, announcement } = body

    if (action === 'create') {
      if (!announcement.title || !announcement.content) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '标题和内容不能为空'
        }, { status: 400 })
      }

      await initAnnouncements()
      
      const nextId = await getNextAnnouncementId()
      const newAnnouncement: Announcement = {
        id: `announcement-${nextId}`,
        title: announcement.title,
        content: announcement.content,
        type: announcement.type || 'info',
        priority: announcement.priority || 'normal',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        expiresAt: announcement.expiresAt || undefined,
        isActive: announcement.isActive !== false
      }

      announcements.push(newAnnouncement)
      await saveAnnouncements(announcements)
      console.log('📢 公告已创建并保存:', newAnnouncement.id)

      return NextResponse.json({
        success: true,
        message: '公告创建成功',
        data: newAnnouncement
      })
    }

    if (action === 'update') {
      if (!announcement.id) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '公告ID不能为空'
        }, { status: 400 })
      }

      await initAnnouncements()

      const index = announcements.findIndex(a => a.id === announcement.id)
      if (index === -1) {
        return NextResponse.json({
          success: false,
          error: '公告不存在',
          message: `找不到ID为 "${announcement.id}" 的公告`
        }, { status: 404 })
      }

      announcements[index] = {
        ...announcements[index],
        ...announcement,
        updatedAt: Date.now()
      }
      
      await saveAnnouncements(announcements)
      console.log('📢 公告已更新并保存:', announcement.id)

      return NextResponse.json({
        success: true,
        message: '公告更新成功',
        data: announcements[index]
      })
    }

    if (action === 'delete') {
      if (!announcement.id) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '公告ID不能为空'
        }, { status: 400 })
      }

      await initAnnouncements()

      announcements = announcements.filter(a => a.id !== announcement.id)
      await saveAnnouncements(announcements)
      console.log('📢 公告已删除并保存:', announcement.id)

      return NextResponse.json({
        success: true,
        message: '公告删除成功'
      })
    }

    return NextResponse.json({
      success: false,
      error: '未知操作',
      message: `未知的操作类型: ${action}`
    }, { status: 400 })

  } catch (error: any) {
    console.error('操作公告失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '操作失败'
    }, { status: 500 })
  }
}
