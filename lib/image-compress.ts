/**
 * 图片压缩工具
 * 将图片压缩为 JPG 格式，控制文件大小
 */

export interface CompressOptions {
    maxWidth?: number // 最大宽度，默认 1920px
    maxHeight?: number // 最大高度，默认 1080px
    quality?: number // 质量 0-1，默认 0.8
    maxSizeMB?: number // 目标文件大小（MB），默认 0.5MB
}

/**
 * 压缩 base64 图片
 * @param base64 原始 base64 图片数据
 * @param options 压缩选项
 * @returns 压缩后的 base64 数据
 */
export async function compressImage(
    base64: string,
    options: CompressOptions = {}
): Promise<string> {
    const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        maxSizeMB = 0.5
    } = options

    return new Promise((resolve, reject) => {
        const img = new Image()

        img.onload = () => {
            try {
                // 计算压缩后的尺寸
                let { width, height } = img

                if (width > maxWidth) {
                    height = (height * maxWidth) / width
                    width = maxWidth
                }

                if (height > maxHeight) {
                    width = (width * maxHeight) / height
                    height = maxHeight
                }

                // 创建 canvas
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('无法创建 Canvas 上下文'))
                    return
                }

                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height)

                // 尝试不同的质量值，直到文件大小满足要求
                let currentQuality = quality
                let compressed = canvas.toDataURL('image/jpeg', currentQuality)

                // 估算文件大小（base64 大小约为实际文件大小的 1.37 倍）
                const estimatedSizeMB = (compressed.length * 0.75) / (1024 * 1024)

                // 如果文件太大，降低质量
                while (estimatedSizeMB > maxSizeMB && currentQuality > 0.1) {
                    currentQuality -= 0.1
                    compressed = canvas.toDataURL('image/jpeg', currentQuality)
                    const newSize = (compressed.length * 0.75) / (1024 * 1024)
                    if (newSize <= maxSizeMB) break
                }

                console.log(`✅ 图片压缩完成: ${(estimatedSizeMB).toFixed(2)}MB -> ${((compressed.length * 0.75) / (1024 * 1024)).toFixed(2)}MB`)
                resolve(compressed)
            } catch (error) {
                reject(error)
            }
        }

        img.onerror = () => {
            reject(new Error('图片加载失败'))
        }

        img.src = base64
    })
}

/**
 * 获取图片尺寸
 */
export async function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()

        img.onload = () => {
            resolve({ width: img.width, height: img.height })
        }

        img.onerror = () => {
            reject(new Error('图片加载失败'))
        }

        img.src = base64
    })
}
