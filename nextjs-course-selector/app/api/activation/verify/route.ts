import { NextRequest, NextResponse } from 'next/server'
import { getDataDir, loadDataFromFile, saveDataToFile, ensureDataDir } from '@/lib/data-storage'
import path from 'path'
import { ActivationCode, validateActivationCode } from '@/lib/activation-code-manager'

// 初始化数据路径
async function initDataPaths() {
  const dataDir = await getDataDir()
  const activationRecordsFile = path.join(dataDir, 'activation-records.json')
  return { dataDir, activationRecordsFile }
}

interface ActivationRecord {
  code: string
  userId: string
  activatedAt: number
  expiresAt: number
}

// 加载激活记录
async function loadActivationRecords(): Promise<ActivationRecord[]> {
  const { activationRecordsFile } = await initDataPaths()
  return await loadDataFromFile<ActivationRecord>(activationRecordsFile, 'activationRecords', [])
}

// 保存激活记录
async function saveActivationRecords(records: ActivationRecord[]): Promise<void> {
  const { dataDir, activationRecordsFile } = await initDataPaths()
  await saveDataToFile(activationRecordsFile, 'activationRecords', records, dataDir)
  console.log(`✅ 激活记录已保存（自动使用COS存储，如果已配置）`)
}

// POST: 激活码验证和激活
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, userId } = body

    if (!code || !userId) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '激活码和用户ID不能为空'
      }, { status: 400 })
    }

    // 去除激活码中的空格和换行符
    const trimmedCode = code.trim().replace(/\s+/g, '')

    console.log(`🔍 验证激活码: 原始=${code}, 处理后=${trimmedCode}`)

    // 加载激活码列表
    const dataDir = await getDataDir()
    const activationCodesFile = path.join(dataDir, 'activation-codes.json')
    const codes = await loadDataFromFile<ActivationCode>(activationCodesFile, 'activationCodes', [])
    
    console.log(`📋 加载到 ${codes.length} 个激活码`)
    
    // 查找激活码时，也要去除空格进行比较
    const activationCode = codes.find(c => {
      const cTrimmed = c.code.trim().replace(/\s+/g, '')
      return cTrimmed === trimmedCode || c.code === trimmedCode || c.code === code
    })
    
    if (!activationCode) {
      console.log(`❌ 未找到激活码: ${trimmedCode}`)
      console.log(`📋 现有激活码:`, codes.map(c => c.code))
      return NextResponse.json({
        success: false,
        error: '激活码无效',
        message: '激活码不存在'
      }, { status: 404 })
    }

    console.log(`✅ 找到激活码: ${activationCode.code}`)

    // 验证激活码
    const validation = validateActivationCode(trimmedCode, activationCode, userId)
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: '激活码无效',
        message: validation.message
      }, { status: 400 })
    }

    // 检查激活码是否已经被其他用户绑定（一个激活码只能绑定一个用户）
    const records = await loadActivationRecords()
    const existingRecordForCode = records.find(r => 
      (r.code === trimmedCode || r.code === code || r.code === activationCode.code) && 
      r.expiresAt > Date.now()
    )
    
    if (existingRecordForCode) {
      // 如果已经有其他用户绑定，检查是否是当前用户
      if (existingRecordForCode.userId !== userId) {
        return NextResponse.json({
          success: false,
          error: '激活码已被绑定',
          message: '该激活码已被其他用户绑定，无法重复绑定'
        }, { status: 400 })
      }
      // 如果是同一用户，且未过期，直接返回
      return NextResponse.json({
        success: true,
        activated: true,
        message: '激活码已激活',
        data: {
          code: activationCode.code,
          expiresAt: existingRecordForCode.expiresAt,
          activatedAt: existingRecordForCode.activatedAt,
          maxCourses: activationCode.maxCourses,
          usedCourses: activationCode.usedCourses
        }
      })
    }

    // 检查用户是否已经激活过（删除过期的记录）
    const existingRecordForUser = records.find(r => r.userId === userId && (r.code === trimmedCode || r.code === code))
    
    if (existingRecordForUser) {
      // 如果记录已过期，删除旧记录
      if (existingRecordForUser.expiresAt <= Date.now()) {
        const filteredRecords = records.filter(r => !(r.userId === userId && (r.code === trimmedCode || r.code === code || r.code === activationCode.code)))
        await saveActivationRecords(filteredRecords)
      }
    }

    // 创建新的激活记录
    const newRecord: ActivationRecord = {
      code: activationCode.code, // 使用激活码列表中的标准code
      userId,
      activatedAt: Date.now(),
      expiresAt: validation.expiresAt!
    }

    records.push(newRecord)
    await saveActivationRecords(records)

    // 更新激活码使用次数
    activationCode.usedCount++
    // 初始化已使用课程数（如果不存在）
    if (activationCode.usedCourses === undefined) {
      activationCode.usedCourses = 0
    }
    await saveDataToFile(activationCodesFile, 'activationCodes', codes, await getDataDir())

    return NextResponse.json({
      success: true,
      activated: true,
      message: '激活码激活成功',
      data: {
        code: activationCode.code,
        expiresAt: newRecord.expiresAt,
        activatedAt: newRecord.activatedAt,
        maxCourses: activationCode.maxCourses,
        usedCourses: activationCode.usedCourses
      }
    })
  } catch (error: any) {
    console.error('激活码验证失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '激活失败'
    }, { status: 500 })
  }
}

// GET: 检查用户激活状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
        message: '用户ID不能为空'
      }, { status: 400 })
    }

    const records = await loadActivationRecords()
    const userRecord = records
      .filter(r => r.userId === userId && r.expiresAt > Date.now())
      .sort((a, b) => b.expiresAt - a.expiresAt)[0]

    if (!userRecord) {
      return NextResponse.json({
        success: true,
        activated: false,
        message: '用户未激活'
      })
    }

    return NextResponse.json({
      success: true,
      activated: true,
      data: {
        code: userRecord.code,
        expiresAt: userRecord.expiresAt,
        activatedAt: userRecord.activatedAt
      }
    })
  } catch (error: any) {
    console.error('检查激活状态失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '检查失败'
    }, { status: 500 })
  }
}

