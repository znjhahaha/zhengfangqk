import { NextResponse } from 'next/server'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Mobile API Server',
    version: '1.0.0',
    timestamp: Date.now()
  })
}

