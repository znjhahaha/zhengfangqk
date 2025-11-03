// 基于Python版本fetch_course_json.py的课程API实现
import * as cheerio from 'cheerio'
import { withCache, cacheKeys, apiCache } from './api-cache'
import { getCurrentSchool, setCurrentSchool, getApiUrls, getSchoolById } from './global-school-state'

// 多用户会话支持
interface SessionCookie {
  sessionId: string
  cookie: string
  timestamp: number
}

const sessionCookies = new Map<string, SessionCookie>()

// 设置会话Cookie
export function setSessionCookie(sessionId: string, cookie: string): void {
  sessionCookies.set(sessionId, {
    sessionId,
    cookie,
    timestamp: Date.now()
  })
}

// 获取会话Cookie
export function getSessionCookie(sessionId: string): string | null {
  const session = sessionCookies.get(sessionId)
  if (session && Date.now() - session.timestamp < 30 * 60 * 1000) { // 30分钟过期
    return session.cookie
  }
  return null
}

// 获取全局Cookie
export function getGlobalCookie(): string {
  return getSessionCookie('default') || ''
}

// 创建robust HTTP请求配置（支持传入schoolId参数）
function createRequestConfig(method: string = 'GET', body?: string, sessionId?: string, tempCookie?: string, schoolId?: string) {
  const urls = getApiUrls(schoolId)
  const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
  
  const headers: Record<string, string> = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'Origin': `${currentSchool.protocol}://${currentSchool.domain}`,
    'Priority': 'u=0, i',
    'Referer': urls.getRefererHeader('course'),
    'Sec-Ch-Ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
  }

  // 优先使用临时Cookie，然后根据会话ID获取对应的Cookie
  let cookie = tempCookie
  if (!cookie && sessionId) {
    cookie = getSessionCookie(sessionId) || undefined
  }
  if (!cookie) {
    cookie = getGlobalCookie() || undefined
  }

  if (cookie) {
    headers['Cookie'] = cookie
  }

  const config: RequestInit = {
    method,
    headers,
  }

  if (body && method !== 'GET') {
    config.body = body
  }

  return config
}

// 带重试的fetch函数
async function robustFetch(url: string, config: RequestInit, maxRetries: number = 3): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, config)
      return response
    } catch (error) {
      lastError = error as Error
      console.warn(`请求失败 (尝试 ${attempt}/${maxRetries}):`, error)
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error('请求失败')
}

