import { NextRequest, NextResponse } from 'next/server'

// 模拟数据库存储（在实际生产环境中应使用数据库）
// 注意：在 Vercel Serverless 环境中，这个变量在每次请求后可能会重置
// 如果需要持久化，请连接数据库（如 MongoDB, PostgreSQL）或使用 Vercel KV
let suggestions: any[] = []

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action, suggestion } = body

        if (action === 'create') {
            const newSuggestion = {
                id: Date.now().toString(),
                ...suggestion,
                status: 'pending',
                createdAt: Date.now(),
                votes: 0
            }

            suggestions.unshift(newSuggestion)

            // 限制内存中存储的数量，防止溢出
            if (suggestions.length > 100) {
                suggestions = suggestions.slice(0, 100)
            }

            console.log('📝 新收到反馈:', newSuggestion.title)

            return NextResponse.json({
                success: true,
                data: newSuggestion,
                message: '反馈提交成功'
            })
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
    // 获取所有建议
    return NextResponse.json({
        success: true,
        data: suggestions
    })
}
