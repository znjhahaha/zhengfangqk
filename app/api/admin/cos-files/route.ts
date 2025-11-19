import { NextRequest, NextResponse } from 'next/server'
import { isCosEnabled, getCosInstance, getCosConfig } from '@/lib/cos-storage'
import path from 'path'

interface CosFile {
  key: string
  name: string
  size: number
  lastModified: number
  contentType?: string
}

// 强制动态渲染（避免静态导出问题）
export const dynamic = 'force-dynamic'

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

    // 使用 COS getBucket API 获取文件列表
    const cos = getCosInstance()
    const config = getCosConfig()!
    const prefix = 'qiangke-data/' // 数据文件前缀

    console.log(`🔍 开始获取 COS 文件列表，Bucket: ${config.Bucket}, Region: ${config.Region}, Prefix: ${prefix}`)

    const result = await new Promise<any>((resolve, reject) => {
      cos.getBucket({
        Bucket: config.Bucket,
        Region: config.Region,
        Prefix: prefix,
        MaxKeys: 1000 // 最多返回1000个文件
      }, (err: any, data: any) => {
        if (err) {
          console.error('❌ COS getBucket 失败:', err)
          reject(err)
        } else {
          console.log(`✅ COS getBucket 成功，返回 ${data.Contents?.length || 0} 个文件`)
          resolve(data)
        }
      })
    })

    const files: CosFile[] = (result.Contents || [])
      .filter((item: any) => {
        // 过滤掉文件夹本身（Key 等于 prefix 的项）
        return item.Key !== prefix && item.Key.endsWith('.json')
      })
      .map((item: any) => ({
        key: item.Key,
        name: path.basename(item.Key),
        size: parseInt(item.Size) || 0,
        lastModified: item.LastModified ? new Date(item.LastModified).getTime() : Date.now(),
        contentType: item.ETag ? 'application/json' : undefined
      }))
      .sort((a: CosFile, b: CosFile) => b.lastModified - a.lastModified) // 按最新修改时间排序

    console.log(`✅ 处理后的文件列表: ${files.length} 个文件`)

    return NextResponse.json({
      success: true,
      data: files,
      total: files.length,
      baseDir: prefix,
      bucket: config.Bucket,
      region: config.Region
    })
  } catch (error: any) {
    console.error('❌ 获取 COS 文件列表失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取文件列表失败',
      message: error.message || '获取 COS 文件列表时发生错误'
    }, { status: 500 })
  }
}

