import { readFile, writeFile, mkdir, access, constants } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { isCosEnabled, saveToCos, loadFromCos } from './cos-storage'

/**
 * 获取数据存储目录，优先使用可写的持久化目录
 * 
 * 策略：
 * 1. 首先尝试使用环境变量 DATA_DIR（如果设置）
 * 2. 然后尝试项目目录下的 data 文件夹
 * 3. 验证目录是否可写（尝试创建并写入测试文件）
 * 4. 如果都不可用，在非云环境下使用项目目录，云环境下记录警告
 */
export async function getDataDir(): Promise<string> {
  // 1. 优先使用环境变量指定的目录
  if (process.env.DATA_DIR) {
    const envDir = path.resolve(process.env.DATA_DIR)
    if (await isWritable(envDir)) {
      console.log('✅ 使用环境变量指定的数据目录:', envDir)
      return envDir
    } else {
      console.warn('⚠️ 环境变量 DATA_DIR 指定的目录不可写，尝试其他位置:', envDir)
    }
  }

  // 2. 尝试项目目录下的 data 文件夹
  const projectDataDir = path.join(process.cwd(), 'data')
  
  // 首先检查目录是否存在，如果不存在则尝试创建
  if (!existsSync(projectDataDir)) {
    try {
      await mkdir(projectDataDir, { recursive: true })
    } catch (error: any) {
      console.warn('⚠️ 无法创建项目数据目录:', projectDataDir, error?.message)
    }
  }

  // 验证项目目录是否可写
  if (await isWritable(projectDataDir)) {
    console.log('✅ 使用项目数据目录:', projectDataDir)
    return projectDataDir
  }

  // 3. 如果是 Windows，尝试使用用户目录
  if (process.platform === 'win32') {
    const userDataDir = path.join(
      process.env.APPDATA || process.env.LOCALAPPDATA || process.env.HOME || process.cwd(),
      'qiangke-data'
    )
    if (await isWritable(userDataDir)) {
      console.log('✅ 使用 Windows 用户数据目录:', userDataDir)
      return userDataDir
    }
  }

  // 4. 最后尝试使用临时目录（不推荐，但至少可以工作）
  // 在云环境中，这可能是唯一可写的目录
  const tmpDir = process.platform === 'win32'
    ? path.join(process.env.TEMP || process.env.TMP || process.cwd(), 'qiangke-data-tmp')
    : path.join('/tmp', 'qiangke-data')

  if (await isWritable(tmpDir)) {
    console.warn('⚠️ 使用临时目录存储数据（可能不持久化）:', tmpDir)
    console.warn('⚠️ 建议设置环境变量 DATA_DIR 指定持久化数据目录')
    return tmpDir
  }

  // 如果所有位置都不可用，抛出错误
  throw new Error(
    '无法找到可写的数据存储目录。请设置环境变量 DATA_DIR 指定一个可写目录。'
  )
}

/**
 * 检查目录是否可写
 */
async function isWritable(dirPath: string): Promise<boolean> {
  try {
    // 确保目录存在
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true })
    }

    // 检查目录是否可写
    await access(dirPath, constants.W_OK)

    // 尝试写入测试文件
    const testFile = path.join(dirPath, '.write-test')
    try {
      await writeFile(testFile, 'test', 'utf-8')
      // 立即删除测试文件
      const { unlink } = await import('fs/promises')
      try {
        await unlink(testFile)
      } catch {
        // 忽略删除错误
      }
      return true
    } catch {
      return false
    }
  } catch {
    return false
  }
}

/**
 * 确保数据目录存在
 */
export async function ensureDataDir(dataDir: string): Promise<void> {
  try {
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true })
      console.log('✅ 数据目录已创建:', dataDir)
    }
  } catch (error: any) {
    console.error('❌ 无法创建数据目录:', dataDir, error)
    throw new Error(`无法创建数据目录: ${error.message}`)
  }
}

// 内存缓存（减少文件IO）
const fileCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

