// 基于Python版本fetch_course_json.py的课程获取器
import * as cheerio from 'cheerio'
import { getCurrentSchool, getApiUrls } from './global-school-state'

export interface TabParam {
  kklxdm: string
  xkkz_id: string
  njdm_id: string
  zyh_id: string
}

export interface CourseData {
  jxb_id: string
  do_jxb_id: string
  kch_id: string
  kcmc: string
  jsxx: string
  jxdd: string
  sksj: string
  xf: string
  jxbrl: string
  yxzrs: string
  kklxdm: string
  [key: string]: any
}

export interface FetchResult {
  xkkz_id: string
  kklxdm: string
  njdm_id: string
  zyh_id: string
  courses: CourseData[]
}

// 获取初始页面参数（支持传入schoolId参数）
export async function getInitialParameters(cookie: string, schoolId?: string): Promise<{
  initialParams: Record<string, string>
  tabParams: TabParam[]
} | null> {
  try {
    const urls = getApiUrls(schoolId)
    const { getSchoolById, getCurrentSchool } = require('./global-school-state')
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
    
    console.log('🔍 正在获取原始页面参数...')
    
    const response = await fetch(urls.courseSelectionParams, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': urls.courseSelectionParams,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Cookie': cookie
      }
    })
    
    if (!response.ok) {
      console.error(`获取原始页面失败，状态码: ${response.status}`)
      return null
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // 提取隐藏参数
    const initialParams: Record<string, string> = {}
    $('input[type="hidden"]').each((_, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      if (name) {
        initialParams[name] = value
        console.log(`隐藏参数: ${name} = ${value}`)
      }
    })
    
    console.log(`成功提取 ${Object.keys(initialParams).length} 个隐藏参数`)
    
    // 查找包含queryCourse的onclick元素
    const tabParams: TabParam[] = []
    const queryCourseElements = $('[onclick*="queryCourse"]')
    
    console.log(`找到 ${queryCourseElements.length} 个包含queryCourse的元素`)
    
    queryCourseElements.each((_, element) => {
      const onclick = $(element).attr('onclick') || ''
      console.log(`queryCourse onclick: ${onclick}`)
      
      if (onclick.includes('queryCourse')) {
        // 提取参数
        const start = onclick.indexOf('(')
        const end = onclick.lastIndexOf(')')
        if (start !== -1 && end !== -1) {
          const args = onclick.slice(start + 1, end).split(',')
          console.log(`解析的参数: ${args}`)
          
          if (args.length >= 5) {
            const kklxdm = args[1].trim().replace(/['"]/g, '')
            const xkkz_id = args[2].trim().replace(/['"]/g, '')
            const njdm_id = args[3].trim().replace(/['"]/g, '')
            const zyh_id = args[4].trim().replace(/['"]/g, '')
            
            tabParams.push({
              kklxdm,
              xkkz_id,
              njdm_id,
              zyh_id
            })
            
            console.log(`成功解析参数: kklxdm=${kklxdm}, xkkz_id=${xkkz_id}, njdm_id=${njdm_id}, zyh_id=${zyh_id}`)
          }
        }
      }
    })
    
    // 如果没有找到queryCourse，使用默认值
    if (tabParams.length === 0) {
      console.log('未找到queryCourse函数，使用默认的硬编码参数...')
      tabParams.push({
        kklxdm: '01',
        xkkz_id: '3EC380169F7E8633E0636F1310AC7E15',
        njdm_id: '2024',
        zyh_id: '088'
      })
    }
    
    console.log(`成功提取 ${tabParams.length} 个onclick参数`)
    return { initialParams, tabParams }
    
  } catch (error) {
    console.error('获取原始参数时发生异常:', error)
    return null
  }
}

// 获取完整参数
export async function getCompleteParameters(
  initialParams: Record<string, string>,
  tabParam: TabParam,
  cookie: string,
  schoolId?: string
): Promise<Record<string, string> | null> {
  try {
    const urls = getApiUrls(schoolId)
    const { getSchoolById, getCurrentSchool } = require('./global-school-state')
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
    
    console.log(`正在获取完整参数页面，使用参数:`, tabParam)
    
    const formData = new URLSearchParams({
      'xkkz_id': tabParam.xkkz_id,
      'kklxdm': tabParam.kklxdm,
      'xszxzt': '1',
      'njdm_id': tabParam.njdm_id,
      'zyh_id': tabParam.zyh_id,
      'kspage': '0',
      'jspage': '0'
    })
    
    const response = await fetch(urls.courseSelectionParams, {
      method: 'POST',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': `${currentSchool.protocol}://${currentSchool.domain}`,
        'Pragma': 'no-cache',
        'Referer': urls.courseSelectionParams,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Cookie': cookie
      },
      body: formData.toString()
    })
    
    if (!response.ok) {
      console.error(`获取完整参数页面失败，状态码: ${response.status}`)
      return null
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // 提取完整参数
    const completeParams: Record<string, string> = {}
    $('input[type="hidden"]').each((_, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      if (name) {
        completeParams[name] = value
        console.log(`提取参数: ${name} = ${value}`)
      }
    })
    
    // 特别查找jspage参数
    const jspageInput = $('input[name="jspage"]')
    if (jspageInput.length > 0) {
      const jspageValue = jspageInput.attr('value') || '1'
      completeParams['jspage'] = jspageValue
      console.log(`找到jspage参数: ${jspageValue}`)
    } else {
      console.log('未找到jspage参数，使用默认值1')
      completeParams['jspage'] = '1'
    }
    
    console.log(`成功获取 ${Object.keys(completeParams).length} 个完整参数`)
    return completeParams
    
  } catch (error) {
    console.error('获取完整参数时发生异常:', error)
    return null
  }
}

// 构建第一部分表单数据（用于获取课程列表）
export function buildFormDataPart1(
  params: Record<string, string>,
  tabParam: TabParam
): Record<string, string> {
  const kklxdm = tabParam.kklxdm
  
  // 根据kklxdm设置不同的rwlx和xklc值
  let rwlx = '1'
  let xklc = '2'
  
  if (kklxdm === '01') {
    rwlx = '1'
    xklc = '2'
  } else if (kklxdm === '10') {
    rwlx = '2'
    xklc = '4'
  } else if (kklxdm === '05') {
    rwlx = '2'
    xklc = '3'
  }
  
  // 基础参数
  const formData: Record<string, string> = {
    'rwlx': rwlx,
    'xklc': xklc,
    'xkly': '0',
    'bklx_id': '0',
    'sfkkjyxdxnxq': '0',
    'kzkcgs': '0'
  }
  
  // 从动态参数中获取值
  const dynamicFields = [
    'xqh_id', 'jg_id', 'njdm_id_1', 'zyh_id_1', 'gnjkxdnj', 'zyh_id', 
    'zyfx_id', 'njdm_id', 'bh_id', 'bjgkczxbbjwcx', 'xbm', 'xslbdm', 'mzm', 'xz', 
    'ccdm', 'xsbj', 'sfkknj', 'sfkkzy', 'kzybkxy', 'sfznkx', 'zdkxms', 
    'sfkxq', 'sfkcfx', 'kkbk', 'kkbkdj', 'bklbkcj', 'sfkgbcx', 
    'sfrxtgkcxd', 'tykczgxdcs', 'xkxnm', 'xkxqm'
  ]
  
  // 根据kklxdm设置不同的默认值
  const defaultValues: Record<string, string> = {
    'jg_id': '05',
    'gnjkxdnj': '0',
    'bjgkczxbbjwcx': kklxdm === '05' ? '1' : '0',
    'sfkknj': '0',
    'sfkkzy': '0',
    'kzybkxy': '0',
    'sfznkx': '0',
    'zdkxms': '0',
    'sfkxq': '0',
    'sfkcfx': kklxdm === '05' ? '1' : '0',
    'kkbk': '0',
    'kkbkdj': '0',
    'bklbkcj': '0',
    'sfkgbcx': kklxdm === '05' ? '1' : '0',
    'sfrxtgkcxd': kklxdm === '05' ? '1' : '0',
    'tykczgxdcs': kklxdm === '05' ? '8' : '0'
  }
  
  for (const field of dynamicFields) {
    if (params[field]) {
      formData[field] = params[field]
    } else if (defaultValues[field]) {
      formData[field] = defaultValues[field]
    } else {
      formData[field] = ''
    }
  }
  
  // 使用选项卡参数
  formData['kklxdm'] = tabParam.kklxdm
  formData['xkkz_id'] = tabParam.xkkz_id
  
  // 根据kklxdm设置不同的kspage值
  const kspage = kklxdm === '01' ? '1' : '1'
  formData['kspage'] = kspage
  
  // 根据kklxdm设置jspage值
  let jspage = '10'
  if (kklxdm === '01') {
    jspage = '10'
  } else if (kklxdm === '10') {
    jspage = '120' // 120页，每10页为一组
  } else if (kklxdm === '05') {
    jspage = '10'
  }
  
  formData['jspage'] = jspage
  
  // 添加其他固定参数
  formData['bbhzxjxb'] = '0'
  formData['rlkz'] = '0'
  formData['xkzgbj'] = '0'
  formData['jxbzb'] = ''
  
  console.log(`根据kklxdm=${kklxdm}设置: kspage=${kspage}, jspage=${jspage}`)
  
  return formData
}

// 发送请求获取课程数据
export async function sendCourseRequest(
  formData: Record<string, string>,
  cookie: string,
  schoolId?: string
): Promise<any> {
  try {
    // 这个函数需要schoolId参数，但为了兼容性，如果没有传入则使用当前学校
    // 注意：这里不应该修改全局状态，应该使用传入的schoolId
    const { getSchoolById, getCurrentSchool } = require('./global-school-state')
    const urls = getApiUrls(schoolId)
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
    
    const url = `${urls.availableCourses}`
    
    const formDataStr = new URLSearchParams(formData).toString()
    
    console.log(`发送POST请求到: ${url}`)
    console.log(`请求参数:`, formData)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Origin': `${currentSchool.protocol}://${currentSchool.domain}`,
        'Pragma': 'no-cache',
        'Referer': urls.courseSelectionParams,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookie
      },
      body: formDataStr
    })
    
    console.log(`响应状态码: ${response.status}`)
    
    if (response.status === 901 || response.status === 910) {
      console.log(`状态码${response.status}：可能需要重新登录或会话已过期`)
      return null
    } else if (!response.ok) {
      console.error(`请求失败，状态码: ${response.status}`)
      const text = await response.text()
      console.error(`响应内容: ${text.slice(0, 500)}`)
      return null
    }
    
    // 尝试解析为JSON
    try {
      const result = await response.json()
      console.log('成功解析为JSON格式')
      return result
    } catch (jsonError) {
      console.error('JSON解析失败:', jsonError)
      const text = await response.text()
      console.log(`返回文本内容长度: ${text.length} 字符`)
      if (text.length > 0) {
        console.log(`文本内容预览: ${text.slice(0, 200)}`)
      }
      return text
    }
    
  } catch (error) {
    console.error('发送请求时发生异常:', error)
    return null
  }
}

// 提取必要的数据字段
export function extractEssentialData(courseData: any[], urlParams?: Record<string, string>): CourseData[] {
  const essentialData: CourseData[] = []
  
  if (Array.isArray(courseData)) {
    for (const course of courseData) {
      const essentialCourse: CourseData = {
        jxb_id: course.jxb_id || '',
        do_jxb_id: course.do_jxb_id || '',
        kch_id: course.jxb_id || '', // 使用jxb_id作为kch_id
        kcmc: course.kcmc || '',
        jsxx: course.jsxx || '',
        jxdd: course.jxdd || '',
        sksj: course.sksj || '',
        xf: course.xf || '',
        jxbrl: course.jxbrl || '',
        yxzrs: course.yxzrs || '',
        kklxdm: course.kklxdm || '',
        // 保留原始数据
        ...course
      }
      essentialData.push(essentialCourse)
    }
  }
  
  return essentialData
}

// 主函数：获取所有课程数据（支持传入schoolId参数）
export async function fetchAllCourses(cookie: string, schoolId?: string): Promise<FetchResult[]> {
  try {
    console.log('🚀 开始获取课程数据...')
    
    // 1. 获取初始页面参数（传入schoolId）
    const initialResult = await getInitialParameters(cookie, schoolId)
    if (!initialResult) {
      throw new Error('无法获取初始参数')
    }
    
    const { initialParams, tabParams } = initialResult
    console.log(`成功获取原始参数，找到 ${tabParams.length} 个不同的xkkz_id`)
    
    const allResults: FetchResult[] = []
    
    // 2. 处理每个不同的xkkz_id
    for (let i = 0; i < tabParams.length; i++) {
      const tabParam = tabParams[i]
      console.log(`\n=== 处理第 ${i + 1}/${tabParams.length} 个xkkz_id: ${tabParam.xkkz_id} ===`)
      
      // 3. 获取完整参数（传入schoolId）
      console.log('正在获取完整参数...')
      const completeParams = await getCompleteParameters(initialParams, tabParam, cookie, schoolId)
      if (!completeParams) {
        console.error(`无法获取xkkz_id ${tabParam.xkkz_id} 的完整参数`)
        continue
      }
      
      console.log('成功获取完整参数')
      
      // 4. 构建请求表单数据
      console.log('构建请求表单数据...')
      const formDataPart1 = buildFormDataPart1(completeParams, tabParam)
      
      // 5. 获取所有页面的课程数据
      console.log('开始获取所有页面的课程数据...')
      const allCourses: CourseData[] = []
      
      const kklxdm = tabParam.kklxdm
      let jspage = 10
      if (kklxdm === '01') {
        jspage = 10
      } else if (kklxdm === '10') {
        jspage = 120 // 120页，每10页为一组
      } else if (kklxdm === '05') {
        jspage = 10
      }
      
      console.log(`根据kklxdm=${kklxdm}设置jspage=${jspage}`)
      
      // 计算需要多少组
      const groups = Math.ceil(jspage / 10)
      console.log(`需要获取 ${groups} 组数据`)
      
      for (let group = 0; group < groups; group++) {
        const startPage = group * 10 + 1
        const endPage = Math.min((group + 1) * 10, jspage)
        console.log(`\n=== 获取第 ${group + 1}/${groups} 组数据 (第${startPage}-${endPage}页) ===`)
        
        // 设置这一批的kspage和jspage参数
        const formData = { ...formDataPart1 }
        formData['kspage'] = startPage.toString()
        formData['jspage'] = endPage.toString()
        console.log(`设置kspage=${startPage}, jspage=${endPage}`)
        
        // 发送请求
        console.log('发送请求...')
        const response = await sendCourseRequest(formData, cookie, schoolId)
        
        if (response) {
          console.log('请求完成')
          
          // 收集课程数据
          let courses: any[] = []
          if (typeof response === 'object' && response.tmpList) {
            courses = response.tmpList
          } else if (Array.isArray(response)) {
            courses = response
          }
          
          const essentialCourses = extractEssentialData(courses)
          allCourses.push(...essentialCourses)
          console.log(`第${startPage}-${endPage}页获取到 ${essentialCourses.length} 个课程`)
        } else {
          console.error(`第${startPage}-${endPage}页请求失败`)
        }
      }
      
      console.log(`\n总共获取到 ${allCourses.length} 个课程`)
      
      if (allCourses.length > 0) {
        allResults.push({
          xkkz_id: tabParam.xkkz_id,
          kklxdm: tabParam.kklxdm,
          njdm_id: tabParam.njdm_id,
          zyh_id: tabParam.zyh_id,
          courses: allCourses
        })
      } else {
        console.log('没有获取到任何课程数据')
      }
    }
    
    // 6. 打印总结
    console.log(`\n=== 总结 ===`)
    console.log(`成功处理了 ${allResults.length} 个xkkz_id`)
    for (const result of allResults) {
      console.log(`xkkz_id: ${result.xkkz_id}, 课程数量: ${result.courses.length}`)
    }
    
    return allResults
    
  } catch (error) {
    console.error('获取课程数据时发生错误:', error)
    throw error
  }
}
