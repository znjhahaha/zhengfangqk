// 后台管理 - 学校配置管理
// 支持动态添加、编辑、删除学校，并持久化到 localStorage 和服务器

import { SchoolConfig } from './global-school-state'

// 重新导出 SchoolConfig 类型，供其他模块使用
export type { SchoolConfig }

const STORAGE_KEY_SCHOOLS = 'admin-custom-schools'
const STORAGE_KEY_URL_CONFIG = 'admin-school-url-config'
const STORAGE_KEY_LAST_SYNC = 'admin-schools-last-sync'

// 管理员令牌（应该从环境变量或配置中读取）
function getAdminToken(): string {
  if (typeof window !== 'undefined') {
    // 检查是否登录为管理员
    const isAdmin = localStorage.getItem('admin-logged-in') === 'true'
    return isAdmin ? 'Znj00751_admin_2024' : ''
  }
  return ''
}

// 从服务器同步学校列表
async function syncFromServer(): Promise<{ schools: SchoolConfig[], urlConfigs: Record<string, any>, lastUpdateTime: number } | null> {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const lastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC) || '0'
    const response = await fetch(`/api/admin/schools?lastSync=${lastSync}`)
    
    if (!response.ok) {
      console.warn('从服务器同步学校列表失败:', response.statusText)
      return null
    }

    const result = await response.json()
    if (result.success && result.data) {
      // 保存到本地缓存
      localStorage.setItem(STORAGE_KEY_SCHOOLS, JSON.stringify(result.data))
      if (result.urlConfigs) {
        localStorage.setItem(STORAGE_KEY_URL_CONFIG, JSON.stringify(result.urlConfigs))
      }
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, result.lastUpdateTime.toString())
      
      return {
        schools: result.data,
        urlConfigs: result.urlConfigs || {},
        lastUpdateTime: result.lastUpdateTime
      }
    }
  } catch (error) {
    console.warn('同步学校列表失败:', error)
  }

  return null
}

// 同步到服务器（管理员操作）
async function syncToServer(action: 'add' | 'update' | 'delete' | 'setUrlConfig', data: any): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const adminToken = getAdminToken()
    if (!adminToken) {
      console.warn('未登录为管理员，无法同步到服务器')
      return false
    }

    const response = await fetch('/api/admin/schools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      },
      body: JSON.stringify({ action, ...data })
    })

    if (!response.ok) {
      console.error('同步到服务器失败:', response.statusText)
      return false
    }

    const result = await response.json()
    if (result.success) {
      // 更新本地同步时间
      if (result.lastUpdateTime) {
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, result.lastUpdateTime.toString())
      }
      return true
    }
  } catch (error) {
    console.error('同步到服务器失败:', error)
  }

  return false
}

// 获取默认学校列表（硬编码的）
export function getDefaultSchools(): SchoolConfig[] {
  return [
    {
      id: 'tyust',
      name: '太原科技大学',
      domain: 'newjwc.tyust.edu.cn',
      protocol: 'https',
      description: '太原科技大学教务系统'
    },
    {
      id: 'zjut',
      name: '浙江工业大学',
      domain: 'www.gdjw.zjut.edu.cn',
      protocol: 'http',
      description: '浙江工业大学教务系统'
    }
  ]
}

// 获取所有学校（默认 + 服务器同步 + 自定义）
export async function getAllSchools(sync = true): Promise<SchoolConfig[]> {
  const defaultSchools = getDefaultSchools()
  
  if (typeof window === 'undefined') {
    return defaultSchools
  }

  // 如果启用同步，尝试从服务器获取最新数据
  if (sync) {
    const serverData = await syncFromServer()
    if (serverData && serverData.schools.length > 0) {
      return serverData.schools
    }
  }

  // 从本地缓存读取
  try {
    const customSchoolsJson = localStorage.getItem(STORAGE_KEY_SCHOOLS)
    if (customSchoolsJson) {
      const customSchools: SchoolConfig[] = JSON.parse(customSchoolsJson)
      // 合并默认学校和自定义学校，自定义学校优先级更高
      const merged = [...defaultSchools]
      customSchools.forEach(custom => {
        const index = merged.findIndex(s => s.id === custom.id)
        if (index >= 0) {
          // 如果ID已存在，替换默认学校
          merged[index] = custom
        } else {
          // 如果ID不存在，添加新学校
          merged.push(custom)
        }
      })
      return merged
    }
  } catch (error) {
    console.error('读取自定义学校失败:', error)
  }

  return defaultSchools
}

// 同步版本（同步调用）
export function getAllSchoolsSync(): SchoolConfig[] {
  const defaultSchools = getDefaultSchools()
  
  if (typeof window === 'undefined') {
    return defaultSchools
  }

  try {
    const customSchoolsJson = localStorage.getItem(STORAGE_KEY_SCHOOLS)
    if (customSchoolsJson) {
      const customSchools: SchoolConfig[] = JSON.parse(customSchoolsJson)
      const merged = [...defaultSchools]
      customSchools.forEach(custom => {
        const index = merged.findIndex(s => s.id === custom.id)
        if (index >= 0) {
          merged[index] = custom
        } else {
          merged.push(custom)
        }
      })
      return merged
    }
  } catch (error) {
    console.error('读取自定义学校失败:', error)
  }

  return defaultSchools
}

