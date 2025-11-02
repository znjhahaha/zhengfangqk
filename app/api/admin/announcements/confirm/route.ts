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
const CONFIRMATIONS_FILE = path.join(DATA_DIR, 'announcement-confirmations.json')

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

// 从文件加载确认记录
async function loadConfirmations(): Promise<Confirmation[]> {
  try {
    // 尝试确保目录存在，但不抛出错误（允许目录创建失败）
    try {
      await ensureDataDir()
    } catch (dirError: any) {
      console.warn('⚠️ 数据目录可能不存在或无法创建，尝试继续:', dirError?.message)
      // 继续执行，尝试读取文件（如果文件在其他位置）
    }
    
    if (existsSync(CONFIRMATIONS_FILE)) {
      const content = await readFile(CONFIRMATIONS_FILE, 'utf-8')
      const data = JSON.parse(content)
      return data.confirmations || []
    }
    // 文件不存在是正常情况（首次运行），返回空数组
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    // 文件不存在（ENOENT）是正常情况，不记录错误
    if (error?.code === 'ENOENT') {
      return []
    }
    console.error('⚠️ 加载确认记录失败:', {
      file: CONFIRMATIONS_FILE,
      dir: DATA_DIR,
      error: errorMessage,
      code: error?.code
    })
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
    console.log('✅ 确认记录已保存到文件:', CONFIRMATIONS_FILE)
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error('❌ 保存确认记录失败:', {
      file: CONFIRMATIONS_FILE,
      dir: DATA_DIR,
      error: errorMessage,
      code: error?.code
    })
    throw new Error(`保存确认记录失败: ${errorMessage}. 目录: ${DATA_DIR}`)
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

