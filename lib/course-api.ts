// 完全独立的Next.js选课API实现
import * as cheerio from 'cheerio'
import { withCache, cacheKeys } from './api-cache'

// 使用Node.js全局对象存储Cookie，避免热重载时丢失
declare global {
  var __globalCookie: string | undefined
}

// 设置全局Cookie
export function setGlobalCookie(cookie: string) {
  global.__globalCookie = cookie
  console.log('🍪 Cookie已设置，长度:', cookie.length)
}

// 获取全局Cookie
export function getGlobalCookie(): string {
  const cookie = global.__globalCookie || ''
  console.log('🍪 获取Cookie，长度:', cookie.length)
  return cookie
}

// 创建robust HTTP请求配置
function createRequestConfig(method: string = 'GET', body?: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'Origin': 'https://newjwc.tyust.edu.cn',
    'Priority': 'u=0, i',
    'Referer': 'https://newjwc.tyust.edu.cn/jwglxt/xsxk/zzxkyzb_cxZzxkYzbIndex.html?gnmkdm=N253512&layout=default',
    'Sec-Ch-Ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
  }

  const cookie = getGlobalCookie()
  if (cookie) {
    headers['Cookie'] = cookie
  }

  return {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(30000), // 30秒超时
  }
}

// 带重试机制的fetch请求
async function robustFetch(url: string, config: any, retries: number = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 确保URL被正确编码
      const encodedUrl = encodeURI(url)
      const response = await fetch(encodedUrl, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: config.signal
      })

      if (response.ok) {
        return response
      }

      if (response.status >= 500 && attempt < retries) {
        console.log(`请求失败，状态码: ${response.status}，第${attempt + 1}次重试...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }

      return response

    } catch (error) {
      lastError = error as Error

      if (attempt < retries) {
        console.log(`网络请求失败: ${error}，第${attempt + 1}次重试...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
    }
  }

  throw lastError || new Error('请求失败')
}

// 从Cookie中提取学生参数
function extractStudentParamsFromCookie(cookieStr: string) {
  const params: Record<string, string> = {}
  if (!cookieStr) return params
  
  try {
    // 从webvpn_username中提取学号信息
    const webvpnMatch = cookieStr.match(/webvpn_username=([^;]+)/)
    if (webvpnMatch) {
      const username = decodeURIComponent(webvpnMatch[1])
      const parts = username.split('@')
      if (parts.length >= 3) {
        params.xh_id = parts[0]
        params.njdm_id = parts[1]
        params.zyh_id = parts[2]
      }
    }
    
    // 从其他Cookie中提取参数
    const xkxnmMatch = cookieStr.match(/xkxnm=([^;]+)/)
    if (xkxnmMatch) {
      params.xkxnm = decodeURIComponent(xkxnmMatch[1])
    }
    
    const xkxqmMatch = cookieStr.match(/xkxqm=([^;]+)/)
    if (xkxqmMatch) {
      params.xkxqm = decodeURIComponent(xkxqmMatch[1])
    }
  } catch (error) {
    console.error('解析Cookie参数失败:', error)
  }
  
  return params
}

// 从HTML页面提取参数
function extractParamsFromPage(html: string, pageName: string) {
  const $ = cheerio.load(html)
  const params: Record<string, string> = {}
  
  // 提取所有input字段
  $('input').each((i, element) => {
    const $el = $(element)
    const id = $el.attr('id')
    const name = $el.attr('name')
    const value = $el.attr('value')
    
    if (id && value) {
      params[id] = value
    }
    if (name && name !== id && value) {
      params[name] = value
    }
  })
  
  // 从JavaScript代码中提取参数
  $('script').each((i, element) => {
    const scriptContent = $(element).html()
    if (scriptContent) {
      // 匹配各种参数模式
      const patterns = [
        /["'](\w+)["']\s*:\s*["']([^"']+)["']/g,  // 'param': 'value'
        /(\w+)\s*[:=]\s*["']([^"']+)["']/g,        // param: 'value'
        /name=["'](\w+)["'].*?value=["']([^"']+)["']/g,  // name='param' value='value'
      ]
      
      patterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(scriptContent)) !== null) {
          if (match.length >= 3) {
            params[match[1]] = match[2]
          }
        }
      })
    }
  })
  
  // 特殊处理学生信息页面
  if (pageName === '学生信息页面') {
    const xhId = params.xh_id || ''
    if (xhId && xhId.length >= 8) {
      // 学号格式：202420010138，前4位是年级，5-8位是专业
      params.njdm_id = xhId.substring(0, 4)
      params.zyh_id = xhId.substring(4, 8)
    }
    
    // 学年学期信息
    if (params.xnm) {
      params.xkxnm = params.xnm
    }
    if (params.xqm) {
      params.xkxqm = params.xqm
    }
  }
  
  console.log(`从${pageName}提取到 ${Object.keys(params).length} 个参数`)
  return params
}

