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
    
    // 方法1: 查找所有 type="hidden" 的 input 元素
    $('input[type="hidden"]').each((_, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      if (name) {
        initialParams[name] = value
        console.log(`隐藏参数: ${name} = ${value}`)
      }
    })
    
    // 方法2: 也查找所有 input 元素（有些可能没有明确指定 type="hidden"）
    $('input').each((_, element) => {
      const type = $(element).attr('type')
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      // 如果是隐藏字段或者没有指定type，也提取
      if (name && (type === 'hidden' || !type) && !initialParams[name]) {
        initialParams[name] = value
        if (type !== 'hidden') {
          console.log(`隐藏参数（无type）: ${name} = ${value}`)
        }
      }
    })
    
    // 特别检查关键参数是否存在
    if (initialParams.rwlx) {
      console.log(`✅ 初始页面找到 rwlx = ${initialParams.rwlx}`)
    } else {
      console.log(`⚠️ 初始页面未找到 rwlx 参数`)
    }
    
    if (initialParams.xklc) {
      console.log(`✅ 初始页面找到 xklc = ${initialParams.xklc}`)
    } else {
      console.log(`⚠️ 初始页面未找到 xklc 参数`)
    }
    
    console.log(`成功提取 ${Object.keys(initialParams).length} 个隐藏参数`)
    
    // 优先使用隐藏参数中的first*参数
    const firstKklxdm = initialParams.firstKklxdm
    const firstXkkzId = initialParams.firstXkkzId
    const firstNjdmId = initialParams.firstNjdmId
    const firstZyhId = initialParams.firstZyhId
    
    console.log(`🔍 检查隐藏参数中的first*参数: firstKklxdm=${firstKklxdm}, firstXkkzId=${firstXkkzId}, firstNjdmId=${firstNjdmId}, firstZyhId=${firstZyhId}`)
    
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
            // 优先使用隐藏参数中的first*参数，如果没有则使用onclick中的参数
            const kklxdm = firstKklxdm || args[1].trim().replace(/['"]/g, '')
            const xkkz_id = firstXkkzId || args[2].trim().replace(/['"]/g, '')
            const njdm_id = firstNjdmId || args[3].trim().replace(/['"]/g, '')
            const zyh_id = firstZyhId || args[4].trim().replace(/['"]/g, '')
            
            tabParams.push({
              kklxdm,
              xkkz_id,
              njdm_id,
              zyh_id
            })
            
            console.log(`✅ 成功解析参数（优先使用first*参数）: kklxdm=${kklxdm}, xkkz_id=${xkkz_id}, njdm_id=${njdm_id}, zyh_id=${zyh_id}`)
          }
        }
      }
    })
    
    // 如果没有找到queryCourse，优先使用隐藏参数中的first*参数，否则使用默认值
    if (tabParams.length === 0) {
      if (firstKklxdm && firstXkkzId && firstNjdmId && firstZyhId) {
        console.log('未找到queryCourse函数，使用隐藏参数中的first*参数...')
        tabParams.push({
          kklxdm: firstKklxdm,
          xkkz_id: firstXkkzId,
          njdm_id: firstNjdmId,
          zyh_id: firstZyhId
        })
        console.log(`✅ 使用隐藏参数: kklxdm=${firstKklxdm}, xkkz_id=${firstXkkzId}, njdm_id=${firstNjdmId}, zyh_id=${firstZyhId}`)
      } else {
        console.log('未找到queryCourse函数且没有first*参数，使用默认的硬编码参数...')
        tabParams.push({
          kklxdm: '01',
          xkkz_id: '3EC380169F7E8633E0636F1310AC7E15',
          njdm_id: '2024',
          zyh_id: '088'
        })
      }
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
    
    // 使用 courseSelectionDisplay URL 获取完整参数
    // URL: zzxkyzb_cxZzxkYzbDisplay.html
    const displayUrl = urls.courseSelectionDisplay || urls.courseSelectionParams.replace('Index.html', 'Display.html')
    console.log(`📤 获取完整参数 - POST请求到: ${displayUrl}`)
    console.log(`📋 请求参数: ${formData.toString()}`)
    
    const response = await fetch(displayUrl, {
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
    
    // 方法1: 查找所有 type="hidden" 的 input 元素
    $('input[type="hidden"]').each((_, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      if (name) {
        completeParams[name] = value
        console.log(`提取参数: ${name} = ${value}`)
      }
    })
    
    // 方法2: 也查找所有 input 元素（有些可能没有明确指定 type="hidden"）
    $('input').each((_, element) => {
      const type = $(element).attr('type')
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      // 如果是隐藏字段或者没有指定type，也提取
      if (name && (type === 'hidden' || !type) && !completeParams[name]) {
        completeParams[name] = value
        if (type !== 'hidden') {
          console.log(`提取参数（无type）: ${name} = ${value}`)
        }
      }
    })
    
    // 特别检查关键参数是否存在
    if (completeParams.rwlx) {
      console.log(`✅ 找到 rwlx = ${completeParams.rwlx}`)
    } else {
      console.log(`⚠️ 未找到 rwlx 参数`)
    }
    
    if (completeParams.xklc) {
      console.log(`✅ 找到 xklc = ${completeParams.xklc}`)
    } else {
      console.log(`⚠️ 未找到 xklc 参数`)
    }
    
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
    console.log(`📋 所有参数键: ${Object.keys(completeParams).join(', ')}`)
    return completeParams
    
  } catch (error) {
    console.error('获取完整参数时发生异常:', error)
    return null
  }
}

// 构建第一部分表单数据（用于获取课程列表）
export function buildFormDataPart1(
  params: Record<string, string>,
  tabParam: TabParam,
  initialParams?: Record<string, string>
): Record<string, string> {
  const kklxdm = tabParam.kklxdm
  
  // 合并参数：优先使用 params（completeParams），如果 params 中没有或为空字符串，则使用 initialParams
  const mergedParams: Record<string, string> = {}
  if (initialParams) {
    // 先复制 initialParams
    Object.assign(mergedParams, initialParams)
  }
  // 然后用 params 覆盖（params 优先级更高），但如果 params 中的值是空字符串，则保留 initialParams 的值
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      mergedParams[key] = params[key]
    } else if (mergedParams[key] === undefined) {
      // 如果 params 中是空字符串，但 mergedParams 中也没有，则使用空字符串
      mergedParams[key] = params[key] || ''
    }
    // 如果 params 中是空字符串，但 mergedParams 中已经有值（来自 initialParams），则保留 initialParams 的值
  }
  
  console.log(`🔍 合并后的参数数量: ${Object.keys(mergedParams).length}`)
  console.log(`🔍 合并参数示例: xqh_id=${mergedParams.xqh_id}, jg_id=${mergedParams.jg_id}, zyh_id=${mergedParams.zyh_id}, njdm_id=${mergedParams.njdm_id}`)
  
  // 优先使用从页面获取的参数（先检查completeParams，再检查initialParams），如果没有则根据kklxdm计算默认值
  // 注意：即使值是空字符串，也要使用页面值（除非是undefined或null）
  let rwlx = (mergedParams.rwlx !== undefined && mergedParams.rwlx !== null && mergedParams.rwlx !== '') 
    ? mergedParams.rwlx 
    : null
  let xklc = (mergedParams.xklc !== undefined && mergedParams.xklc !== null && mergedParams.xklc !== '') 
    ? mergedParams.xklc 
    : null
  
  console.log(`🔍 从合并参数获取: rwlx=${mergedParams.rwlx}, xklc=${mergedParams.xklc}`)
  
  // 如果页面参数中没有（undefined或null或空字符串），则根据kklxdm计算
  if (rwlx === null || rwlx === undefined || rwlx === '') {
    console.log(`⚠️ 页面参数中没有rwlx，根据kklxdm=${kklxdm}计算默认值`)
    if (kklxdm === '01') {
      rwlx = '1'
    } else if (kklxdm === '10') {
      rwlx = '2'
    } else if (kklxdm === '05') {
      rwlx = '2'
    } else {
      rwlx = '1'
    }
  } else {
    console.log(`✅ 使用页面获取的rwlx=${rwlx}`)
  }
  
  if (xklc === null || xklc === undefined || xklc === '') {
    console.log(`⚠️ 页面参数中没有xklc，根据kklxdm=${kklxdm}计算默认值`)
    if (kklxdm === '01') {
      xklc = '2'
    } else if (kklxdm === '10') {
      xklc = '4'
    } else if (kklxdm === '05') {
      xklc = '3'
    } else {
      xklc = '2'
    }
  } else {
    console.log(`✅ 使用页面获取的xklc=${xklc}`)
  }
  
  // 基础参数 - 优先使用合并后的参数
  const formData: Record<string, string> = {
    'rwlx': rwlx,
    'xklc': xklc,
    'xkly': mergedParams.xkly || '0',
    'bklx_id': mergedParams.bklx_id || '0',
    'sfkkjyxdxnxq': mergedParams.sfkkjyxdxnxq || '0',
    'kzkcgs': mergedParams.kzkcgs || '0'
  }
  
  console.log(`✅ 基础参数: rwlx=${rwlx}, xklc=${xklc}, xkly=${formData.xkly}, bklx_id=${formData.bklx_id}`)
  
  // 必需参数列表（如果缺失应该报错）
  const requiredFields = [
    'xqh_id', 'jg_id', 'zyh_id', 'zyfx_id', 'njdm_id', 'bh_id', 
    'xbm', 'xslbdm', 'mzm', 'xz', 'ccdm', 'xsbj', 'xkxnm', 'xkxqm'
  ]
  
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
  
  // 从合并参数中获取值，优先使用页面参数
  const missingRequiredFields: string[] = []
  
  for (const field of dynamicFields) {
    // 优先使用合并后的参数（即使值是空字符串也要使用，除非是undefined或null）
    if (mergedParams[field] !== undefined && mergedParams[field] !== null) {
      formData[field] = mergedParams[field]
      // 如果是必需字段且为空字符串，记录错误
      if (requiredFields.includes(field) && mergedParams[field] === '') {
        missingRequiredFields.push(field)
        console.error(`❌ 必需字段 ${field} 的值为空字符串`)
      }
    } else if (defaultValues[field] !== undefined) {
      formData[field] = defaultValues[field]
      console.log(`⚠️ 字段 ${field} 使用默认值: ${defaultValues[field]}`)
    } else {
      formData[field] = ''
      // 如果是必需字段且为空，记录错误
      if (requiredFields.includes(field)) {
        missingRequiredFields.push(field)
        console.error(`❌ 必需字段 ${field} 未找到且无默认值`)
      }
    }
  }
  
  // 检查必需字段是否缺失
  if (missingRequiredFields.length > 0) {
    const errorMsg = `❌ 缺少必需参数或参数为空: ${missingRequiredFields.join(', ')}。请检查页面参数提取是否完整。`
    console.error(errorMsg)
    console.error(`📋 当前合并参数:`, JSON.stringify(mergedParams, null, 2))
    throw new Error(errorMsg)
  }
  
  console.log(`✅ 所有必需参数已填充`)
  
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
    
    // 查询可选课程的URL: zzxkyzb_cxZzxkYzbPartDisplay.html
    // 这个接口用于获取可选课程列表，参数是动态从页面获取的
    const url = `${urls.availableCourses}`
    
    const formDataStr = new URLSearchParams(formData).toString()
    
    console.log(`📤 查询可选课程 - POST请求到: ${url}`)
    console.log(`📋 请求参数:`, formData)
    
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
export function extractEssentialData(
  courseData: any[], 
  urlParams?: Record<string, string>,
  formParams?: Record<string, string>
): CourseData[] {
  const essentialData: CourseData[] = []
  
  if (Array.isArray(courseData)) {
    for (const course of courseData) {
      // 正确解析人数字段
      const rawCapacity =
        course.jxbrs ??
        course.JXBRS ??
        course.krrl ??
        course.KRRL ??
        course.jxbrl ??
        course.JXBRL ??
        '0'
      const rawSelected =
        course.yxzrs ??
        course.YXZRS ??
        course.selected ??
        course.SELECTED ??
        course.selected_count ??
        course.selectedCount ??
        '0'
      
      const essentialCourse: CourseData = {
        jxb_id: course.jxb_id || '',
        do_jxb_id: course.do_jxb_id || course.jxb_id || '',
        kch_id: course.kch_id || course.kch || course.jxb_id || '',
        kcmc: course.kcmc || '',
        jsxx: course.jsxx || '',
        jxdd: course.jxdd || '',
        sksj: course.sksj || '',
        xf: course.xf || course.jxbxf || '',
        jxbrl: rawCapacity.toString(),
        yxzrs: rawSelected.toString(),
        kklxdm: course.kklxdm || '',
        // 保留原始数据，但确保人数字段正确
        ...course,
        jxbrs: rawCapacity.toString(),
        capacity: Number.parseInt(rawCapacity.toString(), 10) || 0,
        selected: Number.parseInt(rawSelected.toString(), 10) || 0,
        max_capacity: rawCapacity.toString(),
        selected_count: rawSelected.toString(),
        bjrs: rawCapacity.toString(),
        // 保存获取课程列表时使用的参数，用于后续选课（这些是实际发送请求时使用的值）
        // 优先使用 formParams 中的值（这是实际发送请求时使用的值），如果没有则保留 course 中的值
        _rwlx: (formParams?.rwlx !== undefined && formParams?.rwlx !== null) ? formParams.rwlx : (course._rwlx !== undefined ? course._rwlx : ''),
        _xklc: (formParams?.xklc !== undefined && formParams?.xklc !== null) ? formParams.xklc : (course._xklc !== undefined ? course._xklc : ''),
        _xkly: (formParams?.xkly !== undefined && formParams?.xkly !== null) ? formParams.xkly : (course._xkly !== undefined ? course._xkly : ''),
        _xkkz_id: (formParams?.xkkz_id !== undefined && formParams?.xkkz_id !== null) ? formParams.xkkz_id : (course._xkkz_id !== undefined ? course._xkkz_id : '')
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
      const formDataPart1 = buildFormDataPart1(completeParams, tabParam, initialParams)
      console.log(`📋 构建的表单数据（将保存到课程中）: rwlx=${formDataPart1.rwlx}, xklc=${formDataPart1.xklc}, xkly=${formDataPart1.xkly}, xkkz_id=${formDataPart1.xkkz_id}`)
      
      // 5. 获取所有页面的课程数据（并发获取，动态检测，直到没有数据）
      console.log('开始获取所有页面的课程数据（并发获取，动态检测）...')
      const allCourses: CourseData[] = []
      
      const kklxdm = tabParam.kklxdm
      let currentJspage = 10  // 从jspage=10开始
      let currentKspage = 0   // kspage从0开始
      let hasMoreData = true
      const CONCURRENT_BATCH_SIZE = 5  // 并发批次大小
      const MAX_CONCURRENT = 10  // 最大并发数
      
      console.log(`根据kklxdm=${kklxdm}，开始并发获取数据（并发数: ${CONCURRENT_BATCH_SIZE}）`)
      
      // 使用并发获取，但保留动态停止功能
      while (hasMoreData) {
        // 准备一批并发请求
        const batchRequests: Array<{ kspage: number, jspage: number, promise: Promise<any> }> = []
        
        // 创建一批并发请求
        for (let i = 0; i < CONCURRENT_BATCH_SIZE && hasMoreData; i++) {
          const formData = { ...formDataPart1 }
          formData['kspage'] = currentKspage.toString()
          formData['jspage'] = currentJspage.toString()
          
          console.log(`准备请求: kspage=${currentKspage}, jspage=${currentJspage}`)
          
          const requestPromise = sendCourseRequest(formData, cookie, schoolId)
          batchRequests.push({
            kspage: currentKspage,
            jspage: currentJspage,
            promise: requestPromise
          })
          
          // 准备下一批参数
          currentKspage = currentJspage + 1
          currentJspage += 10
        }
        
        // 并发执行这一批请求
        console.log(`\n=== 并发执行 ${batchRequests.length} 个请求 ===`)
        const batchResults = await Promise.allSettled(
          batchRequests.map(req => req.promise)
        )
        
        // 处理结果，按顺序检查
        let foundEmpty = false
        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i]
          const { kspage, jspage } = batchRequests[i]
          
          if (result.status === 'fulfilled' && result.value) {
            // 收集课程数据
            let courses: any[] = []
            if (typeof result.value === 'object' && result.value.tmpList) {
              courses = result.value.tmpList
            } else if (Array.isArray(result.value)) {
              courses = result.value
            }
            
            // 检查是否有数据
            if (courses.length === 0) {
              console.log(`✅ kspage=${kspage}, jspage=${jspage} 没有数据，停止获取`)
              foundEmpty = true
              hasMoreData = false
              break  // 遇到空数据，停止后续处理
            } else {
              // 将获取课程列表时使用的参数传递给 extractEssentialData，保存到课程数据中
              const essentialCourses = extractEssentialData(courses, undefined, formDataPart1)
              allCourses.push(...essentialCourses)
              console.log(`✅ kspage=${kspage}, jspage=${jspage} 获取到 ${essentialCourses.length} 个课程`)
            }
          } else {
            console.error(`❌ kspage=${kspage}, jspage=${jspage} 请求失败`)
            // 如果请求失败，也停止获取
            foundEmpty = true
            hasMoreData = false
            break
          }
        }
        
        // 如果这一批中有空数据，停止获取
        if (foundEmpty) {
          break
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