// 获取学生信息 - 基于原始Python项目的完整实现（支持传入schoolId参数）
export async function getStudentInfo(sessionId?: string, tempCookie?: string, schoolId?: string) {
  const cacheKey = sessionId ? `${cacheKeys.studentInfo}_${sessionId}_${schoolId || 'default'}` : `${cacheKeys.studentInfo}_${schoolId || 'default'}`
  return withCache(cacheKey, async () => {
    try {
      const config = createRequestConfig('GET', undefined, sessionId, tempCookie, schoolId)
      
      // 使用新的URL生成机制（支持schoolId参数）
      const urls = getApiUrls(schoolId)
      const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
      
      console.log(`🔍 获取学生信息 - 当前学校: ${currentSchool.name} (${currentSchool.id})`)
      console.log(`🌐 获取学生信息URL: ${urls.studentInfo}`)
      console.log(`🏫 当前学校: ${currentSchool.name}`)
      console.log(`🔍 使用的域名: ${currentSchool.protocol}://${currentSchool.domain}`)
      
      console.log('🔍 正在获取学生信息...', sessionId ? `(会话: ${sessionId})` : '', tempCookie ? '(使用临时Cookie)' : '')
      const response = await robustFetch(urls.studentInfo, config)
    
    if (!response.ok) {
      throw new Error(`获取学生信息失败，状态码: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    console.log('🔍 学生信息页面HTML长度:', html.length)
    console.log('🔍 查找姓名相关元素...')
    
    // 尝试多种方式获取姓名
    let name = '未知'
    
    // 方法1: 查找input[name="xm"]
    const nameInput = $('input[name="xm"]').attr('value')
    if (nameInput && nameInput.trim()) {
      name = nameInput.trim()
      console.log('✅ 通过input[name="xm"]获取到姓名:', name)
    } else {
      console.log('❌ input[name="xm"]未找到或为空')
      
      // 方法2: 查找h4.media-heading (Python版本的方法)
      const nameElement = $('h4.media-heading')
      if (nameElement.length > 0) {
        const nameText = nameElement.text().trim()
        if (nameText && nameText !== '') {
          // 移除"学生"后缀
          name = nameText.replace(/\s*学生\s*$/, '').trim()
          console.log('✅ 通过h4.media-heading获取到姓名:', name)
        } else {
          console.log('❌ h4.media-heading文本为空')
        }
      } else {
        console.log('❌ h4.media-heading未找到')
        
        // 方法3: 查找其他可能的姓名元素
        const possibleNames = [
          $('span[name="xm"]').text(),
          $('div[name="xm"]').text(),
          $('.user-name').text(),
          $('.student-name').text(),
          $('[class*="name"]').first().text()
        ].filter(text => text && text.trim())
        
        if (possibleNames.length > 0) {
          name = possibleNames[0].trim()
          console.log('✅ 通过备用方法获取到姓名:', name)
        } else {
          console.log('❌ 所有方法都未找到姓名')
        }
      }
    }
    
    // 提取学生信息
    const studentInfo = {
      name: name,
      studentId: $('input[name="xh"]').attr('value') || '',
      major: $('input[name="zymc"]').attr('value') || '',
      grade: $('input[name="nj"]').attr('value') || '',
      class: $('input[name="bh"]').attr('value') || '',
      college: $('input[name="jgmc"]').attr('value') || '',
      department: $('input[name="yxmc"]').attr('value') || ''
    }
    
    console.log('✅ 学生信息获取成功:', studentInfo)
    return studentInfo
    
    } catch (error) {
      console.error('❌ 获取学生信息失败:', error)
      throw error
    }
  }, 10 * 60 * 1000) // 学生信息缓存10分钟
}

// 获取可选课程 - 基于Python版本fetch_course_json.py的完整实现（支持传入schoolId参数）
export async function getAvailableCourses(sessionId?: string, tempCookie?: string, schoolId?: string) {
  const cacheKey = sessionId ? `${cacheKeys.availableCourses('all')}_${sessionId}_${schoolId || 'default'}` : `${cacheKeys.availableCourses('all')}_${schoolId || 'default'}`
  return withCache(cacheKey, async () => {
    try {
      console.log('🚀 开始获取可选课程（基于Python版本fetch_course_json.py）...')
      const startTime = Date.now()
      
      // 获取Cookie
      const cookie = tempCookie || getGlobalCookie()
      if (!cookie) {
        throw new Error('Cookie未设置')
      }
      
      // 使用新的课程获取器（传入schoolId）
      const { fetchAllCourses } = require('./course-fetcher')
      const results = await fetchAllCourses(cookie, schoolId)
      
      // 合并所有课程
      const allCourses: any[] = []
      for (const result of results) {
        allCourses.push(...result.courses)
      }
      
      const duration = Date.now() - startTime
      console.log(`🎉 所有课程获取完成，共${allCourses.length}门课程，耗时${duration}ms`)
      
      return allCourses
    } catch (error) {
      console.error('获取可选课程失败:', error)
      throw error
    }
  }, 10 * 60 * 1000) // 可选课程缓存10分钟
}

// 获取已选课程动态参数（支持传入schoolId参数）
async function getSelectedCoursesDynamicParams(sessionId?: string, tempCookie?: string, schoolId?: string) {
  try {
    const urls = getApiUrls(schoolId)
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
    const config = createRequestConfig('GET', undefined, sessionId, tempCookie, schoolId)
    
    console.log('🔍 获取已选课程动态参数...')
    
    // 访问选课页面获取动态参数
    const response = await robustFetch(urls.courseSelectionParams, config)
    
    if (!response.ok) {
      throw new Error(`获取选课页面失败，状态码: ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // 提取动态参数
    const params = {
      jg_id: $('input[name="jg_id"]').attr('value') || '05',
      zyh_id: $('input[name="zyh_id"]').attr('value') || '527',
      njdm_id: $('input[name="njdm_id"]').attr('value') || '2024',
      zyfx_id: $('input[name="zyfx_id"]').attr('value') || 'wfx',
      bh_id: $('input[name="bh_id"]').attr('value') || '',
      xz: $('input[name="xz"]').attr('value') || '4',
      ccdm: $('input[name="ccdm"]').attr('value') || '3',
      xqh_id: $('input[name="xqh_id"]').attr('value') || '01',
      xkxnm: $('input[name="xkxnm"]').attr('value') || '2025',
      xkxqm: $('input[name="xkxqm"]').attr('value') || '3',
      xkly: $('input[name="xkly"]').attr('value') || '0'
    }
    
    console.log('✅ 已选课程动态参数获取成功:', params)
    return params
    
  } catch (error) {
    console.error('❌ 获取已选课程动态参数失败:', error)
    // 返回默认参数
    return {
      jg_id: '05',
      zyh_id: '527',
      njdm_id: '2024',
      zyfx_id: 'wfx',
      bh_id: '',
      xz: '4',
      ccdm: '3',
      xqh_id: '01',
      xkxnm: '2025',
      xkxqm: '3',
      xkly: '0'
    }
  }
}

// 获取已选课程 - 基于Python版本的实现
export async function getSelectedCourses(sessionId?: string, tempCookie?: string, schoolId?: string) {
  const cacheKey = sessionId ? `${cacheKeys.selectedCourses}_${sessionId}_${schoolId || 'default'}` : `${cacheKeys.selectedCourses}_${schoolId || 'default'}`
  return withCache(cacheKey, async () => {
    try {
      const urls = getApiUrls(schoolId)
      const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
      
      console.log(`🔍 获取已选课程 - 当前学校: ${currentSchool.name} (${currentSchool.id})`)
      
      // 动态获取已选课程参数（传入schoolId）
      const selectedParams = await getSelectedCoursesDynamicParams(sessionId, tempCookie, schoolId)
      console.log('🔍 已选课程动态参数:', selectedParams)
      
      // 构建请求配置（传入schoolId）
      const config = createRequestConfig('POST', undefined, sessionId, tempCookie, schoolId)
      
      // 设置特定的请求头
      config.headers = {
        ...config.headers,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Origin': `${currentSchool.protocol}://${currentSchool.domain}`,
        'Pragma': 'no-cache',
        'Referer': `${currentSchool.protocol}://${currentSchool.domain}/jwglxt/xsxk/zzxkyzb_cxZzxkYzbIndex.html?gnmkdm=N253512&layout=default`,
        'X-Requested-With': 'XMLHttpRequest'
      }
      
      // 构建POST数据
      const formData = new URLSearchParams()
      Object.entries(selectedParams).forEach(([key, value]) => {
        formData.append(key, value)
      })
      
      console.log('🔍 已选课程POST数据:', formData.toString())
      
      // 更新配置以包含POST数据
      config.body = formData.toString()
      config.method = 'POST'
      
      // 使用正确的已选课程接口URL
      const selectedCoursesUrl = `${currentSchool.protocol}://${currentSchool.domain}/jwglxt/xsxk/zzxkyzb_cxZzxkYzbChoosedDisplay.html?gnmkdm=N253512`
      console.log(`🌐 已选课程URL: ${selectedCoursesUrl}`)
      console.log(`📋 POST数据: ${formData.toString()}`)
      
      console.log('🔍 正在获取已选课程...', sessionId ? `(会话: ${sessionId})` : '', tempCookie ? '(使用临时Cookie)' : '')
      const response = await robustFetch(selectedCoursesUrl, config)
    
    if (!response.ok) {
      // 处理特殊状态码
      if (response.status === 901) {
        throw new Error('Cookie已过期，请重新登录')
      } else if (response.status === 910) {
        throw new Error('需要重新登录，请检查Cookie')
      } else {
        throw new Error(`获取已选课程失败，状态码: ${response.status}`)
      }
    }

    const responseText = await response.text()
    console.log('📄 已选课程响应长度:', responseText.length)
    console.log('📄 已选课程响应前500字符:', responseText.substring(0, 500))
    
    // 检查是否是登录页面
    if (responseText.includes('用户登录') || responseText.includes('登 录') || responseText.includes('统一身份认证')) {
      console.log('⚠️ 检测到登录页面，Cookie可能已过期')
      throw new Error('Cookie已过期，请重新登录')
    }
    
    // 解析已选课程
    const courses: any[] = []
    
    try {
      // 尝试解析JSON响应
      const jsonData = JSON.parse(responseText)
      console.log('📊 解析到JSON数据:', jsonData)
      
      // 检查是否是单个课程对象
      if (jsonData.kcmc && jsonData.kch) {
        console.log('📚 检测到单个课程对象，转换为课程列表')
        const course = {
          course_name: jsonData.kcmc || '未知课程',
          teacher: jsonData.jsxx ? jsonData.jsxx.split('/')[1] || '未知教师' : '未知教师',
          classroom: jsonData.jxdd ? jsonData.jxdd.replace(/<br\/>/g, ', ') : '未知教室',
          time: jsonData.sksj ? jsonData.sksj.replace(/<br\/>/g, ', ') : '未知时间',
          credits: jsonData.xf || jsonData.jxbxf || '0',
          category: jsonData.kklxmc || '未知类别',
          status: jsonData.sfxkbj === '1' ? '已选' : '未选',
          course_code: jsonData.kch || '',
          course_id: jsonData.kch_id || '',
          class_name: jsonData.jxbmc || '',
          class_id: jsonData.jxb_id || ''
        }
        courses.push(course)
      } else if (Array.isArray(jsonData)) {
        // 如果是数组
        console.log('📚 检测到课程数组')
        jsonData.forEach((item: any) => {
          if (item.kcmc && item.kch) {
            const course = {
              course_name: item.kcmc || '未知课程',
              teacher: item.jsxx ? item.jsxx.split('/')[1] || '未知教师' : '未知教师',
              classroom: item.jxdd ? item.jxdd.replace(/<br\/>/g, ', ') : '未知教室',
              time: item.sksj ? item.sksj.replace(/<br\/>/g, ', ') : '未知时间',
              credits: item.xf || item.jxbxf || '0',
              category: item.kklxmc || '未知类别',
              status: item.sfxkbj === '1' ? '已选' : '未选',
              course_code: item.kch || '',
              course_id: item.kch_id || '',
              class_name: item.jxbmc || '',
              class_id: item.jxb_id || ''
            }
            courses.push(course)
          }
        })
      } else if (jsonData.totalResult === '0' || jsonData.pageTotal === 0) {
        console.log('📚 当前没有已选课程')
        // 返回空数组，表示没有已选课程
      } else {
        console.log('⚠️ 未知的JSON数据结构:', jsonData)
      }
      
    } catch (jsonError) {
      console.log('📄 不是JSON格式，尝试解析HTML')
      
      // 如果不是JSON，尝试解析HTML
      const $ = cheerio.load(responseText)
      
      // 检查是否有错误信息
      const errorMsg = $('.alert-danger, .error, .warning').text().trim()
      if (errorMsg) {
        console.log('⚠️ 页面显示错误信息:', errorMsg)
      }
      
      // 查找课程表格 - 尝试多种选择器
      let tableFound = false
      
      // 方法1: 查找标准表格
      $('table tbody tr').each((index, element) => {
        const $row = $(element)
        const cells = $row.find('td')
        
        if (cells.length >= 8) {
          const course = {
            course_name: $(cells[1]).text().trim(),
            teacher: $(cells[2]).text().trim(),
            classroom: $(cells[3]).text().trim(),
            time: $(cells[4]).text().trim(),
            credits: $(cells[5]).text().trim(),
            category: $(cells[6]).text().trim(),
            status: $(cells[7]).text().trim()
          }
          
          if (course.course_name) {
            courses.push(course)
            tableFound = true
          }
        }
      })
      
      // 方法2: 如果没有找到表格，尝试其他结构
      if (!tableFound) {
        console.log('🔍 未找到标准表格，尝试其他结构...')
        
        // 查找所有可能的课程行
        $('tr').each((index, element) => {
          const $row = $(element)
          const cells = $row.find('td')
          
          if (cells.length >= 6) {
            const text = $row.text().trim()
            if (text && !text.includes('课程名称') && !text.includes('教师') && !text.includes('学分')) {
              const course = {
                course_name: $(cells[1] || cells[0]).text().trim(),
                teacher: $(cells[2] || cells[1]).text().trim(),
                classroom: $(cells[3] || cells[2]).text().trim(),
                time: $(cells[4] || cells[3]).text().trim(),
                credits: $(cells[5] || cells[4]).text().trim(),
                category: $(cells[6] || cells[5]).text().trim(),
                status: $(cells[7] || cells[6]).text().trim()
              }
              
              if (course.course_name && course.course_name.length > 0) {
                courses.push(course)
              }
            }
          }
        })
      }
    }
    
    console.log(`✅ 已选课程获取成功，共${courses.length}门课程`)
    return courses
    
    } catch (error) {
      console.error('❌ 获取已选课程失败:', error)
      throw error
    }
  }, 5 * 60 * 1000) // 已选课程缓存5分钟
}

// 解析已选课程数据
function parseSelectedCourseData(jsonData: any) {
  const courses: any[] = []
  
  console.log('🔍 parseSelectedCourseData 输入数据:', jsonData)
  
  // 情况1: 如果是数组，直接处理
  if (Array.isArray(jsonData)) {
    console.log('📚 检测到课程数组')
    jsonData.forEach((course: any) => {
      if (course.kcmc && course.kch) {
        courses.push({
          kch_id: course.kch_id || '',
          kcmc: course.kcmc || '',
          jxb_id: course.jxb_id || '',
          jsxm: course.jsxm || (course.jsxx ? course.jsxx.split('/')[1] : '') || '',
          jxdd: course.jxdd || '',
          sksj: course.sksj || '',
          xf: course.xf || course.jxbxf || '',
          jxbrl: course.jxbrl || '',
          yxzrs: course.yxzrs || '',
          kklxdm: course.kklxdm || '',
          do_jxb_id: course.do_jxb_id || course.jxb_id || '',
          ...course
        })
      }
    })
  }
  // 情况2: 如果是单个课程对象
  else if (jsonData && jsonData.kcmc && jsonData.kch) {
    console.log('📚 检测到单个课程对象')
    courses.push({
      kch_id: jsonData.kch_id || '',
      kcmc: jsonData.kcmc || '',
      jxb_id: jsonData.jxb_id || '',
      jsxm: jsonData.jsxm || (jsonData.jsxx ? jsonData.jsxx.split('/')[1] : '') || '',
      jxdd: jsonData.jxdd || '',
      sksj: jsonData.sksj || '',
      xf: jsonData.xf || jsonData.jxbxf || '',
      jxbrl: jsonData.jxbrl || '',
      yxzrs: jsonData.yxzrs || '',
      kklxdm: jsonData.kklxdm || '',
      do_jxb_id: jsonData.do_jxb_id || jsonData.jxb_id || '',
      ...jsonData
    })
  }
  // 情况3: 如果有tmpList字段
  else if (jsonData && jsonData.tmpList && Array.isArray(jsonData.tmpList)) {
    console.log('📚 检测到tmpList数组')
    jsonData.tmpList.forEach((course: any) => {
      courses.push({
        kch_id: course.kch_id || '',
        kcmc: course.kcmc || '',
        jxb_id: course.jxb_id || '',
        jsxm: course.jsxm || course.jsxx || '',
        jxdd: course.jxdd || '',
        sksj: course.sksj || '',
        xf: course.xf || '',
        jxbrl: course.jxbrl || '',
        yxzrs: course.yxzrs || '',
        kklxdm: course.kklxdm || '',
        do_jxb_id: course.do_jxb_id || course.jxb_id || '',
        ...course
      })
    })
  }
  // 情况4: 如果是空结果
  else if (jsonData && (jsonData.totalResult === '0' || jsonData.pageTotal === 0)) {
    console.log('📚 检测到空结果')
    // 返回空数组
  }
  else {
    console.log('⚠️ 未知的数据结构:', jsonData)
  }
  
  console.log(`✅ parseSelectedCourseData 解析完成，共${courses.length}门课程`)
  return courses
}

// 选课功能
export async function selectCourseWithVerification(
  courseData: {
    jxb_id: string
    do_jxb_id: string
    kch_id: string
    jxbzls?: string
    kklxdm?: string
    kcmc?: string
    jxbmc?: string
    xkkz_id?: string
  },
  sessionId?: string,
  tempCookie?: string,
  schoolId?: string
) {
  try {
    console.log(`🎯 开始选课: ${courseData.kcmc || courseData.kch_id}`)
    
    // 1. 先获取课程抢课详细信息（传入schoolId）
    console.log('🔍 获取课程抢课详细信息...')
    const selectionDetails = await getCourseSelectionDetails(courseData, sessionId, tempCookie, schoolId)
    
    if (!selectionDetails) {
      return {
        success: false,
        message: '获取课程抢课详细信息失败',
        data: null
      }
    }
    
    // 2. 使用详细信息执行选课（传入schoolId）
    const result = await executeCourseSelection(courseData, sessionId, tempCookie, schoolId)
    
    if (result.success) {
      // 验证选课结果（传入schoolId）
      const verification = await verifyCourseSelection(courseData, sessionId, tempCookie, schoolId)
      return {
        success: true,
        message: `课程 "${courseData.kcmc || courseData.kch_id}" 选课成功！`,
        data: result.data,
        verification,
        selectionDetails
      }
    } else {
      return {
        success: false,
        message: result.message || '选课失败',
        data: result.data,
        selectionDetails
      }
    }
  } catch (error: any) {
    console.error('选课过程中发生错误:', error)
    return {
      success: false,
      message: error.message || '选课失败',
      data: null
    }
  }
}

// 执行选课（支持传入schoolId参数）
async function executeCourseSelection(
  courseData: {
    jxb_id: string
    do_jxb_id: string
    kch_id: string
    jxbzls?: string
    kklxdm?: string
    kcmc?: string
    jxbmc?: string
  },
  sessionId?: string,
  tempCookie?: string,
  schoolId?: string
) {
  try {
    const config = createRequestConfig('POST', undefined, sessionId, tempCookie, schoolId)
    const urls = getApiUrls(schoolId)
    
    // 构建选课请求数据
    const formData = new URLSearchParams({
      'jxb_ids': courseData.do_jxb_id || courseData.jxb_id,
      'kch_id': courseData.kch_id,
      'jxbzls': courseData.jxbzls || '1',
      'kklxdm': courseData.kklxdm || '01',
      'xkxnm': '2025',
      'xkxqm': '3'
    })
    
    const response = await robustFetch(urls.courseSelection, {
      ...config,
      body: formData.toString()
    })
    
    if (!response.ok) {
      throw new Error(`选课请求失败，状态码: ${response.status}`)
    }
    
    const result = await response.json()
    console.log('选课响应:', result)
    
    return {
      success: result.flag === '1',
      message: result.msg || (result.flag === '1' ? '选课成功' : '选课失败'),
      data: result
    }
  } catch (error: any) {
    console.error('执行选课失败:', error)
    return {
      success: false,
      message: error.message || '选课失败',
      data: null
    }
  }
}

// 验证选课结果（支持传入schoolId参数）
async function verifyCourseSelection(
  courseData: {
    jxb_id: string
    do_jxb_id: string
    kch_id: string
    jxbzls?: string
    kklxdm?: string
    kcmc?: string
    jxbmc?: string
  },
  sessionId?: string,
  tempCookie?: string,
  schoolId?: string
) {
  try {
    // 获取已选课程列表进行验证（传入schoolId）
    const selectedCourses = await getSelectedCourses(sessionId, tempCookie, schoolId)
    const isSelected = selectedCourses.some(course => 
      course.jxb_id === courseData.jxb_id || course.kch_id === courseData.kch_id
    )
    
    return {
      verified: isSelected,
      message: isSelected ? '选课验证成功' : '选课验证失败'
    }
  } catch (error: any) {
    console.error('验证选课结果失败:', error)
    return {
      verified: false,
      message: '验证失败: ' + error.message
    }
  }
}

// 获取课表数据 - 使用正确的API端点
export async function getScheduleData(sessionId?: string, tempCookie?: string, schoolId?: string) {
  const cacheKey = sessionId ? `schedule_${sessionId}_${schoolId || 'default'}` : `schedule_${schoolId || 'default'}`
  return withCache(cacheKey, async () => {
    try {
      console.log('📅 开始获取课表数据（使用新的API端点）...')
      const startTime = Date.now()
      
      // 使用传入的schoolId或当前选择的学校（不修改全局状态）
      const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
      const cookie = tempCookie || getGlobalCookie()
      
      if (!cookie) {
        throw new Error('Cookie未设置')
      }
      
      // 使用正确的课表API端点
      const scheduleUrl = `${currentSchool.protocol}://${currentSchool.domain}/jwglxt/kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N2151`
      
      // 获取动态参数（xnm, xqm）
      let xnm = '2025'
      let xqm = '3'
      
      try {
        const dynamicParams = await getScheduleDynamicParams(cookie, schoolId)
        xnm = dynamicParams.xnm
        xqm = dynamicParams.xqm
        console.log('📋 课表动态参数获取成功:', { xnm, xqm })
      } catch (error) {
        console.warn('⚠️ 课表动态参数获取失败，使用默认值:', error)
        console.log('📋 使用默认课表参数:', { xnm, xqm })
      }
      
      // 构造请求数据 - xsdm参数固定为空
      const formData = new URLSearchParams({
        'xnm': xnm,
        'xqm': xqm,
        'kzlx': 'ck',
        'xsdm': ''  // 固定为空
      })
      
      console.log('📋 课表请求参数:', { xnm, xqm, xsdm: '' })
      
      const response = await robustFetch(scheduleUrl, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'Origin': `${currentSchool.protocol}://${currentSchool.domain}`,
          'Pragma': 'no-cache',
          'Referer': `${currentSchool.protocol}://${currentSchool.domain}/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N2151&layout=default`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'Cookie': cookie
        },
        body: formData.toString()
      })
      
      if (!response.ok) {
        throw new Error(`获取课表数据失败: ${response.status}`)
      }
      
      const scheduleData = await response.json()
      const duration = Date.now() - startTime
      console.log(`📅 课表数据获取成功，耗时${duration}ms`)
      console.log('📊 原始课表数据:', scheduleData)
      console.log('📋 kbList数据:', scheduleData?.kbList)
      console.log('📊 kbList长度:', scheduleData?.kbList?.length || 0)
      
      return scheduleData
    } catch (error) {
      console.error('📅 获取课表数据失败:', error)
      throw error
    }
  }, 10 * 60 * 1000) // 课表数据缓存10分钟
}

// 获取课表动态参数（支持传入schoolId参数）
async function getScheduleDynamicParams(cookie: string, schoolId?: string) {
  try {
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
    
    // 获取课表页面来提取参数
    const scheduleIndexUrl = `${currentSchool.protocol}://${currentSchool.domain}/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N2151&layout=default`
    
    console.log('🔍 正在获取课表页面参数...', scheduleIndexUrl)
    
    const response = await robustFetch(scheduleIndexUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': scheduleIndexUrl,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'Cookie': cookie
      }
    })
    
    if (!response.ok) {
      throw new Error(`获取课表页面失败: ${response.status}`)
    }
    
    const html = await response.text()
    console.log('📄 课表页面HTML长度:', html.length)
    
    const $ = cheerio.load(html)
    
    // 提取课表参数
    const xnm = $('input[name="xnm"]').attr('value') || '2025'
    const xqm = $('input[name="xqm"]').attr('value') || '3'
    
    console.log('📋 课表动态参数提取结果:', { xnm, xqm })
    
    // 验证参数是否有效
    if (!xnm || !xqm) {
      throw new Error('无法从页面中提取有效的课表参数')
    }
    
    return { xnm, xqm }
  } catch (error) {
    console.error('❌ 获取课表动态参数失败:', error)
    throw error
  }
}

