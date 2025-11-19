import { NextRequest, NextResponse } from 'next/server'
import { getDataDir, loadDataFromFile, saveDataToFile, ensureDataDir } from '@/lib/data-storage'
import path from 'path'
import { ActivationCode, validateActivationCode } from '@/lib/activation-code-manager'

// 初始化数据路径
async function initDataPaths() {
  const dataDir = await getDataDir()
  const activationCodesFile = path.join(dataDir, 'activation-codes.json')
  return { dataDir, activationCodesFile }
}

// 加载激活码列表
async function loadActivationCodes(): Promise<ActivationCode[]> {
  const { activationCodesFile } = await initDataPaths()
  const codes = await loadDataFromFile<ActivationCode>(activationCodesFile, 'activationCodes', [])
  console.log(`📋 激活码数据已加载（自动使用COS存储，如果已配置），共 ${codes.length} 个激活码`)
  return codes
}

// 保存激活码列表
async function saveActivationCodes(codes: ActivationCode[]): Promise<void> {
  const { dataDir, activationCodesFile } = await initDataPaths()
  await saveDataToFile(activationCodesFile, 'activationCodes', codes, dataDir)
  console.log(`✅ 激活码数据已保存（自动使用COS存储，如果已配置）`)
}

// 强制动态渲染（避免静态导出问题）
export const dynamic = 'force-dynamic'

// GET: 获取所有激活码（需要管理员权限）
export async function GET(request: NextRequest) {
  try {
    const adminToken = request.headers.get('x-admin-token')
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'
    
    if (!adminToken || adminToken !== validToken) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '需要管理员权限'
      }, { status: 401 })
    }

    const codes = await loadActivationCodes()
    return NextResponse.json({
      success: true,
      data: codes
    })
  } catch (error: any) {
    console.error('获取激活码列表失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取激活码列表失败'
    }, { status: 500 })
  }
}

// POST: 添加或更新激活码（需要管理员权限）
export async function POST(request: NextRequest) {
  try {
    const adminToken = request.headers.get('x-admin-token')
    const validToken = process.env.ADMIN_SECRET_TOKEN || 'Znj00751_admin_2024'
    
    if (!adminToken || adminToken !== validToken) {
      return NextResponse.json({
        success: false,
        error: '未授权',
        message: '需要管理员权限'
      }, { status: 401 })
    }

    const body = await request.json()
    const { action, code, activationCode } = body

    const codes = await loadActivationCodes()

    if (action === 'add') {
      // 检查激活码是否已存在
      if (codes.some(c => c.code === activationCode.code)) {
        return NextResponse.json({
          success: false,
          error: '激活码已存在',
          message: '该激活码已存在，请使用其他激活码'
        }, { status: 400 })
      }

      const newCode: ActivationCode = {
        ...activationCode,
        usedCount: 0,
        createdAt: Date.now(),
        isActive: activationCode.isActive !== false
      }

      codes.push(newCode)
      await saveActivationCodes(codes)

      return NextResponse.json({
        success: true,
        message: '激活码已添加',
        data: newCode
      })
    }

    if (action === 'update') {
      const index = codes.findIndex(c => c.code === code)
      if (index === -1) {
        return NextResponse.json({
          success: false,
          error: '激活码不存在',
          message: '找不到该激活码'
        }, { status: 404 })
      }

      codes[index] = {
        ...codes[index],
        ...activationCode,
        code: codes[index].code // 不允许修改code
      }

      await saveActivationCodes(codes)

      return NextResponse.json({
        success: true,
        message: '激活码已更新',
        data: codes[index]
      })
    }

    if (action === 'delete') {
      const index = codes.findIndex(c => c.code === code)
      if (index === -1) {
        return NextResponse.json({
          success: false,
          error: '激活码不存在',
          message: '找不到该激活码'
        }, { status: 404 })
      }

      codes.splice(index, 1)
      await saveActivationCodes(codes)

      return NextResponse.json({
        success: true,
        message: '激活码已删除'
      })
    }

    return NextResponse.json({
      success: false,
      error: '未知操作'
    }, { status: 400 })
  } catch (error: any) {
    console.error('操作激活码失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '操作失败'
    }, { status: 500 })
  }
}

