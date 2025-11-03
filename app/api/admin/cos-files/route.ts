import { NextRequest, NextResponse } from 'next/server'
import { isCosEnabled, loadFromCos } from '@/lib/cos-storage'
import path from 'path'

interface CosFile {
  key: string
  name: string
  size: number
  lastModified: number
  contentType?: string
}

// GET: 获取 COS 存储桶中的文件列表
export async function GET(request: NextRequest) {
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

    if (!isCosEnabled()) {
      return NextResponse.json({
        success: false,
        error: 'COS 未配置',
        message: 'COS 存储未启用'
      }, { status: 400 })
    }

    // 尝试加载所有已知的数据文件来验证 COS 连接
    const knownFiles = [
      'announcements.json',
      'suggestions.json',
      'schools.json',
      'url-configs.json',
      'announcement-confirmations.json'
    ]

    const files: CosFile[] = []
    const baseDir = 'qiangke-data'

    for (const fileName of knownFiles) {
      try {
        const cosKey = `${baseDir}/${fileName}`
        const data = await loadFromCos(cosKey)
        
        if (data !== null) {
          // 文件存在，获取文件信息
          files.push({
            key: cosKey,
            name: fileName,
            size: JSON.stringify(data).length, // 估算大小
            lastModified: data.lastUpdated || Date.now(),
            contentType: 'application/json'
          })
        }
      } catch (error: any) {
        // 文件不存在或加载失败，跳过
        console.log(`文件 ${fileName} 不存在或加载失败:`, error?.message)
      }
    }

    return NextResponse.json({
      success: true,
      data: files,
      total: files.length,
      baseDir
    })
  } catch (error: any) {
    console.error('获取 COS 文件列表失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取文件列表失败'
    }, { status: 500 })
  }
}

