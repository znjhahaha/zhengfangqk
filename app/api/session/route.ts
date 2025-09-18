import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie, getSessionCookie, deleteSessionCookie } from '@/lib/course-api'

// 创建新会话
export async function POST(request: NextRequest) {
  try {
    const { cookie } = await request.json()
    
    if (!cookie) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cookie不能为空' 
      }, { status: 400 })
    }

    // 生成会话ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 设置会话Cookie
    setSessionCookie(sessionId, cookie)
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        message: '会话创建成功'
      }
    })
  } catch (error) {
    console.error('创建会话失败:', error)
    return NextResponse.json({
      success: false,
      error: '创建会话失败'
    }, { status: 500 })
  }
}

// 获取会话信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '缺少会话ID'
      }, { status: 400 })
    }

    const cookie = getSessionCookie(sessionId)
    
    if (!cookie) {
      return NextResponse.json({
        success: false,
        error: '会话不存在或已过期'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        hasCookie: true,
        cookieLength: cookie.length
      }
    })
  } catch (error) {
    console.error('获取会话失败:', error)
    return NextResponse.json({
      success: false,
      error: '获取会话失败'
    }, { status: 500 })
  }
}

// 删除会话
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '缺少会话ID'
      }, { status: 400 })
    }

    deleteSessionCookie(sessionId)
    
    return NextResponse.json({
      success: true,
      data: {
        message: '会话删除成功'
      }
    })
  } catch (error) {
    console.error('删除会话失败:', error)
    return NextResponse.json({
      success: false,
      error: '删除会话失败'
    }, { status: 500 })
  }
}