/**
 * 从文件或 COS 加载数据（通用）
 * 优先使用 COS，如果 COS 未配置则使用文件系统
 * 使用内存缓存减少IO操作
 */
export async function loadDataFromFile<T>(
  filePath: string,
  dataKey: string,
  defaultValue: T[] = [] as T[]
): Promise<T[]> {
  // 检查缓存
  const cacheKey = `${filePath}:${dataKey}`
  const cached = fileCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data
  }

  let result: T[] = defaultValue

  // 优先使用 COS 存储
  if (isCosEnabled()) {
    try {
      // 使用文件名作为 COS key（去除路径前缀）
      const cosKey = `qiangke-data/${path.basename(filePath)}`
      const data = await loadFromCos(cosKey)
      if (data && data[dataKey]) {
        result = data[dataKey]
        // 更新缓存
        fileCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      }
      // COS 中没有数据，返回默认值
      return defaultValue
    } catch (error: any) {
      console.warn('⚠️ 从 COS 加载数据失败，尝试使用文件系统:', error?.message)
      // COS 加载失败，回退到文件系统
    }
  }

  // 使用文件系统
  try {
    if (existsSync(filePath)) {
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      result = data[dataKey] || defaultValue
      // 更新缓存
      fileCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    // 文件不存在（ENOENT）是正常情况，不记录错误
    if (error?.code === 'ENOENT') {
      return defaultValue
    }
    console.error('⚠️ 加载数据失败:', {
      file: filePath,
      error: errorMessage,
      code: error?.code
    })
  }
  
  // 缓存默认值
  fileCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}

/**
 * 保存数据到文件或 COS（通用）
 * 优先使用 COS，如果 COS 未配置则使用文件系统
 * 更新内存缓存
 */
export async function saveDataToFile<T>(
  filePath: string,
  dataKey: string,
  data: T[],
  dataDir: string
): Promise<void> {
  const fileData = {
    [dataKey]: data,
    lastUpdated: Date.now()
  }

  // 更新缓存
  const cacheKey = `${filePath}:${dataKey}`
  fileCache.set(cacheKey, { data, timestamp: Date.now() })

  // 优先使用 COS 存储
  if (isCosEnabled()) {
    try {
      // 使用文件名作为 COS key（去除路径前缀）
      const cosKey = `qiangke-data/${path.basename(filePath)}`
      await saveToCos(cosKey, fileData)
      return // COS 保存成功，直接返回
    } catch (error: any) {
      console.warn('⚠️ 保存数据到 COS 失败，尝试使用文件系统:', error?.message)
      // COS 保存失败，回退到文件系统
    }
  }

  // 使用文件系统
  try {
    await ensureDataDir(dataDir)
    await writeFile(filePath, JSON.stringify(fileData, null, 2), 'utf-8')
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error('❌ 保存数据失败:', {
      file: filePath,
      dir: dataDir,
      error: errorMessage,
      code: error?.code
    })
    throw new Error(`保存数据失败: ${errorMessage}. 目录: ${dataDir}`)
  }
}

/**
 * 清除文件缓存（用于强制刷新）
 */
export function clearFileCache(filePath?: string, dataKey?: string): void {
  if (filePath && dataKey) {
    const cacheKey = `${filePath}:${dataKey}`
    fileCache.delete(cacheKey)
  } else {
    fileCache.clear()
  }
}

/**
 * 清理过期的缓存
 */
export function cleanupExpiredCache(): number {
  const now = Date.now()
  let removed = 0
  for (const [key, value] of fileCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      fileCache.delete(key)
      removed++
    }
  }
  return removed
}

// 定期清理过期缓存（每10分钟）
if (typeof process !== 'undefined') {
  setInterval(() => {
    try {
      const removed = cleanupExpiredCache()
      if (removed > 0) {
        console.log(`🧹 清理了 ${removed} 个过期缓存项`)
      }
    } catch (error) {
      // 忽略清理错误
    }
  }, 10 * 60 * 1000)
}