// 获取课表参数（旧版本，保留兼容性）
async function getScheduleParams(cookie: string) {
  const urls = getApiUrls()
  
  const response = await robustFetch(urls.scheduleParams, {
    method: 'GET',
    headers: {
      'Referer': urls.getRefererHeader('schedule'),
      'Cookie': cookie
    }
  })
  
  if (!response.ok) {
    throw new Error(`获取课表页面失败: ${response.status}`)
  }
  
  const html = await response.text()
  const $ = cheerio.load(html)
  
  // 提取课表参数
  const xnm = $('input[name="xnm"]').attr('value') || '2025'
  const xqm = $('input[name="xqm"]').attr('value') || '3'
  const csrftoken = $('input[name="csrftoken"]').attr('value') || ''
  
  console.log('📋 课表参数提取结果:', { xnm, xqm, csrftoken: csrftoken ? '已获取' : '未获取' })
  
  return { xnm, xqm, csrftoken }
}

// 格式化课表数据
export function formatScheduleData(data: any): any[] {
  const scheduleInfo: any[] = []
  
  if (data && data.kbList && Array.isArray(data.kbList)) {
    data.kbList.forEach((course: any) => {
      // 解析星期几 - 使用xqjmc字段（如"星期一"）
      let day = 0
      if (course.xqjmc) {
        const xqjmc = course.xqjmc.trim()
        console.log(`🔍 原始xqjmc值: "${xqjmc}"`)
        
        // 将中文星期转换为数字
        const dayMap: Record<string, number> = {
          '星期一': 1,
          '星期二': 2,
          '星期三': 3,
          '星期四': 4,
          '星期五': 5,
          '星期六': 6,
          '星期日': 7,
          '星期天': 7
        }
        
        day = dayMap[xqjmc] || 0
        console.log(`✅ 星期转换: "${xqjmc}" -> ${day}`)
      }
      
      // 如果没有有效的星期信息，跳过这个课程
      if (day === 0) {
        console.log(`⚠️ 跳过课程 ${course.kcmc}: 没有有效的星期信息 (xqjmc: "${course.xqjmc}")`)
        return
      }
      
      console.log(`📅 课程 ${course.kcmc}: xqjmc="${course.xqjmc}", 解析后day=${day}`)
      
      // 解析节次信息
      const jcs = course.jcs || ''  // 如 "1-2" 或 "3-4"
      let period = 1
      if (jcs) {
        // 从 "1-2" 中提取起始节次
        const match = jcs.match(/(\d+)/)
        if (match) {
          period = parseInt(match[1])
        }
      }
      
      // 创建课程数据对象
      const courseData = {
        // 先展开原始数据
        ...course,
        // 然后覆盖关键的解析字段（确保不被原始数据覆盖）
        name: course.kcmc || '未知课程',           // 课程名称
        teacher: course.xm || '未知教师',          // 教师姓名
        location: course.cdmc || '未知地点',       // 地点
        day: day,                                 // 星期几（解析后的值，不能被覆盖）
        period: period,                           // 节次（解析后的值，不能被覆盖）
        time: course.jc || '',                    // 时间
        weeks: course.zcd || '',                  // 周次
        class: course.jxbmc || '',                // 教学班
        credit: course.xf || '',                  // 学分
        assessment: course.khfsmc || '',          // 考核方式
        course_type: course.kcxz || '',           // 课程性质
        campus: course.xqmc || '',                // 校区
        hours: {
          total: course.zxs || '',                // 总学时
          lecture: course.kcxszc || ''            // 讲课学时
        },
        // 保留原始数据用于调试
        kch_id: course.kch_id || '',
        jxb_id: course.jxb_id || '',
        xqjmc: course.xqjmc,                      // 原始星期字段
        jcs: course.jcs                           // 原始节次字段
      }
      
      scheduleInfo.push(courseData)
    })
  }
  
  console.log(`📅 格式化课表数据完成，共 ${scheduleInfo.length} 门课程`)
  
  // 调试：打印前几个课程的数据结构
  if (scheduleInfo.length > 0) {
    console.log('🔍 前3个课程的数据结构:')
    scheduleInfo.slice(0, 3).forEach((course, index) => {
      console.log(`课程${index + 1}:`, {
        name: course.name,
        day: course.day,
        period: course.period,
        dayType: typeof course.day,
        periodType: typeof course.period,
        originalXqjmc: course.xqjmc,
        originalJcs: course.jcs
      })
    })
  }
  
  return scheduleInfo
}

