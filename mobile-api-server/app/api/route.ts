import { NextResponse } from 'next/server'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Mobile API Server Root',
    endpoints: {
      health: '/api/health',
      info: 'This is the mobile API server for APK version'
    }
  })
}

