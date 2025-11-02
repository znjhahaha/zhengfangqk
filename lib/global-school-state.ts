// 全局学校状态管理
export interface SchoolConfig {
  id: string
  name: string
  domain: string
  protocol: string
  description?: string
}

// 支持的学校列表（动态获取，包含默认和自定义学校）
import { getAllSchools, getAllSchoolsSync } from './admin-school-manager'

// 同步版本（用于服务端渲染或立即需要数据的地方）
export function getSupportedSchools(): SchoolConfig[] {
  if (typeof window !== 'undefined') {
    return getAllSchoolsSync()
  }
  // 服务端渲染时返回默认列表
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

// 异步版本（支持从服务器同步）
export async function getSupportedSchoolsAsync(sync = true): Promise<SchoolConfig[]> {
  if (typeof window !== 'undefined') {
    return await getAllSchools(sync)
  }
  return getSupportedSchools()
}

// 向后兼容：默认学校列表（服务端渲染时使用）
const DEFAULT_SCHOOLS_LIST: SchoolConfig[] = [
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

// 向后兼容：保留 SUPPORTED_SCHOOLS，但在客户端使用动态列表
export const SUPPORTED_SCHOOLS: SchoolConfig[] = typeof window !== 'undefined' 
  ? getSupportedSchools() 
  : DEFAULT_SCHOOLS_LIST

// 默认学校
export const DEFAULT_SCHOOL = DEFAULT_SCHOOLS_LIST[0]

// 全局学校状态
let currentSchool: SchoolConfig = DEFAULT_SCHOOL

// 获取当前学校
export function getCurrentSchool(): SchoolConfig {
  // 在客户端环境中，尝试从localStorage读取
  if (typeof window !== 'undefined') {
    try {
      const savedSchoolId = localStorage.getItem('selected-school-id')
      if (savedSchoolId) {
        const schools = getSupportedSchools()
        const school = schools.find(s => s.id === savedSchoolId)
        if (school) {
          currentSchool = school
          return school
        }
      }
    } catch (error) {
      console.error('读取学校配置失败:', error)
    }
  }
  return currentSchool
}

// 设置当前学校
export function setCurrentSchool(school: SchoolConfig): void {
  currentSchool = school
  
  // 在客户端环境中，保存到localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('selected-school-id', school.id)
      console.log(`✅ 学校已切换为: ${school.name} (${school.id})`)
    } catch (error) {
      console.error('保存学校配置失败:', error)
    }
  }
}

// 根据ID获取学校
export function getSchoolById(id: string): SchoolConfig | undefined {
  return getSupportedSchools().find(school => school.id === id)
}

// 生成完整的学校URL
export function getSchoolUrl(path: string = ''): string {
  const school = getCurrentSchool()
  const baseUrl = `${school.protocol}://${school.domain}`
  return path ? `${baseUrl}${path}` : baseUrl
}

// 学校特定的URL配置（默认配置，可以在后台管理页面动态添加）
const DEFAULT_SCHOOL_URL_CONFIG: Record<string, {
  gradeGnmkdm?: string
  courseGnmkdm?: string
  scheduleGnmkdm?: string
}> = {
  tyust: {
    gradeGnmkdm: 'N305005',
    courseGnmkdm: 'N253512',
    scheduleGnmkdm: 'N253508'
  },
  zjut: {
    gradeGnmkdm: 'N305005',
    courseGnmkdm: 'N253512',
    scheduleGnmkdm: 'N253508'
  }
}

// 获取学校URL配置（优先从后台管理获取）
function getSchoolUrlConfig(schoolId: string): {
  gradeGnmkdm?: string
  courseGnmkdm?: string
  scheduleGnmkdm?: string
} {
  if (typeof window !== 'undefined') {
    try {
      const { getSchoolUrlConfig } = require('./admin-school-manager')
      const config = getSchoolUrlConfig(schoolId)
      if (config) {
        return config
      }
    } catch (error) {
      console.error('获取学校URL配置失败:', error)
    }
  }
  return DEFAULT_SCHOOL_URL_CONFIG[schoolId] || DEFAULT_SCHOOL_URL_CONFIG['tyust']
}