// 更新学校配置
export function updateSchoolConfig(schoolId: string): void {
  const school = getSchoolById(schoolId)
  if (school) {
    console.log(`🔄 开始切换学校: ${school.name} (${school.domain})`)
    
    // 设置当前学校
    setCurrentSchool(school)
    console.log(`💾 已保存学校配置: ${school.id}`)
    
    // 验证配置是否生效
    const currentSchool = getCurrentSchool()
    console.log(`✅ 验证新配置: ${currentSchool.name} - ${currentSchool.protocol}://${currentSchool.domain}`)
    
    // 清理所有缓存，因为不同学校的数据不兼容
    apiCache.clear()
    console.log(`🗑️ 已清理所有缓存数据`)
    
    console.log(`🎉 学校切换完成: ${school.name} (${school.domain})`)
  } else {
    console.error(`❌ 未找到学校ID: ${schoolId}`)
    throw new Error(`未找到学校ID: ${schoolId}`)
  }
}

// 获取当前学校信息
export function getCurrentSchoolInfo() {
  return getCurrentSchool()
}

// 设置全局Cookie
export function setGlobalCookie(cookie: string): void {
  setSessionCookie('default', cookie)
}

// 删除会话Cookie
export function deleteSessionCookie(sessionId: string): void {
  sessionCookies.delete(sessionId)
}