// 获取学生信息 - 基于原始Python项目的完整实现
export async function getStudentInfo() {
  return withCache(cacheKeys.studentInfo, async () => {
    try {
      const config = createRequestConfig('GET')
      const timestamp = Date.now()
      const url = `https://newjwc.tyust.edu.cn/jwglxt/xtgl/index_cxYhxxIndex.html?xt=jw&localeKey=zh_CN&_=${timestamp}&gnmkdm=index`
      
      console.log('🔍 正在获取学生信息...')
      const response = await robustFetch(url, config)
    
    if (!response.ok) {
      throw new Error(`获取学生信息失败，状态码: ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // 基于原始Python项目的实现：查找h4标签的media-heading类
    const nameElement = $('h4.media-heading')
    const name = nameElement.text().trim() || '未知'
    
    console.log('👤 获取到学生姓名:', name)
    
    // 提取其他学生信息
    const studentId = $('#xh').val() as string || $('input[name="xh"]').val() as string || ''
    const njdmId = $('#njdm_id').val() as string || $('input[name="njdm_id"]').val() as string || ''
    const zyhId = $('#zyh_id').val() as string || $('input[name="zyh_id"]').val() as string || ''
    const xnm = $('#xnm').val() as string || $('input[name="xnm"]').val() as string || '2025'
    const xqm = $('#xqm').val() as string || $('input[name="xqm"]').val() as string || '3'
    
    // 从Cookie中提取参数
    const cookieParams = extractStudentParamsFromCookie(getGlobalCookie())
    
    const studentInfo = {
      student_id: cookieParams.xh_id || studentId,
      njdm_id: cookieParams.njdm_id || njdmId,
      zyh_id: cookieParams.zyh_id || zyhId,
      name: name,
      grade: njdmId || '未知',
      major: '未知',
      college: '未知',
      class_name: '未知',
      academic_year: cookieParams.xkxnm || xnm,
      semester: cookieParams.xkxqm || xqm
    }
    
      console.log('✅ 学生信息获取成功:', studentInfo)
      return studentInfo
    } catch (error) {
      console.error('❌ 获取学生信息失败:', error)
      throw error
    }
  }, 10 * 60 * 1000) // 学生信息缓存10分钟
}

// 获取选课参数
async function getCourseSelectionParams() {
  try {
    const config = createRequestConfig('GET')
    const url = 'https://newjwc.tyust.edu.cn/jwglxt/xsxk/zzxkyzb_cxZzxkYzbIndex.html?gnmkdm=N253512&layout=default'
    const response = await robustFetch(url, config)
    
    if (!response.ok) {
      throw new Error(`获取选课参数失败，状态码: ${response.status}`)
    }
    
    const html = await response.text()
    const params = extractParamsFromPage(html, '选课页面')
    
    // 从Cookie中获取备用参数
    const cookieParams = extractStudentParamsFromCookie(getGlobalCookie())
    
    return {
      njdm_id: params.njdm_id || cookieParams.njdm_id || '2024',
      zyh_id: params.zyh_id || cookieParams.zyh_id || '2001',
      xkxnm: params.xkxnm || cookieParams.xkxnm || '2025',
      xkxqm: params.xkxqm || cookieParams.xkxqm || '3',
      jcxx_id: params.jcxx_id || '',
      xkkz_id: params.xkkz_id || ''
    }
  } catch (error) {
    console.error('获取选课参数失败:', error)
    // 返回默认参数
    const cookieParams = extractStudentParamsFromCookie(getGlobalCookie())
    return {
      njdm_id: cookieParams.njdm_id || '2024',
      zyh_id: cookieParams.zyh_id || '2001',
      xkxnm: cookieParams.xkxnm || '2025',
      xkxqm: cookieParams.xkxqm || '3',
      jcxx_id: '',
      xkkz_id: ''
    }
  }
}

// 解析课程数据 - 基于原始Python项目的实现
function parseCourseData(jsonData: any) {
  const courses: any[] = []
  
  if (jsonData && jsonData.tmpList && Array.isArray(jsonData.tmpList)) {
    jsonData.tmpList.forEach((course: any) => {
      courses.push({
        kch_id: course.kch_id || course.kch || '',
        kcmc: course.kcmc || '',
        jxb_id: course.jxb_id || '',
        jsxm: course.jsxm || course.jsxx || '',
        kclb: course.kclb || '',
        xf: course.xf || '',
        sksj: course.sksj || '',
        skdd: course.skdd || course.jxdd || '',
        bjrs: course.bjrs || course.jxbrl || '',
        yxrs: course.yxrs || course.yxzrs || '',
        kkxy: course.kkxy || course.kkxymc || '',
        kkzy: course.kkzy || course.kkzymc || '',
        kkxq: course.kkxq || course.xqumc || '',
        kkzc: course.kkzc || '',
        kkdm: course.kkdm || '',
        kkmm: course.kkmm || '',
        kkms: course.kkms || '',
        kkzt: course.kkzt || '',
        kkztmc: course.kkztmc || '',
        kkztms: course.kkztms || '',
        do_jxb_id: course.do_jxb_id || '',
        jxbzls: course.jxbzls || '',
        xkkz_id: course.xkkz_id || '',
        type_course: course.type_course || '未知',
        detailed_teacher: course.detailed_teacher || '',
        detailed_time: course.detailed_time || '',
        detailed_location: course.detailed_location || ''
      })
    })
  }
  
  return courses
}

// 获取可选课程 - 基于原始Python项目的实现
// 获取课程详细信息 - 基于Python版本的实现
async function getAvailableCourseDetails(kch_id: string, xkkz_id: string = '', jxb_id: string = '') {
  try {
    const params = await getCourseSelectionParams()
    
    // 确保kch_id是字符串类型
    if (typeof kch_id !== 'string') {
      kch_id = String(kch_id)
    }
    
    // 对kch_id进行URL编码
    kch_id = encodeURIComponent(kch_id)
    
    // 如果提供了xkkz_id或jxb_id，也进行URL编码
    if (xkkz_id) {
      xkkz_id = encodeURIComponent(xkkz_id)
    }
    if (jxb_id) {
      jxb_id = encodeURIComponent(jxb_id)
    }
    
    const url = 'https://newjwc.tyust.edu.cn/jwglxt/xsxk/zzxkyzbjk_cxJxbWithKchZzxkYzb.html?gnmkdm=N253512'
    
    // 构建表单数据 - 使用动态参数
    const formDataParts = [
      'rwlx=1', 'xkly=0', 'bklx_id=0', 'sfkkjyxdxnxq=0', 'xqh_id=4', 'jg_id=20',
      `zyh_id=${params.zyh_id}`, 'zyfx_id=wfx', 
      `njdm_id=${params.njdm_id}`, 'bh_id=2024200101', 'xbm=1',
      'xslbdm=wlb', 'mzm=01', 'xz=4', 'ccdm=3', 'xsbj=4294967296', 'sfkknj=0',
      'gnjkxdnj=0', 'sfkkzy=0', 'kzybkxy=0', 'sfznkx=0', 'zdkxms=0', 'sfkxq=0',
      'sfkcfx=0', 'bbhzxjxb=0', 'kkbk=0', 'kkbkdj=0', 
      `xkxnm=${params.xkxnm}`, 
      `xkxqm=${params.xkxqm}`,
      'xkxskcgskg=0', 'rlkz=0', 'kklxdm=01', `kch_id=${kch_id}`, 'jxbzcxskg=0'
    ]
    
    // 根据提供的参数添加特定参数
    if (jxb_id) {
      formDataParts.push(`jxb_id=${jxb_id}`)
    } else if (xkkz_id) {
      formDataParts.push(`xkkz_id=${xkkz_id}`)
    }
    
    // 添加其他参数
    formDataParts.push('cxbj=0', 'fxbj=0')
    
    const formData = formDataParts.join('&')
    
    const config = createRequestConfig('POST', formData)
    const response = await robustFetch(url, config)
    
    if (response.ok) {
      const result = await response.json()
      // 检查返回的数据是否有效
      if (result && Array.isArray(result) && result.length > 0 && result[0] !== "0") {
        return result
      } else {
        return null
      }
    } else {
      console.error(`获取课程详细信息失败，状态码: ${response.status}`)
      return null
    }
  } catch (error) {
    console.error('获取课程详细信息异常:', error)
    return null
  }
}

export async function getAvailableCourses() {
  return withCache(cacheKeys.availableCourses('all'), async () => {
    try {
      const params = await getCourseSelectionParams()
      const allCourses: any[] = []
    
    // 课程类型列表 - 基于course_api_json.py的实现
    const courseTypes = [
      { kklxdm: '01', typeName: '必修' },
      { kklxdm: '10', typeName: '选修' }
    ]
    
    for (const { kklxdm, typeName } of courseTypes) {
      console.log(`🔍 正在获取${typeName}课程...`)
      
      // 基于Python程序的完整参数列表 - 使用字符串拼接方式
      const formData = `rwlx=1&xkly=0&bklx_id=0&sfkkjyxdxnxq=0&xqh_id=4&jg_id=20&` +
        `njdm_id_1=${params.njdm_id}&zyh_id_1=${params.zyh_id}&` +
        `zyh_id=${params.zyh_id}&zyfx_id=wfx&njdm_id=${params.njdm_id}&` +
        `bh_id=2024200101&bjgkczxbbjwcx=0&xbm=1&xslbdm=wlb&mzm=01&xz=4&` +
        `ccdm=3&xsbj=4294967296&sfkknj=0&gnjkxdnj=0&sfkkzy=0&kzybkxy=0&` +
        `sfznkx=0&zdkxms=0&sfkxq=0&sfkcfx=0&kkbk=0&kkbkdj=0&sfkgbcx=0&` +
        `sfrxtgkcxd=0&tykczgxdcs=0&xkxnm=${params.xkxnm}&` +
        `xkxqm=${params.xkxqm}&kklxdm=${kklxdm}&bbhzxjxb=0&` +
        `rlkz=0&xkzgbj=0&kspage=1&jspage=10&jxbzb=`
      
      const config = createRequestConfig('POST', formData.toString())
      const url = 'https://newjwc.tyust.edu.cn/jwglxt/xsxk/zzxkyzb_cxZzxkYzbPartDisplay.html?gnmkdm=N253512'
      const response = await robustFetch(url, config)
      
      if (!response.ok) {
        console.error(`获取${typeName}课程失败，状态码: ${response.status}`)
        continue
      }
      
      const jsonData = await response.json()
      console.log(`📚 ${typeName}课程的JSON响应:`, JSON.stringify(jsonData, null, 2))
      const courses = parseCourseData(jsonData)
      console.log(`📚 ${typeName}课程解析到 ${courses.length} 门课程`)
      
      // 为课程添加类型信息
      courses.forEach(course => {
        course.type_course = typeName
        course.kklxdm = kklxdm
      })
      
      allCourses.push(...courses)
    }
    
    // 为所有课程添加详细信息 - 基于Python版本的实现
    if (allCourses.length > 0) {
      console.log('🔍 正在获取课程详细信息...')
      
      // 获取第一个课程的详细信息作为全局详细信息
      const firstCourse = allCourses[0]
      const kch_id = firstCourse.kch || firstCourse.kch_id || ''
      const xkkz_id = firstCourse.xkkz_id || ''
      
      if (kch_id) {
        const courseDetails = await getAvailableCourseDetails(kch_id, xkkz_id)
        if (courseDetails && Array.isArray(courseDetails) && courseDetails.length > 0) {
          console.log(`✅ 获取课程详细信息成功，数据条数: ${courseDetails.length}`)
          
          // 为所有课程添加详细信息
          allCourses.forEach(course => {
            course.course_details = courseDetails
          })
          
          console.log('✅ 所有课程详细信息添加完成')
        } else {
          console.log('⚠️ 获取课程详细信息失败')
        }
      }
    }
    
      return allCourses
    } catch (error) {
      console.error('获取可选课程失败:', error)
      throw error
    }
  }, 3 * 60 * 1000) // 可选课程缓存3分钟
}

// 解析已选课程数据 - 基于原始Python项目的实现
function parseSelectedCourseData(jsonData: any) {
  const courses: any[] = []
  
  if (jsonData && jsonData.tmpList && Array.isArray(jsonData.tmpList)) {
    jsonData.tmpList.forEach((course: any) => {
      courses.push({
        kch_id: course.kch_id || '',
        kcmc: course.kcmc || '',
        jxb_id: course.jxb_id || '',
        jsxm: course.jsxm || course.jsxx || '',
        kclb: course.kclb || '',
        xf: course.xf || '',
        sksj: course.sksj || '',
        skdd: course.skdd || course.jxdd || '',
        bjrs: course.bjrs || course.jxbrl || '',
        yxrs: course.yxrs || course.yxzrs || '',
        kkxy: course.kkxy || course.kkxymc || '',
        kkzy: course.kkzy || course.kkzymc || '',
        kkxq: course.kkxq || course.xqumc || '',
        kkzc: course.kkzc || '',
        kkdm: course.kkdm || '',
        kkmm: course.kkmm || '',
        kkms: course.kkms || '',
        kkzt: course.kkzt || '',
        kkztmc: course.kkztmc || '',
        kkztms: course.kkztms || '',
        do_jxb_id: course.do_jxb_id || '',
        jxbzls: course.jxbzls || ''
      })
    })
  }
  
  return courses
}

// 获取已选课程 - 基于course_api_json.py的实现
export async function getSelectedCourses() {
  return withCache(cacheKeys.selectedCourses, async () => {
    try {
      console.log('🔍 开始获取已选课程...')
      const params = await getCourseSelectionParams()
      console.log('📋 已选课程查询参数:', params)
    
    // 基于Python程序的已选课程查询实现 - 使用字符串拼接方式
    const formData = `xkxnm=${params.xkxnm}&` +
      `zyh_id=${params.zyh_id}&` +
      `xz=4&njdm_id=${params.njdm_id}&` +
      `xkly=0&ccdm=3&bh_id=2024200101&jg_id=20&zyfx_id=wfx&` +
      `xkxqm=${params.xkxqm}`
    
    console.log('📤 已选课程请求数据:', formData)
    
    const config = createRequestConfig('POST', formData.toString())
    const url = 'https://newjwc.tyust.edu.cn/jwglxt/xsxk/zzxkyzb_cxZzxkYzbChoosedDisplay.html?gnmkdm=N253512'
    console.log('🌐 已选课程请求URL:', url)
    
    const response = await robustFetch(url, config)
    console.log('📡 已选课程响应状态:', response.status)
    
    if (!response.ok) {
      throw new Error(`获取已选课程失败，状态码: ${response.status}`)
    }
    
    const jsonData = await response.json()
    console.log('📚 已选课程JSON响应:', JSON.stringify(jsonData, null, 2))
    
    // 根据Python版本，直接返回JSON数据（可能是数组或对象）
    return jsonData
  } catch (error) {
      console.error('❌ 获取已选课程失败:', error)
      throw error
    }
  }, 3 * 60 * 1000) // 已选课程缓存3分钟
}

// 格式化已选课程数据 - 基于course_api_json.py的format_selected_courses_json函数
export function formatSelectedCoursesData(data: any) {
  console.log('🔧 开始格式化已选课程数据...')
  
  if (!data) {
    console.log('⚠️ 没有已选课程数据')
    return { error: "没有已选课程数据" }
  }
  
  const result = {
    courses: [] as any[]
  }
  
  // 处理数据格式 - 可能是数组或对象
  let coursesArray: any[] = []
  if (Array.isArray(data)) {
    coursesArray = data
  } else if (data && typeof data === 'object') {
    // 如果是对象，尝试提取数组
    coursesArray = data.tmpList || data.courses || data.data || []
  }
  
  console.log(`📊 找到 ${coursesArray.length} 门已选课程`)
  
  // 遍历所有已选课程
  for (const course of coursesArray) {
    if (!course || typeof course !== 'object') {
      continue
    }
    
    // 获取课程基本信息 - 基于Python版本的字段映射
    const courseInfo = {
      course_id: course.kch || '',
      course_name: course.kcmc || '',
      class_name: course.jxbmc || '',
      credit: course.xf || '',
      teacher: '',
      time: course.sksj || '未知时间',
      location: course.jxdd || '未知地点',
      selected_count: course.yxzrs || '0',
      operation: '已选',
      // 添加更多字段用于前端显示
      kch_id: course.kch_id || course.kch || '',
      jxb_id: course.jxb_id || '',
      kklxdm: course.kklxdm || '',
      jxbzls: course.jxbzls || '',
      jsxx: course.jsxx || '',
      jsxm: course.jsxm || '',
      jszc: course.jszc || ''
    }
    
    // 教师信息处理 - 基于Python版本的逻辑
    const teacherInfo = course.jsxx || '' // 格式如 "2006078/卫郭敏/教授"
    if (teacherInfo && teacherInfo.includes('/')) {
      const parts = teacherInfo.split('/')
      const teacherName = parts[1] || '未知教师'
      const teacherTitle = parts[2] || ''
      courseInfo.teacher = `${teacherName} ${teacherTitle}`.trim()
    } else {
      const teacherName = course.jsxm || '未知教师'
      const teacherTitle = course.jszc || ''
      courseInfo.teacher = `${teacherName} ${teacherTitle}`.trim()
    }
    
    result.courses.push(courseInfo)
  }
  
  console.log(`✅ 已选课程格式化完成，共 ${result.courses.length} 门课程`)
  return result
}

// 获取课程详细信息 - 基于原始Python项目的实现
export async function getCourseDetails(kch_id: string) {
  try {
    const params = await getCourseSelectionParams()
    
    const formData = new URLSearchParams({
      rwlx: '1',
      xkly: '0',
      bklx_id: '0',
      sfkkjyxdxnxq: '0',
      xqh_id: '4',
      jg_id: '20',
      zyh_id: params.zyh_id,
      zyfx_id: 'wfx',
      njdm_id: params.njdm_id,
      bh_id: '2024200101',
      xbm: '1',
      xslbdm: 'wlb',
      mzm: '01',
      xz: '4',
      ccdm: '3',
      xsbj: '4294967296',
      sfkknj: '0',
      gnjkxdnj: '0',
      sfkkzy: '0',
      kzybkxy: '0',
      sfznkx: '0',
      zdkxms: '0',
      sfkxq: '0',
      sfkcfx: '0',
      bbhzxjxb: '0',
      kkbk: '0',
      kkbkdj: '0',
      xkxnm: params.xkxnm,
      xkxqm: params.xkxqm,
      xkxskcgskg: '0',
      rlkz: '0',
      kklxdm: '01',
      kch_id: kch_id,
      jxbzcxskg: '0',
      xkkz_id: params.xkkz_id || '',
      cxbj: '0',
      fxbj: '0'
    })
    
    const config = createRequestConfig('POST', formData.toString())
    const url = 'https://newjwc.tyust.edu.cn/jwglxt/xsxk/zzxkyzbjk_cxJxbWithKchZzxkYzb.html?gnmkdm=N253512'
    const response = await robustFetch(url, config)
    
    if (!response.ok) {
      throw new Error(`获取课程详细信息失败，状态码: ${response.status}`)
    }
    
    const jsonData = await response.json()
    return jsonData
  } catch (error) {
    console.error('获取课程详细信息失败:', error)
    throw error
  }
}

// 执行选课
export async function executeCourseSelection(courseData: {
  jxb_id: string
  do_jxb_id: string
  kch_id: string
  jxbzls: string
  kklxdm?: string
}) {
  try {
    if (!getGlobalCookie()) {
      return { flag: "0", msg: "Cookie未设置" }
    }
    
    const params = await getCourseSelectionParams()
    
    const formData = new URLSearchParams({
      jxb_ids: courseData.do_jxb_id,
      kch_id: courseData.jxb_id, // 使用jxb_id作为kch_id
      qz: '0',
      njdm_id: params.njdm_id,
      zyh_id: params.zyh_id,
      xkxnm: params.xkxnm,
      xkxqm: params.xkxqm,
      kklxdm: courseData.kklxdm || '01', // 课程类型代码 (01=必修, 10=选修)
      jcxx_id: params.jcxx_id || ''
    })
    
    const config = createRequestConfig('POST', formData.toString())
    const url = 'https://newjwc.tyust.edu.cn/jwglxt/xsxk/zzxkyzbjk_xkBcZyZzxkYzb.html?gnmkdm=N253512'
    const response = await robustFetch(url, config)
    
    if (!response.ok) {
      return { flag: "0", msg: `请求失败，状态码: ${response.status}` }
    }
    
    try {
      const result = await response.json()
      console.log('📥 选课响应数据:', JSON.stringify(result, null, 2))
      return result
    } catch (jsonError) {
      const textResult = await response.text()
      console.log('❌ JSON解析失败，原始响应:', textResult)
      return { flag: "0", msg: "响应解析失败", raw_response: textResult }
    }
  } catch (error) {
    console.error('选课失败:', error)
    return { flag: "0", msg: `发生错误: ${error}` }
  }
}

// 解析选课结果
export function parseCourseSelectionResult(result: any, courseInfo?: any) {
  const flag = result.flag || '0'
  const message = result.msg || result.message || '未知错误'
  const flagSuccess = flag === '1'
  
  return {
    flag,
    message,
    flag_success: flagSuccess,
    success: flagSuccess,
    raw_result: result
  }
}

// 验证选课结果（检查是否在已选课程中）
export async function verifyCourseSelection(courseInfo: {
  kch_id: string
  jxb_id: string
  kcmc?: string
  jxbmc?: string
}) {
  try {
    const selectedCourses = await getSelectedCourses()
    
    if (Array.isArray(selectedCourses)) {
      for (const course of selectedCourses) {
        const courseId = course.course_id || course.kch_id || course.kch || ''
        const jxbId = course.jxb_id || course.jxbid || ''
        
        if (courseId === courseInfo.kch_id && jxbId === courseInfo.jxb_id) {
          return {
            in_selected: true,
            verification_message: `课程《${courseInfo.kcmc || '未知'}》已在已选课程中`
          }
        }
      }
    } else if (selectedCourses && (selectedCourses as any).courses && Array.isArray((selectedCourses as any).courses)) {
      for (const course of (selectedCourses as any).courses) {
        const courseId = course.course_id || ''
        if (courseId === courseInfo.kch_id) {
          return {
            in_selected: true,
            verification_message: `课程《${courseInfo.kcmc || '未知'}》已在已选课程中`
          }
        }
      }
    }
    
    return {
      in_selected: false,
      verification_message: `课程《${courseInfo.kcmc || '未知'}》未在已选课程中找到`
    }
  } catch (error) {
    return {
      in_selected: false,
      verification_message: `验证过程出错: ${error}`
    }
  }
}

// 综合选课功能（包含验证）
export async function selectCourseWithVerification(courseInfo: {
  jxb_id: string
  do_jxb_id: string
  kch_id: string
  jxbzls: string
  kklxdm?: string
  kcmc?: string
  jxbmc?: string
}) {
  try {
    const result = await executeCourseSelection(courseInfo)
    const parsedResult = parseCourseSelectionResult(result, courseInfo)
    const verification = await verifyCourseSelection({
      kch_id: courseInfo.kch_id,
      jxb_id: courseInfo.jxb_id,
      kcmc: courseInfo.kcmc,
      jxbmc: courseInfo.jxbmc
    })
    
    const finalSuccess = parsedResult.flag_success && verification.in_selected
    
    console.log('\n📊 选课结果综合判断:')
    console.log(`   📍 网站返回标志: ${parsedResult.flag} (${parsedResult.flag_success ? '✅ 成功' : '❌ 失败'})`)
    console.log(`   📍 网站返回消息: ${parsedResult.message}`)
    console.log(`   🔍 已选课程验证: ${verification.in_selected ? '✅ 已选上' : '❌ 未选上'}`)
    console.log(`   🔍 验证详情: ${verification.verification_message}`)
    console.log(`   🎯 最终结果: ${finalSuccess ? '🎉 选课成功！' : '❌ 选课失败'}`)
    
    return {
      ...parsedResult,
      verification,
      success: finalSuccess
    }
  } catch (error) {
    console.error('选课过程出错:', error)
    return {
      flag: '0',
      message: `选课过程出错: ${error}`,
      flag_success: false,
      success: false,
      verification: {
        in_selected: false,
        verification_message: `选课过程出错: ${error}`
      }
    }
  }
}

// 获取课表数据
export async function getScheduleData(): Promise<any> {
  return withCache(cacheKeys.scheduleData, async () => {
    const cookie = getGlobalCookie()
    if (!cookie) {
      throw new Error('Cookie未设置')
    }

  console.log('📅 开始获取课表数据...')

  try {
    // 首先获取课表页面，提取学年学期信息和csrftoken
    const schedulePageUrl = 'https://newjwc.tyust.edu.cn/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N253508&layout=default'
    
    const pageResponse = await robustFetch(schedulePageUrl, {
      method: 'GET',
      headers: {
        'Referer': 'https://newjwc.tyust.edu.cn/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N253508&layout=default',
        'Cookie': cookie
      }
    })

    if (!pageResponse.ok) {
      throw new Error(`获取课表页面失败: ${pageResponse.status}`)
    }

    const pageHtml = await pageResponse.text()
    console.log('📅 课表页面HTML长度:', pageHtml.length)
    
    // 检查是否包含登录页面
    if (pageHtml.includes('登录') || pageHtml.toLowerCase().includes('login')) {
      throw new Error('Cookie可能无效或已过期，请检查Cookie设置')
    }
    
    const $ = cheerio.load(pageHtml)

    // 提取学年信息
    let xnm = ''
    const xnmSelect = $('#xnm')
    console.log('📅 学年选择器找到:', xnmSelect.length > 0)
    if (xnmSelect.length > 0) {
      const selectedOption = xnmSelect.find('option[selected]')
      console.log('📅 学年选中选项:', selectedOption.length)
      if (selectedOption.length > 0) {
        xnm = selectedOption.attr('value') || ''
        console.log('📅 学年值:', xnm)
      } else {
        // 如果没有选中的选项，尝试获取第一个选项
        const firstOption = xnmSelect.find('option').first()
        if (firstOption.length > 0) {
          xnm = firstOption.attr('value') || ''
          console.log('📅 使用第一个学年选项:', xnm)
        }
      }
    }

    // 提取学期信息
    let xqm = ''
    const xqmSelect = $('#xqm')
    console.log('📅 学期选择器找到:', xqmSelect.length > 0)
    if (xqmSelect.length > 0) {
      const selectedOption = xqmSelect.find('option[selected]')
      console.log('📅 学期选中选项:', selectedOption.length)
      if (selectedOption.length > 0) {
        xqm = selectedOption.attr('value') || ''
        console.log('📅 学期值:', xqm)
      } else {
        // 如果没有选中的选项，尝试获取第一个选项
        const firstOption = xqmSelect.find('option').first()
        if (firstOption.length > 0) {
          xqm = firstOption.attr('value') || ''
          console.log('📅 使用第一个学期选项:', xqm)
        }
      }
    }

    // 提取csrftoken
    let csrftoken = ''
    const csrftokenInput = $('#csrftoken')
    console.log('📅 csrftoken输入框找到:', csrftokenInput.length > 0)
    if (csrftokenInput.length > 0) {
      csrftoken = csrftokenInput.attr('value') || ''
      console.log('📅 csrftoken值:', csrftoken ? '已获取' : '未获取')
    }

    if (!xnm || !xqm) {
      console.log('📅 学年学期提取失败 - 学年:', xnm, '学期:', xqm)
      // 输出页面内容的一部分用于调试
      console.log('📅 页面内容片段:', pageHtml.substring(0, 1000))
      throw new Error('无法获取学年或学期信息')
    }

    console.log(`📅 学年: ${xnm}, 学期: ${xqm}, csrftoken: ${csrftoken ? '已获取' : '未获取'}`)

    // 构造获取课表数据的请求
    const scheduleUrl = 'https://newjwc.tyust.edu.cn/jwglxt/kbcx/xskbcx_cxXsKb.html?gnmkdm=N253508'
    
    const formData = new URLSearchParams()
    formData.append('xnm', xnm)
    formData.append('xqm', xqm)
    if (csrftoken) {
      formData.append('csrftoken', csrftoken)
    }

    const scheduleResponse = await robustFetch(scheduleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Referer': schedulePageUrl,
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookie
      },
      body: formData.toString()
    })

    if (!scheduleResponse.ok) {
      throw new Error(`获取课表数据失败: ${scheduleResponse.status}`)
    }

    const scheduleData = await scheduleResponse.json()
    console.log('📅 课表数据获取成功:', scheduleData)

      return scheduleData

    } catch (error) {
      console.error('📅 获取课表数据失败:', error)
      throw error
    }
  }, 5 * 60 * 1000) // 课表数据缓存5分钟
}

// 格式化课表数据
export function formatScheduleData(data: any): any[] {
  if (!data || !data.kbList || !Array.isArray(data.kbList)) {
    return []
  }

  const scheduleInfo: any[] = []

  for (const course of data.kbList) {
    // 解析星期几 (1=星期一, 2=星期二, ..., 7=星期日)
    const day = parseInt(course.xqj || '1')

    // 解析节次信息
    let period = 1
    const jcs = course.jcs || ''
    if (jcs) {
      const match = jcs.match(/(\d+)/)
      if (match) {
        period = parseInt(match[1])
      }
    }

    // 创建课程数据对象
    const courseData = {
      name: course.kcmc || '未知课程',
      teacher: course.xm || '未知教师',
      location: course.cdmc || '未知地点',
      day: day,
      period: period,
      time: course.jc || '',
      weeks: course.zcd || '',
      class: course.jxbmc || '',
      credit: course.xf || '',
      assessment: course.khfsmc || '',
      course_type: course.kcxz || '',
      campus: course.xqmc || '',
      hours: {
        total: course.zxs || '',
        lecture: course.kcxszc || ''
      }
    }

    scheduleInfo.push(courseData)
  }

  console.log(`📅 格式化课表数据完成，共 ${scheduleInfo.length} 门课程`)
  return scheduleInfo
}
