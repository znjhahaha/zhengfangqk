import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// 建议数据结构
export interface Suggestion {
  id: string
  type: 'school' | 'bug' | 'feature' | 'other'
  title: string
  content: string
  contact?: string // 联系方式（可选）
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'completed'
  createdAt: number
  updatedAt: number
  reviewedBy?: string // 审核人（管理员）
  reviewNote?: string // 审核备注
}

// 数据存储路径
const DATA_DIR = path.join(process.cwd(), 'data')
const SUGGESTIONS_FILE = path.join(DATA_DIR, 'suggestions.json')

// 确保数据目录存在
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

// 从文件加载建议
async function loadSuggestions(): Promise<Suggestion[]> {
  try {
    await ensureDataDir()
    if (existsSync(SUGGESTIONS_FILE)) {
      const content = await readFile(SUGGESTIONS_FILE, 'utf-8')
      const data = JSON.parse(content)
      return data.suggestions || []
    }
  } catch (error) {
    console.error('加载建议数据失败:', error)
  }
  return []
}

// 保存建议到文件
async function saveSuggestions(suggestions: Suggestion[]) {
  try {
    await ensureDataDir()
    const data = {
      suggestions,
      lastUpdated: Date.now()
    }
    await writeFile(SUGGESTIONS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('💡 建议数据已保存到文件:', SUGGESTIONS_FILE)
  } catch (error) {
    console.error('保存建议数据失败:', error)
    throw error
  }
}

// 获取下一个建议ID
async function getNextSuggestionId(): Promise<number> {
  const suggestions = await loadSuggestions()
  if (suggestions.length === 0) return 1
  const maxId = Math.max(...suggestions.map(s => {
    const match = s.id.match(/suggestion-(\d+)/)
    return match ? parseInt(match[1]) : 0
  }))
  return maxId + 1
}

// 服务器端存储（内存存储 + 文件持久化）
let suggestions: Suggestion[] = []
let isLoaded = false

// 初始化加载
async function initSuggestions() {
  if (!isLoaded) {
    suggestions = await loadSuggestions()
    isLoaded = true
    console.log('💡 已加载建议数据:', suggestions.length, '条')
  } else {
    // 如果已经加载过，重新加载以确保数据最新
    const freshData = await loadSuggestions()
    suggestions = freshData
  }
  return suggestions
}

// GET: 获取所有建议（需要管理员权限查看全部，普通用户只能查看自己的）
export async function GET(request: NextRequest) {
  try {
    await initSuggestions()
    
    // 验证管理员权限（如果是管理员，返回所有建议）
    const adminToken = request.headers.get('x-admin-token')
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'
    const isAdmin = adminToken === validToken

    if (isAdmin) {
      // 管理员：返回所有建议，按状态和时间排序
      const sorted = suggestions.sort((a, b) => {
        const statusOrder = { pending: 5, reviewing: 4, approved: 3, rejected: 2, completed: 1 }
        if (statusOrder[b.status] !== statusOrder[a.status]) {
          return statusOrder[b.status] - statusOrder[a.status]
        }
        return b.createdAt - a.createdAt
      })

      return NextResponse.json({
        success: true,
        data: sorted,
        isAdmin: true
      })
    } else {
      // 普通用户：只返回自己的建议（通过contact匹配，或者简化处理，返回最近的建议）
      // 这里简化处理，只返回最近的建议
      const recent = suggestions
        .filter(s => s.status === 'pending' || s.status === 'reviewing')
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)

      return NextResponse.json({
        success: true,
        data: recent,
        isAdmin: false
      })
    }
  } catch (error: any) {
    console.error('获取建议失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取建议失败'
    }, { status: 500 })
  }
}

// POST: 创建建议或更新建议状态
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, suggestion } = body

    if (action === 'create') {
      if (!suggestion.title || !suggestion.content) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '标题和内容不能为空'
        }, { status: 400 })
      }

      await initSuggestions()
      
      const nextId = await getNextSuggestionId()
      const newSuggestion: Suggestion = {
        id: `suggestion-${nextId}`,
        type: suggestion.type || 'other',
        title: suggestion.title,
        content: suggestion.content,
        contact: suggestion.contact || '',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      suggestions.push(newSuggestion)
      await saveSuggestions(suggestions)
      console.log('💡 建议已创建并保存:', newSuggestion.id)

      return NextResponse.json({
        success: true,
        message: '建议提交成功，我们会尽快处理',
        data: newSuggestion
      })
    }

    if (action === 'updateStatus') {
      // 更新状态需要管理员权限
      const adminToken = request.headers.get('x-admin-token')
      const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'
      if (!adminToken || adminToken !== validToken) {
        return NextResponse.json({
          success: false,
          error: '未授权',
          message: '需要管理员权限'
        }, { status: 401 })
      }

      if (!suggestion.id || !suggestion.status) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '建议ID和状态不能为空'
        }, { status: 400 })
      }

      await initSuggestions()

      const index = suggestions.findIndex(s => s.id === suggestion.id)
      if (index === -1) {
        return NextResponse.json({
          success: false,
          error: '建议不存在',
          message: `找不到ID为 "${suggestion.id}" 的建议`
        }, { status: 404 })
      }

      suggestions[index] = {
        ...suggestions[index],
        status: suggestion.status,
        reviewedBy: suggestion.reviewedBy || '管理员',
        reviewNote: suggestion.reviewNote || undefined,
        updatedAt: Date.now()
      }
      
      await saveSuggestions(suggestions)
      console.log('💡 建议状态已更新并保存:', suggestion.id)

      return NextResponse.json({
        success: true,
        message: '建议状态更新成功',
        data: suggestions[index]
      })
    }

    if (action === 'delete') {
      // 删除需要管理员权限
      const adminToken = request.headers.get('x-admin-token')
      const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'
      if (!adminToken || adminToken !== validToken) {
        return NextResponse.json({
          success: false,
          error: '未授权',
          message: '需要管理员权限'
        }, { status: 401 })
      }

      if (!suggestion.id) {
        return NextResponse.json({
          success: false,
          error: '参数错误',
          message: '建议ID不能为空'
        }, { status: 400 })
      }

      await initSuggestions()

      suggestions = suggestions.filter(s => s.id !== suggestion.id)
      await saveSuggestions(suggestions)
      console.log('💡 建议已删除并保存:', suggestion.id)

      return NextResponse.json({
        success: true,
        message: '建议删除成功'
      })
    }

    return NextResponse.json({
      success: false,
      error: '未知操作',
      message: `未知的操作类型: ${action}`
    }, { status: 400 })

  } catch (error: any) {
    console.error('操作建议失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '操作失败'
    }, { status: 500 })
  }
}