// 格式化已选课程数据
export function formatSelectedCoursesData(data: any) {
  return parseSelectedCourseData(data)
}

// 获取课程抢课详细信息 - 动态获取所有参数（支持传入schoolId参数）
export async function getCourseSelectionDetails(
  courseData: {
    kch_id: string
    kklxdm?: string
    xkkz_id?: string
    [key: string]: any
  },
  sessionId?: string,
  tempCookie?: string,
  schoolId?: string
) {
  try {
    console.log(`🔍 开始获取课程抢课详细信息: ${courseData.kch_id}`)
    
    const cookie = tempCookie || getGlobalCookie()
    if (!cookie) {
      throw new Error('Cookie未设置')
    }
    
    const urls = getApiUrls(schoolId)
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
    
    // 1. 获取选课参数（传入schoolId）
    console.log('📋 获取选课参数...')
    const courseParams = await getCourseSelectionParams(sessionId, tempCookie, schoolId)
    console.log('选课参数:', courseParams)
    
    // 2. 获取页面隐藏数据（传入schoolId）
    console.log('🔍 获取页面隐藏数据...')
    const hiddenParams = await getPageHiddenParams(cookie, schoolId)
    console.log('页面隐藏参数:', hiddenParams)
    
    // 3. 根据kklxdm设置不同的rwlx和xklc值
    const kklxdm = courseData.kklxdm || '01'
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
    
    // 4. 构建动态表单数据
    const formData = new URLSearchParams({
      'rwlx': rwlx,
      'xkly': '0',
      'bklx_id': '0',
      'sfkkjyxdxnxq': '0',
      'kzkcgs': '0',
      'xqh_id': hiddenParams.xqh_id || courseParams.xqh_id || '01',
      'jg_id': hiddenParams.jg_id || courseParams.jg_id || '05',
      'zyh_id': hiddenParams.zyh_id || courseParams.zyh_id || '088',
      'zyfx_id': hiddenParams.zyfx_id || courseParams.zyfx_id || 'wfx',
      'txbsfrl': hiddenParams.txbsfrl || '0',
      'njdm_id': hiddenParams.njdm_id || courseParams.njdm_id || '2024',
      'bh_id': hiddenParams.bh_id || courseParams.bh_id || '',
      'xbm': hiddenParams.xbm || courseParams.xbm || '1',
      'xslbdm': hiddenParams.xslbdm || courseParams.xslbdm || 'wlb',
      'mzm': hiddenParams.mzm || courseParams.mzm || '01',
      'xz': hiddenParams.xz || courseParams.xz || '4',
      'ccdm': hiddenParams.ccdm || courseParams.ccdm || '3',
      'xsbj': hiddenParams.xsbj || courseParams.xsbj || '0',
      'sfkknj': hiddenParams.sfkknj || courseParams.sfkknj || '0',
      'gnjkxdnj': hiddenParams.gnjkxdnj || courseParams.gnjkxdnj || '0',
      'sfkkzy': hiddenParams.sfkkzy || courseParams.sfkkzy || '0',
      'kzybkxy': hiddenParams.kzybkxy || courseParams.kzybkxy || '0',
      'sfznkx': hiddenParams.sfznkx || courseParams.sfznkx || '0',
      'zdkxms': hiddenParams.zdkxms || courseParams.zdkxms || '0',
      'sfkxq': hiddenParams.sfkxq || courseParams.sfkxq || '0',
      'sfkcfx': hiddenParams.sfkcfx || courseParams.sfkcfx || '0',
      'bbhzxjxb': hiddenParams.bbhzxjxb || courseParams.bbhzxjxb || '0',
      'kkbk': hiddenParams.kkbk || courseParams.kkbk || '0',
      'kkbkdj': hiddenParams.kkbkdj || courseParams.kkbkdj || '0',
      'bklbkcj': hiddenParams.bklbkcj || courseParams.bklbkcj || '0',
      'xkxnm': hiddenParams.xkxnm || courseParams.xkxnm || '2025',
      'xkxqm': hiddenParams.xkxqm || courseParams.xkxqm || '3',
      'xkxskcgskg': hiddenParams.xkxskcgskg || '0',
      'rlkz': hiddenParams.rlkz || '0',
      'cdrlkz': hiddenParams.cdrlkz || '0',
      'rlzlkz': hiddenParams.rlzlkz || '1',
      'kklxdm': kklxdm,
      'kch_id': courseData.kch_id,
      'jxbzcxskg': hiddenParams.jxbzcxskg || '0',
      'xklc': xklc,
      'xkkz_id': courseData.xkkz_id || hiddenParams.xkkz_id || courseParams.xkkz_id || '3EC380169F7E8633E0636F1310AC7E15',
      'cxbj': hiddenParams.cxbj || '0',
      'fxbj': hiddenParams.fxbj || '0'
    })
    
    console.log(`📋 动态构建的抢课详细信息请求参数:`, Object.fromEntries(formData))
    
    const response = await fetch(`${currentSchool.protocol}://${currentSchool.domain}/jwglxt/xsxk/zzxkyzbjk_cxJxbWithKchZzxkYzb.html?gnmkdm=N253512`, {
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
      body: formData.toString()
    })
    
    console.log(`📊 抢课详细信息响应状态码: ${response.status}`)
    
    if (response.status === 901 || response.status === 910) {
      console.log(`状态码${response.status}：可能需要重新登录或会话已过期`)
      return null
    } else if (!response.ok) {
      console.error(`获取抢课详细信息失败，状态码: ${response.status}`)
      const text = await response.text()
      console.error(`响应内容: ${text.slice(0, 500)}`)
      return null
    }
    
    const result = await response.json()
    console.log(`✅ 抢课详细信息获取成功:`, result)
    
    return result
    
  } catch (error) {
    console.error('❌ 获取抢课详细信息失败:', error)
    throw error
  }
}

