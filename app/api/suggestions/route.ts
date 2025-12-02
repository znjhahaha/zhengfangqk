import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action, suggestion } = body

        if (action === 'create') {
            // 转发到管理端 API 以获得持久化存储
            const adminResponse = await fetch(`${request.nextUrl.origin}/api/admin/suggestions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'create',
                    suggestion: {
                        type: suggestion.category || suggestion.type || 'other',
                        title: suggestion.title,
                        content: suggestion.content,
                        contact: suggestion.contact || '',
                        metadata: suggestion.metadata || {},
                        screenshot: suggestion.screenshot || undefined
                    }
                })
            })

            const result = await adminResponse.json()

            if (result.success) {
                console.log('📝 新收到反馈:', result.data?.title)
                return NextResponse.json({
                    success: true,
                    data: result.data,
                    message: '反馈提交成功'
                })
            } else {
                return NextResponse.json({
                    success: false,
                    message: result.message || '反馈提交失败'
                }, { status: 500 })
            }
        }

        return NextResponse.json({
            success: false,
            message: '不支持的操作'
        }, { status: 400 })

    } catch (error: any) {
        console.error('处理反馈失败:', error)
        return NextResponse.json({
            success: false,
            message: error.message || '服务器错误'
        }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    // 转发到管理端 API
    try {
        const adminResponse = await fetch(`${request.nextUrl.origin}/api/admin/suggestions`, {
            headers: request.headers
        })
        return adminResponse
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: '获取建议失败'
        }, { status: 500 })
    }
}
