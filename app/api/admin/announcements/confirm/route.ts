import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// 确认记录数据结构
interface Confirmation {
  announcementId: string
  userId: string // 使用 sessionStorage 生成的唯一ID
  confirmedAt: number
}

// 数据存储路径
const DATA_DIR = path.join(process.cwd(), 'data')
const CONFIRMATIONS_FILE = path.join(DATA_DIR, 'announcement-confirmations.json')

// 确保数据目录存在
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

// 从文件加载确认记录
async function loadConfirmations(): Promise<Confirmation[]> {
  try {
    await ensureDataDir()
    if (existsSync(CONFIRMATIONS_FILE)) {
      const content = await readFile(CONFIRMATIONS_FILE, 'utf-8')
      const data = JSON.parse(content)
      return data.confirmations || []
    }
  } catch (error) {
    console.error('加载确认记录失败:', error)
  }
  return []
}

// 保存确认记录到文件
async function saveConfirmations(confirmations: Confirmation[]) {
  try {
    await ensureDataDir()
    const data = {
      confirmations,
      lastUpdated: Date.now()
    }
    await writeFile(CONFIRMATIONS_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error('保存确认记录失败:', error)
    throw error
  }
}

// POST: 确认收到公告
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { announcementId, userId } = body

    if (!announcementId || !userId) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '公告ID和用户ID不能为空'
      }, { status: 400 })
    }

    const confirmations = await loadConfirmations()
    
    // 检查是否已经确认过
    const existing = confirmations.find(
      c => c.announcementId === announcementId && c.userId === userId
    )

    if (existing) {
      return NextResponse.json({
        success: true,
        message: '已确认过',
        data: existing
      })
    }

    // 添加新确认记录
    const newConfirmation: Confirmation = {
      announcementId,
      userId,
      confirmedAt: Date.now()
    }

    confirmations.push(newConfirmation)
    await saveConfirmations(confirmations)

    return NextResponse.json({
      success: true,
      message: '确认成功',
      data: newConfirmation
    })
  } catch (error: any) {
    console.error('确认公告失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '操作失败'
    }, { status: 500 })
  }
}

// GET: 获取确认统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const announcementId = searchParams.get('announcementId')

    const confirmations = await loadConfirmations()

    if (announcementId) {
      // 获取特定公告的确认记录
      const filtered = confirmations.filter(c => c.announcementId === announcementId)
      return NextResponse.json({
        success: true,
        data: filtered,
        count: filtered.length
      })
    } else {
      // 获取所有公告的确认统计
      const stats: Record<string, number> = {}
      confirmations.forEach(c => {
        stats[c.announcementId] = (stats[c.announcementId] || 0) + 1
      })
      return NextResponse.json({
        success: true,
        data: stats,
        total: confirmations.length
      })
    }
  } catch (error: any) {
    console.error('获取确认统计失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取失败'
    }, { status: 500 })
  }
}

