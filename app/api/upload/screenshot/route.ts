import { NextRequest, NextResponse } from 'next/server'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { image } = body

        if (!image || !image.startsWith('data:image/')) {
            return NextResponse.json({
                success: false,
                message: '无效的图片数据'
            }, { status: 400 })
        }

        // 检查 COS 是否配置
        const { isCosEnabled } = await import('@/lib/cos-storage')

        // 如果 COS 未配置，直接返回 base64（降级方案）
        if (!isCosEnabled()) {
            console.warn('⚠️ COS 未配置，使用 base64 存储（不推荐用于生产环境）')
            return NextResponse.json({
                success: true,
                url: image, // 返回 base64 作为 URL
                message: '图片已保存（base64格式）',
                warning: 'COS未配置，建议配置以获得更好的性能'
            })
        }

        // 提取 base64 数据
        const matches = image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
        if (!matches) {
            return NextResponse.json({
                success: false,
                message: '图片格式不支持，仅支持 PNG/JPEG'
            }, { status: 400 })
        }

        const base64Data = matches[2]
        const buffer = Buffer.from(base64Data, 'base64')

        // 生成文件名
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const fileName = `screenshot-${timestamp}-${randomStr}.jpg`
        const cosKey = `screenshots/${fileName}`

        // 上传到 COS
        const { uploadToCos } = await import('@/lib/cos-storage')
        const url = await uploadToCos(cosKey, buffer, 'image/jpeg')

        return NextResponse.json({
            success: true,
            url,
            message: '图片上传成功'
        })

    } catch (error: any) {
        console.error('上传截图失败:', error)

        // 如果上传失败，尝试返回 base64 作为降级方案
        const { image } = await request.json().catch(() => ({ image: null }))
        if (image) {
            console.warn('⚠️ 上传失败，使用 base64 降级')
            return NextResponse.json({
                success: true,
                url: image,
                message: '上传失败，已保存为 base64',
                warning: error.message
            })
        }

        return NextResponse.json({
            success: false,
            message: error.message || '上传失败'
        }, { status: 500 })
    }
}
