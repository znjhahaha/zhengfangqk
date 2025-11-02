// 后台管理 - 学校配置管理
// 支持动态添加、编辑、删除学校，并持久化到 localStorage

import { SchoolConfig } from './global-school-state'

// 重新导出 SchoolConfig 类型，供其他模块使用
export type { SchoolConfig }

const STORAGE_KEY_SCHOOLS = 'admin-custom-schools'
const STORAGE_KEY_URL_CONFIG = 'admin-school-url-config'

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

// 获取所有学校（默认 + 自定义）
export function getAllSchools(): SchoolConfig[] {
  const defaultSchools = getDefaultSchools()
  
  if (typeof window === 'undefined') {
    return defaultSchools
  }

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

// 添加学校
export function addSchool(school: SchoolConfig): void {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端环境中添加学校')
  }

  const customSchools = getCustomSchools()
  
  // 检查ID是否已存在
  if (customSchools.some(s => s.id === school.id)) {
    throw new Error(`学校ID "${school.id}" 已存在`)
  }

  // 检查是否覆盖了默认学校
  const defaultSchools = getDefaultSchools()
  const isDefault = defaultSchools.some(s => s.id === school.id)
  
  if (isDefault) {
    // 覆盖默认学校
    customSchools.push(school)
  } else {
    // 添加新学校
    customSchools.push(school)
  }

  localStorage.setItem(STORAGE_KEY_SCHOOLS, JSON.stringify(customSchools))
  console.log(`✅ 学校 "${school.name}" 已添加`)
}

// 更新学校
export function updateSchool(oldId: string, newSchool: SchoolConfig): void {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端环境中更新学校')
  }

  const customSchools = getCustomSchools()
  
  // 如果ID改变了，需要检查新ID是否已存在
  if (oldId !== newSchool.id) {
    const allSchools = getAllSchools()
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
  console.log(`✅ 学校 "${newSchool.name}" 已更新`)
}

// 删除学校
export function deleteSchool(schoolId: string): void {
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
  
  console.log(`✅ 学校 "${schoolId}" 已删除`)
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

export function setSchoolUrlConfig(
  schoolId: string,
  config: {
    gradeGnmkdm?: string
    courseGnmkdm?: string
    scheduleGnmkdm?: string
  }
): void {
  if (typeof window === 'undefined') {
    throw new Error('只能在客户端环境中设置URL配置')
  }

  try {
    const configsJson = localStorage.getItem(STORAGE_KEY_URL_CONFIG)
    const configs: Record<string, any> = configsJson ? JSON.parse(configsJson) : {}
    configs[schoolId] = config
    localStorage.setItem(STORAGE_KEY_URL_CONFIG, JSON.stringify(configs))
    console.log(`✅ 学校 "${schoolId}" 的URL配置已更新`)
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