// 生成具体的API URL
export function getApiUrls() {
  const school = getCurrentSchool()
  const baseUrl = `${school.protocol}://${school.domain}`
  const urlConfig = getSchoolUrlConfig(school.id)
  
  return {
    // 学生信息
    studentInfo: `${baseUrl}/jwglxt/xtgl/index_cxYhxxIndex.html?xt=jw&localeKey=zh_CN&_=${Date.now()}&gnmkdm=index`,
    
    // 选课参数
    courseSelectionParams: `${baseUrl}/jwglxt/xsxk/zzxkyzb_cxZzxkYzbIndex.html?gnmkdm=${urlConfig.courseGnmkdm}&layout=default&su=${school.domain}`,
    
    // 可选课程
    availableCourses: `${baseUrl}/jwglxt/xsxk/zzxkyzb_cxZzxkYzbPartDisplay.html?gnmkdm=${urlConfig.courseGnmkdm}`,
    
    // 已选课程
    selectedCourses: `${baseUrl}/jwglxt/xsxk/zzxkyzb_cxZzxkYzbChoosedDisplay.html?gnmkdm=${urlConfig.courseGnmkdm}`,
    
    // 课表参数
    scheduleParams: `${baseUrl}/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=${urlConfig.scheduleGnmkdm}`,
    
    // 课表数据
    scheduleData: `${baseUrl}/jwglxt/kbcx/xskbcx_cxXsKb.html?gnmkdm=${urlConfig.scheduleGnmkdm}`,
    
    // 成绩查询（根据学校配置）
    gradeQuery: `${baseUrl}/jwglxt/cjcx/cjcx_cxXsgrcj.html?doType=query&gnmkdm=${urlConfig.gradeGnmkdm}`,
    gradePage: `${baseUrl}/jwglxt/cjcx/cjcx_cxDgXscj.html?gnmkdm=${urlConfig.gradeGnmkdm}&layout=default`,
    
    // 总体成绩查询
    overallGradeIndex: `${baseUrl}/jwglxt/xsxy/xsxyqk_cxXsxyqkIndex.html?gnmkdm=N105515&layout=default`,
    overallGradeQuery: `${baseUrl}/jwglxt/xsxy/xsxyqk_cxJxzxjhxfyqKcxx.html?gnmkdm=N105515`,
    
    // 选课执行
    courseSelection: `${baseUrl}/jwglxt/xsxk/zzxkyzb_cxZzxkYzb.html?gnmkdm=${urlConfig.courseGnmkdm}&su=${school.domain}`,
    
    // Referer头
    getRefererHeader: (type: 'course' | 'schedule' | 'student' | 'grade' | 'overallGrade') => {
      switch (type) {
        case 'course':
          return `${baseUrl}/jwglxt/xsxk/zzxkyzb_cxZzxkYzbIndex.html?gnmkdm=${urlConfig.courseGnmkdm}&layout=default&su=${school.domain}`
        case 'schedule':
          return `${baseUrl}/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=${urlConfig.scheduleGnmkdm}`
        case 'student':
          return `${baseUrl}/jwglxt/xtgl/index_initMenu.html`
        case 'grade':
          return `${baseUrl}/jwglxt/cjcx/cjcx_cxDgXscj.html?gnmkdm=${urlConfig.gradeGnmkdm}&layout=default`
        case 'overallGrade':
          return `${baseUrl}/jwglxt/xsxy/xsxyqk_cxXsxyqkIndex.html?gnmkdm=N105515&layout=default`
        default:
          return baseUrl
      }
    }
  }
}

// 调试信息
export function getDebugInfo() {
  const school = getCurrentSchool()
  const urls = getApiUrls()
  
  return {
    currentSchool: school,
    urls: urls,
    localStorage: typeof window !== 'undefined' ? localStorage.getItem('selected-school-id') : 'N/A'
  }
}
