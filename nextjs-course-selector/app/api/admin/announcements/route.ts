import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { getDataDir, loadDataFromFile, saveDataToFile } from '@/lib/data-storage'

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

// 数据目录和文件路径（延迟初始化）
let DATA_DIR: string | null = null
let ANNOUNCEMENTS_FILE: string | null = null

// 初始化数据目录和文件路径
async function initDataPaths() {
  if (!DATA_DIR) {
    DATA_DIR = await getDataDir()
    ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json')
  }
  return { dataDir: DATA_DIR, filePath: ANNOUNCEMENTS_FILE! }
}

// 从文件加载公告
async function loadAnnouncements(): Promise<Announcement[]> {
  const { filePath } = await initDataPaths()
  return loadDataFromFile<Announcement>(filePath, 'announcements', [])
}

// 保存公告到文件
async function saveAnnouncements(announcements: Announcement[]) {
  const { dataDir, filePath } = await initDataPaths()
  await saveDataToFile<Announcement>(filePath, 'announcements', announcements, dataDir)
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

// 强制动态渲染（避免静态导出问题）
export const dynamic = 'force-dynamic'

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
