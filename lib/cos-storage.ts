/**
 * 腾讯云 COS 存储适配器
 * 用于在 EdgeOne Pages 等文件系统只读的环境中实现数据持久化
 */

import COS from 'cos-nodejs-sdk-v5'

interface CosConfig {
  SecretId: string
  SecretKey: string
  Region: string
  Bucket: string
}

let cosConfig: CosConfig | null = null
let cosInstance: COS | null = null

/**
 * 初始化 COS 配置（从环境变量读取）
 */
export function getCosConfig(): CosConfig | null {
  if (cosConfig) return cosConfig

  const secretId = process.env.COS_SECRET_ID
  const secretKey = process.env.COS_SECRET_KEY
  const region = process.env.COS_REGION || 'ap-beijing'
  const bucket = process.env.COS_BUCKET

  if (!secretId || !secretKey || !bucket) {
    return null
  }

  cosConfig = {
    SecretId: secretId,
    SecretKey: secretKey,
    Region: region,
    Bucket: bucket
  }

  return cosConfig
}

/**
 * 获取 COS 实例
 */
export function getCosInstance(): COS {
  if (cosInstance) return cosInstance

  const config = getCosConfig()
  if (!config) {
    throw new Error('COS 配置未设置')
  }

  // COS SDK 初始化时不传递 Region，而是在每次 API 调用时传递
  cosInstance = new COS({
    SecretId: config.SecretId,
    SecretKey: config.SecretKey
  })

  return cosInstance
}

/**
 * 检查是否启用 COS 存储
 */
export function isCosEnabled(): boolean {
  return getCosConfig() !== null
}

/**
 * 使用 COS 存储数据
 */
export async function saveToCos(key: string, data: any): Promise<void> {
  const config = getCosConfig()
  if (!config) {
    throw new Error('COS 配置未设置')
  }

  try {
    const cos = getCosInstance()
    const jsonData = JSON.stringify(data, null, 2)

    await new Promise<void>((resolve, reject) => {
      cos.putObject(
        {
          Bucket: config.Bucket,
          Region: config.Region,
          Key: key,
          Body: jsonData,
          ContentType: 'application/json; charset=utf-8'
        },
        (err: any, data: any) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })

    console.log(`✅ 数据已保存到 COS: ${key}`)
  } catch (error: any) {
    console.error(`❌ 保存数据到 COS 失败:`, error)
    throw new Error(`保存数据到 COS 失败: ${error.message || String(error)}`)
  }
}

/**
 * 从 COS 读取数据
 */
export async function loadFromCos(key: string): Promise<any | null> {
  const config = getCosConfig()
  if (!config) {
    throw new Error('COS 配置未设置')
  }

  try {
    const cos = getCosInstance()

    const result = await new Promise<any>((resolve, reject) => {
      cos.getObject(
        {
          Bucket: config.Bucket,
          Region: config.Region,
          Key: key
        },
        (err: any, data: any) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        }
      )
    })

    if (result && result.Body) {
      const content = Buffer.isBuffer(result.Body)
        ? result.Body.toString('utf-8')
        : typeof result.Body === 'string'
          ? result.Body
          : Buffer.from(result.Body).toString('utf-8')
      return JSON.parse(content)
    }

    return null
  } catch (error: any) {
    // 文件不存在是正常情况
    if (
      error.statusCode === 404 ||
      error.Code === 'NoSuchKey' ||
      error.statusCode === 403
    ) {
      return null
    }
    console.error(`⚠️ 从 COS 加载数据失败:`, {
      key,
      error: error.message || String(error),
      statusCode: error.statusCode,
      code: error.Code
    })
    throw error
  }
}

/**
 * 上传二进制文件到 COS（用于图片等）
 * @param key COS 对象键名
 * @param buffer 文件Buffer数据
 * @param contentType 文件类型
 * @returns 文件的访问URL
 */
export async function uploadToCos(key: string, buffer: Buffer, contentType: string = 'application/octet-stream'): Promise<string> {
  const config = getCosConfig()
  if (!config) {
    throw new Error('COS 配置未设置')
  }

  try {
    const cos = getCosInstance()

    await new Promise<void>((resolve, reject) => {
      cos.putObject(
        {
          Bucket: config.Bucket,
          Region: config.Region,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read' // 设置为公开读，允许通过URL直接访问
        },
        (err: any, data: any) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        }
      )
    })

    // 返回 COS 访问 URL
    const url = `https://${config.Bucket}.cos.${config.Region}.myqcloud.com/${key}`
    console.log(`✅ 文件已上传到 COS: ${key}`)
    console.log(`📎 访问URL: ${url}`)
    return url

  } catch (error: any) {
    console.error(`❌ 上传文件到 COS 失败:`, error)
    throw new Error(`上传文件到 COS 失败: ${error.message || String(error)}`)
  }
}