// 添加学校（同步到服务器）
export async function addSchool(school: SchoolConfig): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端环境中添加学校')
  }

  const customSchools = getCustomSchools()
  
  // 检查ID是否已存在
  if (customSchools.some(s => s.id === school.id)) {
    throw new Error(`学校ID "${school.id}" 已存在`)
  }

  // 添加到本地
  customSchools.push(school)
  localStorage.setItem(STORAGE_KEY_SCHOOLS, JSON.stringify(customSchools))

  // 同步到服务器
  const synced = await syncToServer('add', { school })
  if (synced) {
    console.log(`✅ 学校 "${school.name}" 已添加并同步到服务器`)
  } else {
    console.log(`✅ 学校 "${school.name}" 已添加到本地`)
  }
}

// 更新学校（同步到服务器）
export async function updateSchool(oldId: string, newSchool: SchoolConfig): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端环境中更新学校')
  }

  const customSchools = getCustomSchools()
  
  // 如果ID改变了，需要检查新ID是否已存在
  if (oldId !== newSchool.id) {
    const allSchools = getAllSchoolsSync()
    if (allSchools.some(s => s.id === newSchool.id && s.id !== oldId)) {
      throw new Error(`学校ID "${newSchool.id}" 已存在`)
    }
  }

  // 更新或添加
  const index = customSchools.findIndex(s => s.id === oldId)
  if (index >= 0) {
    customSchools[index] = newSchool
  } else {
    // 如果是默认学校，添加到自定义列表
    customSchools.push(newSchool)
  }

  localStorage.setItem(STORAGE_KEY_SCHOOLS, JSON.stringify(customSchools))

  // 同步到服务器
  const synced = await syncToServer('update', { schoolId: oldId, school: newSchool })
  if (synced) {
    console.log(`✅ 学校 "${newSchool.name}" 已更新并同步到服务器`)
  } else {
    console.log(`✅ 学校 "${newSchool.name}" 已在本地更新`)
  }
}

// 删除学校（同步到服务器）
export async function deleteSchool(schoolId: string): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端环境中删除学校')
  }

  // 检查是否是默认学校
  const defaultSchools = getDefaultSchools()
  const isDefault = defaultSchools.some(s => s.id === schoolId)
  
  if (isDefault) {
    throw new Error('无法删除默认学校，只能删除自定义添加的学校')
  }

  const customSchools = getCustomSchools()
  const filtered = customSchools.filter(s => s.id !== schoolId)
  
  localStorage.setItem(STORAGE_KEY_SCHOOLS, JSON.stringify(filtered))
  
  // 同时删除URL配置
  deleteSchoolUrlConfig(schoolId)

  // 同步到服务器
  const synced = await syncToServer('delete', { schoolId })
  if (synced) {
    console.log(`✅ 学校 "${schoolId}" 已删除并同步到服务器`)
  } else {
    console.log(`✅ 学校 "${schoolId}" 已在本地删除`)
  }
}

// 获取自定义学校列表
function getCustomSchools(): SchoolConfig[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const customSchoolsJson = localStorage.getItem(STORAGE_KEY_SCHOOLS)
    if (customSchoolsJson) {
      return JSON.parse(customSchoolsJson)
    }
  } catch (error) {
    console.error('读取自定义学校失败:', error)
  }

  return []
}

// URL配置管理
export function getSchoolUrlConfig(schoolId: string): {
  gradeGnmkdm?: string
  courseGnmkdm?: string
  scheduleGnmkdm?: string
} | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const configsJson = localStorage.getItem(STORAGE_KEY_URL_CONFIG)
    if (configsJson) {
      const configs: Record<string, any> = JSON.parse(configsJson)
      return configs[schoolId] || null
    }
  } catch (error) {
    console.error('读取学校URL配置失败:', error)
  }

  return null
}

// 设置学校URL配置（同步到服务器）
export async function setSchoolUrlConfig(
  schoolId: string,
  config: {
    gradeGnmkdm?: string
    courseGnmkdm?: string
    scheduleGnmkdm?: string
  }
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端环境中设置URL配置')
  }

  try {
    const configsJson = localStorage.getItem(STORAGE_KEY_URL_CONFIG)
    const configs: Record<string, any> = configsJson ? JSON.parse(configsJson) : {}
    configs[schoolId] = config
    localStorage.setItem(STORAGE_KEY_URL_CONFIG, JSON.stringify(configs))

    // 同步到服务器
    await syncToServer('setUrlConfig', { schoolId, urlConfig: config })
    console.log(`✅ 学校 "${schoolId}" 的URL配置已更新并同步到服务器`)
  } catch (error) {
    console.error('保存学校URL配置失败:', error)
    throw error
  }
}

export function deleteSchoolUrlConfig(schoolId: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const configsJson = localStorage.getItem(STORAGE_KEY_URL_CONFIG)
    if (configsJson) {
      const configs: Record<string, any> = JSON.parse(configsJson)
      delete configs[schoolId]
      localStorage.setItem(STORAGE_KEY_URL_CONFIG, JSON.stringify(configs))
    }
  } catch (error) {
    console.error('删除学校URL配置失败:', error)
  }
}