// 获取页面隐藏参数
async function getPageHiddenParams(cookie: string, schoolId?: string): Promise<Record<string, string>> {
  try {
    const urls = getApiUrls(schoolId)
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
    
    console.log('🔍 正在获取页面隐藏参数...')
    
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
      throw new Error(`获取页面隐藏参数失败，状态码: ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // 提取隐藏参数
    const hiddenParams: Record<string, string> = {}
    $('input[type="hidden"]').each((_, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      if (name) {
        hiddenParams[name] = value
        console.log(`隐藏参数: ${name} = ${value}`)
      }
    })
    
    console.log(`✅ 成功提取 ${Object.keys(hiddenParams).length} 个隐藏参数`)
    return hiddenParams
    
  } catch (error) {
    console.error('❌ 获取页面隐藏参数失败:', error)
    return {}
  }
}

// 获取选课参数
async function getCourseSelectionParams(sessionId?: string, tempCookie?: string, schoolId?: string): Promise<Record<string, string>> {
  try {
    console.log('📋 正在获取选课参数...')
    
    const config = createRequestConfig('GET', undefined, sessionId, tempCookie, schoolId)
    const urls = getApiUrls(schoolId)
    
    const response = await robustFetch(urls.courseSelectionParams, config)
    
    if (!response.ok) {
      throw new Error(`获取选课参数失败，状态码: ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // 提取选课参数
    const params: Record<string, string> = {}
    
    // 提取隐藏字段
    $('input[type="hidden"]').each((_, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      if (name) {
        params[name] = value
      }
    })
    
    // 提取其他重要参数
    const xkxnm = $('input[name="xkxnm"]').attr('value') || '2025'
    const xkxqm = $('input[name="xkxqm"]').attr('value') || '3'
    const njdm_id = $('input[name="njdm_id"]').attr('value') || '2024'
    const zyh_id = $('input[name="zyh_id"]').attr('value') || '088'
    const xqh_id = $('input[name="xqh_id"]').attr('value') || '01'
    const jg_id = $('input[name="jg_id"]').attr('value') || '05'
    
    // 合并参数
    const courseParams = {
      xkxnm,
      xkxqm,
      njdm_id,
      zyh_id,
      xqh_id,
      jg_id,
      ...params
    }
    
    console.log(`✅ 成功获取选课参数:`, courseParams)
    return courseParams
    
  } catch (error) {
    console.error('❌ 获取选课参数失败:', error)
    return {}
  }
}

// 成绩查询接口类型
export interface GradeItem {
  kcmc: string  // 课程名称
  kch: string   // 课程号
  kch_id: string // 课程ID
  xf: string    // 学分
  jd: string    // 绩点
  cj: string    // 成绩
  xq: string    // 学期
  xnm: string   // 学年名
  xqm: string   // 学期码
  kcxzmc: string // 课程性质名称
  ksxzmc: string // 考试性质名称
  kcsx: string  // 课程属性
  kssj: string  // 考试时间
}

// 获取成绩数据
export async function getGrades(
  xnm: string,  // 学年名，如2024表示2024-2025学年
  xqm: string,  // 学期：3为上学期，12为下学期
  sessionId?: string,
  tempCookie?: string,
  schoolId?: string
): Promise<GradeItem[]> {
  try {
    console.log(`📊 正在查询成绩: 学年=${xnm}, 学期=${xqm}`)
    
    const urls = getApiUrls(schoolId)
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
    
    // 生成时间戳（nd参数）
    const nd = Date.now().toString()
    
    // 构建表单数据
    const formData = new URLSearchParams({
      xnm: xnm,
      xqm: xqm,
      nd: nd
    })
    
    // 创建请求配置（传入schoolId）
    const config = createRequestConfig('POST', formData.toString(), sessionId, tempCookie, schoolId)
    config.headers = {
      ...config.headers,
      'Referer': urls.getRefererHeader('grade'),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    const response = await robustFetch(urls.gradeQuery, config)
    
    if (!response.ok) {
      if (response.status === 901 || response.status === 910) {
        throw new Error('Cookie已过期，请重新登录')
      }
      throw new Error(`获取成绩失败，状态码: ${response.status}`)
    }
    
    const responseText = await response.text()
    
    // 检查是否是登录页面
    if (responseText.includes('用户登录') || responseText.includes('登 录')) {
      throw new Error('Cookie已过期，请重新登录')
    }
    
    // 尝试解析JSON
    let jsonData: any
    try {
      jsonData = JSON.parse(responseText)
    } catch (e) {
      // 如果不是JSON，尝试HTML解析
      const $ = cheerio.load(responseText)
      const errorMsg = $('.alert-danger').text().trim()
      if (errorMsg) {
        throw new Error(errorMsg || '获取成绩失败')
      }
      throw new Error('返回数据格式错误')
    }
    
    // 解析成绩数据
    const grades: GradeItem[] = []
    
    if (Array.isArray(jsonData)) {
      // 直接是数组
      jsonData.forEach((item: any) => {
        if (item.kcmc) {
          grades.push({
            kcmc: item.kcmc || '',
            kch: item.kch || '',
            kch_id: item.kch_id || '',
            xf: item.xf || '0',
            jd: item.jd || '0',
            cj: item.cj || '',
            xq: item.xq || '',
            xnm: item.xnm || xnm,
            xqm: item.xqm || xqm,
            kcxzmc: item.kcxzmc || '',
            ksxzmc: item.ksxzmc || '',
            kcsx: item.kcsx || '',
            kssj: item.kssj || ''
          })
        }
      })
    } else if (jsonData.items && Array.isArray(jsonData.items)) {
      // items数组
      jsonData.items.forEach((item: any) => {
        if (item.kcmc) {
          grades.push({
            kcmc: item.kcmc || '',
            kch: item.kch || '',
            kch_id: item.kch_id || '',
            xf: item.xf || '0',
            jd: item.jd || '0',
            cj: item.cj || '',
            xq: item.xq || '',
            xnm: item.xnm || xnm,
            xqm: item.xqm || xqm,
            kcxzmc: item.kcxzmc || '',
            ksxzmc: item.ksxzmc || '',
            kcsx: item.kcsx || '',
            kssj: item.kssj || ''
          })
        }
      })
    }
    
    console.log(`✅ 成功获取 ${grades.length} 条成绩记录`)
    return grades
    
  } catch (error: any) {
    console.error('❌ 获取成绩失败:', error)
    throw error
  }
}

// 总体成绩项接口
export interface OverallGradeItem {
  xfyqjd_id: string
  kcmc: string // 课程名称
  kch: string // 课程号
  xf: string // 学分
  cj: string // 成绩
  jd: string // 绩点
  kcxzmc?: string // 课程性质
  xq?: string // 学期
  [key: string]: any // 允许其他字段
}

// 总体成绩查询结果接口
export interface OverallGradesResult {
  grades: OverallGradeItem[]
  gpa?: string // 总体GPA
}

// 获取总体成绩参数
interface OverallGradeParams {
  xfyqjd_id: string
  xh_id: string
  cjlrxn: string
  cjlrxq: string
  bkcjlrxn: string
  bkcjlrxq: string
  xscjcxkz: string
  cjcxkzzt: string
  cjztkz: string
  cjzt: string
}

// 获取总体成绩数据
export async function getOverallGrades(
  sessionId?: string,
  tempCookie?: string,
  schoolId?: string
): Promise<OverallGradesResult> {
  try {
    console.log('📊 开始获取总体成绩数据')
    
    const urls = getApiUrls(schoolId)
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
    
    // 第一步：获取参数页面（传入schoolId）
    const indexConfig = createRequestConfig('GET', undefined, sessionId, tempCookie, schoolId)
    indexConfig.headers = {
      ...indexConfig.headers,
      'Referer': urls.getRefererHeader('overallGrade'),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
    
    const indexResponse = await robustFetch(urls.overallGradeIndex, indexConfig)
    
    if (!indexResponse.ok) {
      if (indexResponse.status === 901 || indexResponse.status === 910) {
        throw new Error('Cookie已过期，请重新登录')
      }
      throw new Error(`获取总体成绩参数失败，状态码: ${indexResponse.status}`)
    }
    
    const indexHtml = await indexResponse.text()
    
    // 检查是否是登录页面
    if (indexHtml.includes('用户登录') || indexHtml.includes('登 录')) {
      throw new Error('Cookie已过期，请重新登录')
    }
    
    // 解析HTML获取参数
    const $ = cheerio.load(indexHtml)
    
    // 提取GPA值
    let overallGPA: string | undefined
    try {
      // 方法1: 查找 <a name="showGpa"> 附近的 font 标签
      const gpaAnchor = $('a[name="showGpa"]')
      if (gpaAnchor.length > 0) {
        // 在相邻的元素中查找 font 标签
        const gpaFont = gpaAnchor.parent().find('font[style*="color"]').first()
        if (gpaFont.length > 0) {
          const gpaText = gpaFont.text().trim()
          const gpaMatch = gpaText.match(/(\d+\.?\d*)/)
          if (gpaMatch) {
            overallGPA = gpaMatch[1]
            console.log('✅ 从 a[name="showGpa"] 提取到GPA:', overallGPA)
          }
        }
      }
      
      // 方法2: 如果方法1失败，直接搜索包含 "(GPA)" 的文本附近的 font 标签
      if (!overallGPA) {
        const htmlText = indexHtml
        const gpaMatch = htmlText.match(/\(GPA\)\s*[:\：]\s*<font[^>]*>([^<]+)<\/font>/i)
        if (gpaMatch && gpaMatch[1]) {
          const gpaValue = gpaMatch[1].trim().match(/(\d+\.?\d*)/)
          if (gpaValue) {
            overallGPA = gpaValue[1]
            console.log('✅ 从文本匹配提取到GPA:', overallGPA)
          }
        }
      }
      
      // 方法3: 搜索所有包含红色字体和数字的 font 标签
      if (!overallGPA) {
        $('font[style*="color"][style*="red"], font[style*="color:red"]').each((_, elem) => {
          const text = $(elem).text().trim()
          const match = text.match(/(\d+\.\d{2})/)
          if (match) {
            overallGPA = match[1]
            console.log('✅ 从红色字体提取到GPA:', overallGPA)
            return false // 停止遍历
          }
        })
      }
      
      // 方法4: 搜索 class="clj" 的元素附近的 GPA
      if (!overallGPA) {
        $('a.clj[name="showGpa"]').each((_, elem) => {
          const parent = $(elem).parent()
          const text = parent.text()
          const match = text.match(/GPA[:\：]\s*(\d+\.\d{2})/i)
          if (match) {
            overallGPA = match[1]
            console.log('✅ 从 clj 类提取到GPA:', overallGPA)
            return false
          }
        })
      }
      
      if (overallGPA) {
        console.log(`📊 成功提取总体GPA: ${overallGPA}`)
      } else {
        console.warn('⚠️ 未能提取到GPA值')
      }
    } catch (error) {
      console.warn('⚠️ 提取GPA时出错:', error)
    }
    
    // 提取单个参数
    const params: Partial<OverallGradeParams> = {
      xh_id: $('input[name="xh_id"]').attr('value') || '',
      cjlrxn: $('input[name="cjlrxn"]').attr('value') || '',
      cjlrxq: $('input[name="cjlrxq"]').attr('value') || '',
      bkcjlrxn: $('input[name="bkcjlrxn"]').attr('value') || '',
      bkcjlrxq: $('input[name="bkcjlrxq"]').attr('value') || '',
      xscjcxkz: $('input[name="xscjcxkz"]').attr('value') || '0',
      cjcxkzzt: $('input[name="cjcxkzzt"]').attr('value') || '2',
      cjztkz: $('input[name="cjztkz"]').attr('value') || '0',
      cjzt: $('input[name="cjzt"]').attr('value') || ''
    }
    
    console.log('📋 提取的参数:', params)
    
    // 提取所有 xfyqjd_id 值（可能有多个）
    const xfyqjdIds: string[] = []
    
    // 方法1: 查找所有包含 xfyqjd_id 的 input 字段
    $('input[name="xfyqjd_id"]').each((_, elem) => {
      const value = $(elem).attr('value')
      if (value && value.trim()) {
        xfyqjdIds.push(value.trim())
      }
    })
    
    // 方法2: 查找 select 选项
    $('select[name="xfyqjd_id"] option').each((_, elem) => {
      const value = $(elem).attr('value')
      if (value && value.trim() && value !== '') {
        xfyqjdIds.push(value.trim())
      }
    })
    
    // 方法3: 从HTML属性中提取（如 fxfyqjd_id="xxx"）
    // 查找所有包含 fxfyqjd_id 或 xfyqjd_id 属性的元素
    $('[fxfyqjd_id], [xfyqjd_id]').each((_, elem) => {
      const value = $(elem).attr('fxfyqjd_id') || $(elem).attr('xfyqjd_id')
      if (value && value.trim()) {
        xfyqjdIds.push(value.trim())
      }
    })
    
    // 方法4: 从隐藏的 input 或其他表单元素中提取
    $('input[type="hidden"][id*="xfyqjd"], input[id*="xfyqjd"], input[class*="xfyqjd"]').each((_, elem) => {
      const value = $(elem).attr('value') || $(elem).attr('id') || $(elem).attr('data-id')
      if (value && value.trim() && value.length > 10) {
        xfyqjdIds.push(value.trim())
      }
    })
    
    // 方法5: 从脚本中提取（支持 fxfyqjd_id 和 xfyqjd_id）
    const scripts = $('script').toArray()
    for (const script of scripts) {
      const scriptContent = $(script).html() || ''
      
      // 匹配 fxfyqjd_id="xxx" 或 xfyqjd_id="xxx"
      const patterns = [
        /fxfyqjd_id\s*=\s*["']([^"']+)["']/gi,
        /xfyqjd_id\s*=\s*["']([^"']+)["']/gi,
        /xfyqjd_id['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi,
        /fxfyqjd_id['"]?\s*[:=]\s*['"]([^'"]+)['"]/gi
      ]
      
      patterns.forEach(pattern => {
        const matches = scriptContent.match(pattern)
        if (matches) {
          matches.forEach(match => {
            const valueMatch = match.match(/["']([^"']+)["']/)
            if (valueMatch && valueMatch[1] && valueMatch[1].trim().length > 10) {
              xfyqjdIds.push(valueMatch[1].trim())
            }
          })
        }
      })
      
      // 也尝试匹配 HTML 属性格式
      const attrMatches = scriptContent.match(/(?:f)?xfyqjd_id=["']([^"']+)["']/gi)
      if (attrMatches) {
        attrMatches.forEach(match => {
          const valueMatch = match.match(/["']([^"']+)["']/)
          if (valueMatch && valueMatch[1] && valueMatch[1].trim().length > 10) {
            xfyqjdIds.push(valueMatch[1].trim())
          }
        })
      }
    }
    
    // 方法6: 直接从 HTML 文本中搜索（最后的手段）
    const htmlText = $.html()
    const textMatches = htmlText.match(/(?:f)?xfyqjd_id=["']([A-F0-9]{32,})["']/gi)
    if (textMatches) {
      textMatches.forEach(match => {
        const valueMatch = match.match(/["']([A-F0-9]{32,})["']/i)
        if (valueMatch && valueMatch[1]) {
          xfyqjdIds.push(valueMatch[1].trim())
        }
      })
    }
    
    // 去重（确保没有重复的值）
    const uniqueXfyqjdIds = Array.from(new Set(xfyqjdIds.filter(id => id && id.trim().length > 10)))
    
    console.log(`📋 找到 ${uniqueXfyqjdIds.length} 个唯一的 xfyqjd_id:`, uniqueXfyqjdIds)
    
    if (uniqueXfyqjdIds.length === 0) {
      console.error('❌ 未找到任何 xfyqjd_id 参数')
      console.log('📄 HTML 预览（前1000字符）:', indexHtml.substring(0, 1000))
      throw new Error('无法获取 xfyqjd_id 参数，请检查Cookie是否有效')
    }
    
    console.log(`📊 准备对 ${uniqueXfyqjdIds.length} 个唯一的 xfyqjd_id 发起并行查询请求`)
    
    // 辅助函数：获取字段值（支持大小写不敏感）
    const getField = (item: any, ...fieldNames: string[]): string => {
      for (const fieldName of fieldNames) {
        // 先尝试原始字段名
        if (item[fieldName] !== undefined && item[fieldName] !== null) {
          return String(item[fieldName])
        }
        // 再尝试小写
        const lowerField = fieldName.toLowerCase()
        if (item[lowerField] !== undefined && item[lowerField] !== null) {
          return String(item[lowerField])
        }
        // 再尝试大写
        const upperField = fieldName.toUpperCase()
        if (item[upperField] !== undefined && item[upperField] !== null) {
          return String(item[upperField])
        }
      }
      return ''
    }
    
    // 解析函数
    const parseGradeItem = (item: any, xfyqjdId: string): OverallGradeItem | null => {
      const kcmc = getField(item, 'kcmc', 'KCMC', 'kcMc')
      const kch = getField(item, 'kch', 'KCH', 'kcH')
      
      // 至少要有课程名称或课程号
      if (!kcmc && !kch) {
        return null
      }
      
      const grade: OverallGradeItem = {
        xfyqjd_id: xfyqjdId,
        kcmc: kcmc || '',
        kch: kch || getField(item, 'kch_id', 'KCH_ID'),
        xf: getField(item, 'xf', 'XF') || '0',
        jd: getField(item, 'jd', 'JD') || '0',
        cj: getField(item, 'cj', 'CJ', 'maxcj', 'MAXCJ') || '',
        kcxzmc: getField(item, 'kcxzmc', 'KCXZMC', 'kcXzmc') || '',
        xq: getField(item, 'xq', 'XQ', 'xqm', 'XQM') || '',
        ...item // 保留所有原始字段
      }
      
      return grade
    }
    
    // 查询单个 xfyqjd_id 的函数
    const querySingleXfyqjdId = async (xfyqjdId: string, index: number): Promise<OverallGradeItem[]> => {
      try {
        console.log(`📊 开始查询 xfyqjd_id [${index + 1}/${uniqueXfyqjdIds.length}]: ${xfyqjdId}`)
        
        const formData = new URLSearchParams({
          xfyqjd_id: xfyqjdId,
          xh_id: params.xh_id || '',
          cjlrxn: params.cjlrxn || '',
          cjlrxq: params.cjlrxq || '',
          bkcjlrxn: params.bkcjlrxn || '',
          bkcjlrxq: params.bkcjlrxq || '',
          xscjcxkz: params.xscjcxkz || '0',
          cjcxkzzt: params.cjcxkzzt || '2',
          cjztkz: params.cjztkz || '0',
          cjzt: params.cjzt || ''
        })
        
        const queryConfig = createRequestConfig('POST', formData.toString(), sessionId, tempCookie)
        queryConfig.headers = {
          ...queryConfig.headers,
          'Referer': urls.getRefererHeader('overallGrade'),
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        }
        
        const queryResponse = await robustFetch(urls.overallGradeQuery, queryConfig)
        
        if (!queryResponse.ok) {
          console.warn(`⚠️ xfyqjd_id ${xfyqjdId} 查询失败，状态码: ${queryResponse.status}`)
          return []
        }
        
        const responseText = await queryResponse.text()
        
        // 检查是否是登录页面
        if (responseText.includes('用户登录') || responseText.includes('登 录')) {
          throw new Error('Cookie已过期，请重新登录')
        }
        
        // 解析JSON响应
        let jsonData: any
        try {
          jsonData = JSON.parse(responseText)
        } catch (e) {
          console.warn(`⚠️ xfyqjd_id ${xfyqjdId} 返回的不是JSON格式`)
          return []
        }
        
        // 解析成绩数据（支持大小写不敏感）
        const grades: OverallGradeItem[] = []
        
        if (Array.isArray(jsonData)) {
          jsonData.forEach((item: any) => {
            const grade = parseGradeItem(item, xfyqjdId)
            if (grade) {
              grades.push(grade)
            }
          })
        } else if (jsonData.items && Array.isArray(jsonData.items)) {
          jsonData.items.forEach((item: any) => {
            const grade = parseGradeItem(item, xfyqjdId)
            if (grade) {
              grades.push(grade)
            }
          })
        } else if (jsonData.list && Array.isArray(jsonData.list)) {
          jsonData.list.forEach((item: any) => {
            const grade = parseGradeItem(item, xfyqjdId)
            if (grade) {
              grades.push(grade)
            }
          })
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          jsonData.data.forEach((item: any) => {
            const grade = parseGradeItem(item, xfyqjdId)
            if (grade) {
              grades.push(grade)
            }
          })
        } else {
          // 尝试将整个对象当作单个课程处理
          const grade = parseGradeItem(jsonData, xfyqjdId)
          if (grade) {
            grades.push(grade)
          }
        }
        
        console.log(`✅ xfyqjd_id ${xfyqjdId} 获取到 ${grades.length} 条成绩`)
        return grades
        
      } catch (error: any) {
        console.error(`❌ xfyqjd_id ${xfyqjdId} 查询失败:`, error)
        return []
      }
    }
    
    // 第二步：并行查询所有 xfyqjd_id
    const startTime = Date.now()
    const queryPromises = uniqueXfyqjdIds.map((xfyqjdId, index) => 
      querySingleXfyqjdId(xfyqjdId, index)
    )
    
    // 使用 Promise.allSettled 确保即使部分请求失败，其他成功的请求也能返回结果
    const results = await Promise.allSettled(queryPromises)
    
    const allGrades: OverallGradeItem[] = []
    let successCount = 0
    let failCount = 0
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allGrades.push(...result.value)
        if (result.value.length > 0) {
          successCount++
        }
      } else {
        console.error(`❌ xfyqjd_id ${uniqueXfyqjdIds[index]} 查询被拒绝:`, result.reason)
        failCount++
      }
    })
    
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    console.log(`✅ 并行查询完成！成功: ${successCount}/${uniqueXfyqjdIds.length}，失败: ${failCount}，耗时: ${duration}秒`)
    
    console.log(`✅ 总共获取 ${allGrades.length} 条总体成绩记录`)
    
    return {
      grades: allGrades,
      gpa: overallGPA
    }
    
  } catch (error: any) {
    console.error('❌ 获取总体成绩失败:', error)
    throw error
  }
}
