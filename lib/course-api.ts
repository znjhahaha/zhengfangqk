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
// 在服务器端自动使用异步方式获取URL配置以确保能获取到新添加的学校配置
async function createRequestConfigAsync(method: string = 'GET', body?: string, sessionId?: string, tempCookie?: string, schoolId?: string) {
  // 在服务器端，使用异步方式获取URL配置（确保能获取到新添加的学校配置）
  let urls
  if (typeof window === 'undefined') {
    try {
      // 服务器端：使用异步版本获取URL配置
      const { getApiUrlsAsync } = await import('./global-school-state')
      urls = await getApiUrlsAsync(schoolId)
    } catch (error) {
      // EdgeOne Pages等环境可能不支持动态导入，降级到同步版本
      console.warn('⚠️ 动态导入失败，使用同步版本:', error)
      urls = getApiUrls(schoolId)
    }
  } else {
    // 客户端：使用同步版本
    urls = getApiUrls(schoolId)
  }
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

// 同步版本的请求配置（保持向后兼容，但服务器端可能无法获取到新学校的配置）
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
async function robustFetch(url: string, config: RequestInit, maxRetries: number = 2): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, config)
      return response
    } catch (error) {
      lastError = error as Error
      console.warn(`请求失败 (尝试 ${attempt}/${maxRetries}):`, error)

      if (attempt < maxRetries) {
        // 优化云部署：减小延迟 500ms -> 1000ms (最多延迟1秒)
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 1000)
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
      // 使用异步版本的配置（支持服务器端从文件/COS加载学校）
      const config = await createRequestConfigAsync('GET', undefined, sessionId, tempCookie, schoolId)

      // 使用异步URL生成机制（支持schoolId参数，服务器端能从文件/COS加载）
      let urls
      let currentSchool
      if (typeof window === 'undefined') {
        // 服务器端：使用异步版本
        const { getApiUrlsAsync } = await import('./global-school-state')
        urls = await getApiUrlsAsync(schoolId)
        const schools = await import('./global-school-state').then(m => m.getSchoolsFromServer?.() || [])
        currentSchool = schoolId ? schools.find(s => s.id === schoolId) : null
        if (!currentSchool && schoolId) {
          const { DEFAULT_SCHOOL } = await import('./global-school-state')
          currentSchool = DEFAULT_SCHOOL
        } else if (!currentSchool) {
          const { getCurrentSchool } = await import('./global-school-state')
          currentSchool = getCurrentSchool()
        }
      } else {
        // 客户端：使用同步版本
        urls = getApiUrls(schoolId)
        currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()
      }

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
export async function getAvailableCourses(
  sessionId?: string,
  tempCookie?: string,
  schoolId?: string,
  options?: { skipCache?: boolean }
) {
  const cacheKey = sessionId
    ? `${cacheKeys.availableCourses('all')}_${sessionId}_${schoolId || 'default'}`
    : `${cacheKeys.availableCourses('all')}_${schoolId || 'default'}`

  const fetchCourses = async () => {
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
  }

  if (options?.skipCache) {
    console.log('⚠️ 跳过可选课程缓存，强制从源站获取最新数据')
    return fetchCourses()
  }

  return withCache(cacheKey, fetchCourses, 10 * 60 * 1000) // 可选课程缓存10分钟
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

    // 提取动态参数 - 完全从HTML中提取，不使用硬编码默认值
    const params: Record<string, string> = {}

    // 方法1: 查找所有 type="hidden" 的 input 元素
    $('input[type="hidden"]').each((_, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      if (name) {
        params[name] = value
        console.log(`已选课程参数: ${name} = ${value}`)
      }
    })

    // 方法2: 也查找所有 input 元素（有些可能没有明确指定 type="hidden"）
    $('input').each((_, element) => {
      const type = $(element).attr('type')
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      // 如果是隐藏字段或者没有指定type，也提取
      if (name && (type === 'hidden' || !type) && !params[name]) {
        params[name] = value
        if (type !== 'hidden') {
          console.log(`已选课程参数（无type）: ${name} = ${value}`)
        }
      }
    })

    // ⚠️ 关键修复：教务系统的字段名可能带后缀（如 jg_id_1, zyh_id_1）
    // 需要同时查找带后缀和不带后缀的版本
    const getParamValue = (baseName: string): string => {
      // 优先使用不带后缀的
      if (params[baseName]) {
        return params[baseName]
      }
      // 查找带 _1, _2 等后缀的版本
      for (let i = 1; i <= 5; i++) {
        const withSuffix = `${baseName}_${i}`
        if (params[withSuffix]) {
          console.log(`✅ 使用带后缀的字段: ${withSuffix} = ${params[withSuffix]} (映射为 ${baseName})`)
          return params[withSuffix]
        }
      }
      return ''
    }

    // 检查必需参数是否存在（使用新的查找逻辑）
    const requiredParams = ['jg_id', 'zyh_id', 'njdm_id', 'xkxnm', 'xkxqm']
    const missingParams: string[] = []

    for (const paramName of requiredParams) {
      const value = getParamValue(paramName)
      if (!value || value.trim() === '') {
        missingParams.push(paramName)
      }
    }

    if (missingParams.length > 0) {
      console.error('❌ 缺少必需参数。已提取的所有参数:', params)
      throw new Error(`缺少必需的已选课程参数: ${missingParams.join(', ')}。请检查Cookie是否有效。`)
    }

    // 使用新的提取逻辑获取所有参数
    const finalParams = {
      jg_id: getParamValue('jg_id'),
      zyh_id: getParamValue('zyh_id'),
      njdm_id: getParamValue('njdm_id'),
      zyfx_id: getParamValue('zyfx_id'),
      bh_id: getParamValue('bh_id'),
      xz: getParamValue('xz'),
      ccdm: getParamValue('ccdm'),
      xqh_id: getParamValue('xqh_id'),
      xkxnm: getParamValue('xkxnm'),
      xkxqm: getParamValue('xkxqm'),
      xkly: getParamValue('xkly')
    }

    console.log('✅ 已选课程动态参数获取成功:', finalParams)
    return finalParams

  } catch (error: any) {
    console.error('❌ 获取已选课程动态参数失败:', error)
    // 不再返回硬编码的默认参数，直接抛出错误
    throw new Error(`获取已选课程动态参数失败: ${error.message || '未知错误'}。请检查Cookie是否有效。`)
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

      // 解析已选课程 - 使用统一的解析函数
      let courses: any[] = []

      try {
        // 尝试解析JSON响应
        const jsonData = JSON.parse(responseText)
        console.log('📊 解析到JSON数据:', jsonData)

        // 使用统一的解析函数
        courses = parseSelectedCourseData(jsonData)

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
        const teacher =
          course.jsxm ||
          (course.jsxx ? course.jsxx.split('/')[1] || '' : '') ||
          ''
        const classroom =
          course.jxdd && course.jxdd.trim()
            ? course.jxdd.replace(/<br\/?>/g, ', ')
            : '--'
        const time = course.sksj ? course.sksj.replace(/<br\/?>/g, ', ') : '--'
        const rawCapacity =
          course.jxbrs ??
          course.JXBRS ??
          course.krrl ??
          course.KRRL ??
          course.jxbrl ??
          course.JXBRL
        const rawSelected =
          course.yxzrs ??
          course.YXZRS ??
          course.selected ??
          course.SELECTED ??
          course.selected_count ??
          course.selectedCount

        const capacity = Number.parseInt(rawCapacity ?? '0', 10) || 0
        const selected = Number.parseInt(rawSelected ?? '0', 10) || 0
        const available = Math.max(capacity - selected, 0)
        const status =
          course.sfxkbj === '1'
            ? '已选'
            : capacity > 0 && selected >= capacity
              ? '已满'
              : '可选'

        courses.push({
          ...course,
          kch_id: course.kch_id || '',
          kcmc: course.kcmc || '',
          jxb_id: course.jxb_id || '',
          jsxm: teacher,
          jxdd: classroom,
          sksj: time,
          xf: course.xf || course.jxbxf || '',
          jxbrl: course.jxbrl || '',
          kklxdm: course.kklxdm || '',
          do_jxb_id: course.do_jxb_id || course.jxb_id || '',
          course_name: course.kcmc || '',
          course_code: course.kch || course.kch_id || '',
          course_id: course.kch_id || course.kch || '',
          class_name: course.jxbmc || '',
          class_id: course.jxb_id || '',
          teacher,
          classroom,
          time,
          credits: course.xf || course.jxbxf || '',
          category: course.kklxmc || course.kklxdm || '',
          status,
          capacity,
          selected,
          available,
          max_capacity: capacity.toString(),
          selected_count: selected.toString(),
          bjrs: capacity.toString(),
          yxzrs: selected.toString(),
          // 保留获取课程列表时使用的参数（如果存在）
          _rwlx: course._rwlx,
          _xklc: course._xklc,
          _xkly: course._xkly,
          _xkkz_id: course._xkkz_id
        })
      } else if (course.course_name && (course.course_code || course.course_id)) {
        const capacity = Number.parseInt(
          course.capacity ?? course.max_capacity ?? course.quota ?? '0',
          10
        ) || 0
        const selected = Number.parseInt(
          course.selected ?? course.selected_count ?? course.yxzrs ?? '0',
          10
        ) || 0
        const available = Math.max(capacity - selected, 0)

        // 已格式化的数据（前端缓存或已处理结果）
        courses.push({
          ...course,
          kch_id: course.course_id || course.course_code || '',
          kcmc: course.course_name || '',
          jxb_id: course.class_id || '',
          jsxm: course.teacher || '',
          jxdd: course.classroom || '',
          sksj: course.time || '',
          xf: course.credits || '',
          jxbrl: course.capacity || '',
          kklxdm: course.category || '',
          do_jxb_id: course.class_id || '',
          capacity,
          selected,
          available,
          max_capacity: capacity.toString(),
          selected_count: selected.toString(),
          yxzrs: selected.toString(),
          bjrs: capacity.toString(),
          // 保留获取课程列表时使用的参数（如果存在）
          _rwlx: course._rwlx,
          _xklc: course._xklc,
          _xkly: course._xkly,
          _xkkz_id: course._xkkz_id
        })
      }
    })
  }
  // 情况2: 如果是单个课程对象
  else if (jsonData && jsonData.kcmc && jsonData.kch) {
    console.log('📚 检测到单个课程对象')
    const teacher =
      jsonData.jsxm ||
      (jsonData.jsxx ? jsonData.jsxx.split('/')[1] || '' : '') ||
      ''
    const classroom =
      jsonData.jxdd && jsonData.jxdd.trim()
        ? jsonData.jxdd.replace(/<br\/?>/g, ', ')
        : '--'
    const time = jsonData.sksj ? jsonData.sksj.replace(/<br\/?>/g, ', ') : '--'
    const rawCapacity =
      jsonData.jxbrs ??
      jsonData.JXBRS ??
      jsonData.krrl ??
      jsonData.KRRL ??
      jsonData.jxbrl ??
      jsonData.JXBRL
    const rawSelected =
      jsonData.yxzrs ??
      jsonData.YXZRS ??
      jsonData.selected ??
      jsonData.SELECTED ??
      jsonData.selected_count ??
      jsonData.selectedCount

    const capacity = Number.parseInt(rawCapacity ?? '0', 10) || 0
    const selected = Number.parseInt(rawSelected ?? '0', 10) || 0
    const available = Math.max(capacity - selected, 0)
    const status =
      jsonData.sfxkbj === '1'
        ? '已选'
        : capacity > 0 && selected >= capacity
          ? '已满'
          : '可选'

    courses.push({
      ...jsonData,
      kch_id: jsonData.kch_id || jsonData.kch || '',
      kcmc: jsonData.kcmc || '',
      jxb_id: jsonData.jxb_id || '',
      jsxm: teacher,
      jxdd: classroom,
      sksj: time,
      xf: jsonData.xf || jsonData.jxbxf || '',
      jxbrl: jsonData.jxbrl || '',
      kklxdm: jsonData.kklxdm || '',
      do_jxb_id: jsonData.do_jxb_id || jsonData.jxb_id || '',
      course_name: jsonData.kcmc || '',
      course_code: jsonData.kch || jsonData.kch_id || '',
      course_id: jsonData.kch_id || jsonData.kch || '',
      class_name: jsonData.jxbmc || '',
      class_id: jsonData.jxb_id || '',
      teacher,
      classroom,
      time,
      credits: jsonData.xf || jsonData.jxbxf || '',
      category: jsonData.kklxmc || jsonData.kklxdm || '',
      status,
      capacity,
      selected,
      available,
      max_capacity: capacity.toString(),
      selected_count: selected.toString(),
      bjrs: capacity.toString(),
      yxzrs: selected.toString(),
      // 保留获取课程列表时使用的参数（如果存在）
      _rwlx: jsonData._rwlx,
      _xklc: jsonData._xklc,
      _xkly: jsonData._xkly,
      _xkkz_id: jsonData._xkkz_id
    })
  }
  // 情况3: 如果有tmpList字段
  else if (jsonData && jsonData.tmpList && Array.isArray(jsonData.tmpList)) {
    console.log('📚 检测到tmpList数组')
    jsonData.tmpList.forEach((course: any) => {
      if (course.kcmc && course.kch) {
        const teacher =
          course.jsxm ||
          (course.jsxx ? course.jsxx.split('/')[1] || '' : '') ||
          ''
        const classroom =
          course.jxdd && course.jxdd.trim()
            ? course.jxdd.replace(/<br\/?>/g, ', ')
            : '--'
        const time = course.sksj ? course.sksj.replace(/<br\/?>/g, ', ') : '--'
        const rawCapacity =
          course.jxbrs ??
          course.JXBRS ??
          course.krrl ??
          course.KRRL ??
          course.jxbrl ??
          course.JXBRL
        const rawSelected =
          course.yxzrs ??
          course.YXZRS ??
          course.selected ??
          course.SELECTED ??
          course.selected_count ??
          course.selectedCount

        const capacity = Number.parseInt(rawCapacity ?? '0', 10) || 0
        const selected = Number.parseInt(rawSelected ?? '0', 10) || 0
        const available = Math.max(capacity - selected, 0)
        const status =
          course.sfxkbj === '1'
            ? '已选'
            : capacity > 0 && selected >= capacity
              ? '已满'
              : '可选'

        courses.push({
          ...course,
          kch_id: course.kch_id || course.kch || '',
          kcmc: course.kcmc || '',
          jxb_id: course.jxb_id || '',
          jsxm: teacher,
          jxdd: classroom,
          sksj: time,
          xf: course.xf || course.jxbxf || '',
          jxbrl: course.jxbrl || '',
          kklxdm: course.kklxdm || '',
          do_jxb_id: course.do_jxb_id || course.jxb_id || '',
          course_name: course.kcmc || '',
          course_code: course.kch || course.kch_id || '',
          course_id: course.kch_id || course.kch || '',
          class_name: course.jxbmc || '',
          class_id: course.jxb_id || '',
          teacher,
          classroom,
          time,
          credits: course.xf || course.jxbxf || '',
          category: course.kklxmc || course.kklxdm || '',
          status,
          capacity,
          selected,
          available,
          max_capacity: capacity.toString(),
          selected_count: selected.toString(),
          bjrs: capacity.toString(),
          yxzrs: selected.toString(),
          // 保留获取课程列表时使用的参数（如果存在）
          _rwlx: course._rwlx,
          _xklc: course._xklc,
          _xkly: course._xkly,
          _xkkz_id: course._xkkz_id
        })
      }
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
    _rwlx?: string  // 获取课程列表时使用的 rwlx 参数
    _xklc?: string  // 获取课程列表时使用的 xklc 参数
    _xkly?: string  // 获取课程列表时使用的 xkly 参数
    _xkkz_id?: string  // 获取课程列表时使用的 xkkz_id 参数
    _sfkxq?: string    // 课程列表中的 sfkxq 参数
    _xkxskcgskg?: string // 课程列表中的 xkxskcgskg 参数
    _completeParams?: any // 完整的参数对象
  },
  sessionId?: string,
  tempCookie?: string,
  schoolId?: string
) {
  try {
    console.log(`🎯 开始选课: ${courseData.kcmc || courseData.kch_id}`)
    console.log(`📋 选课时传递的参数: _rwlx=${courseData._rwlx}, _xklc=${courseData._xklc}, _xkly=${courseData._xkly}, _xkkz_id=${courseData._xkkz_id}`)

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

    // 2. 使用详细信息执行选课（传入schoolId和selectionDetails）
    const result = await executeCourseSelection(courseData, selectionDetails, sessionId, tempCookie, schoolId)

    // 如果返回了 needRelogin 标志，直接返回错误
    if ((result as any).needRelogin) {
      return {
        success: false,
        message: result.message || '会话已过期，请重新登录后再试',
        data: result.data,
        needRelogin: true
      }
    }

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
    _rwlx?: string
    _xklc?: string
    _xkly?: string
    _xkkz_id?: string
  },
  selectionDetails: any,
  sessionId?: string,
  tempCookie?: string,
  schoolId?: string
) {
  try {
    const config = createRequestConfig('POST', undefined, sessionId, tempCookie, schoolId)
    const urls = getApiUrls(schoolId)
    const currentSchool = schoolId ? (getSchoolById(schoolId) || getCurrentSchool()) : getCurrentSchool()

    // 获取页面隐藏参数（用于动态获取参数）
    const cookie = tempCookie || getGlobalCookie()
    const hiddenParams = await getPageHiddenParams(cookie, schoolId)


    // 从 selectionDetails 中提取参数
    // ⚠️ 重要：selectionDetails 是从 cxJxbWithKchZzxkYzb.html API 返回的数组
    // 数组中每个元素包含 do_jxb_id (加密的长字符串，用于选课)
    // 不应该使用 jxb_id (短ID，仅用于显示)
    let do_jxb_id = courseData.do_jxb_id || courseData.jxb_id
    let xkkz_id = courseData._xkkz_id
    let njdm_id = '2024'
    let zyh_id = '2001'
    let rlkz = '0'
    let rlzlkz = '1'
    let sxbj = '1'
    let xxkbj = '0'
    let cxbj = '0'
    let xkxnm = '2025'
    let xkxqm = '12'
    let jcxx_id = ''

    if (selectionDetails) {
      console.log('📋 SelectionDetails 数据结构:', JSON.stringify(selectionDetails, null, 2).substring(0, 500))

      // 如果 selectionDetails 是数组，取第一个元素
      const details = Array.isArray(selectionDetails) ? selectionDetails[0] : selectionDetails
      if (details) {
        // ⚠️ 关键修复：优先使用 do_jxb_id (加密长字符串)
        // 绝对不要回退到 jxb_id，因为那是错误的短ID
        if (details.do_jxb_id) {
          do_jxb_id = details.do_jxb_id
          console.log(`✅ 从 selectionDetails 获取加密 do_jxb_id: ${do_jxb_id.substring(0, 50)}...`)
        } else {
          console.warn(`⚠️ selectionDetails 中没有 do_jxb_id！完整数据:`, details)
          // 只有在 selectionDetails 完全没有 do_jxb_id 时才保持原值
          console.log(`⚠️ 保持使用 courseData 的值: ${do_jxb_id}`)
        }

        xkkz_id = xkkz_id || details.xkkz_id
        njdm_id = details.njdm_id || njdm_id
        zyh_id = details.zyh_id || zyh_id
        rlkz = details.rlkz || rlkz
        rlzlkz = details.rlzlkz || rlzlkz
        sxbj = details.sxbj || sxbj
        xxkbj = details.xxkbj || xxkbj
        cxbj = details.cxbj || cxbj
        xkxnm = details.xkxnm || xkxnm
        xkxqm = details.xkxqm || xkxqm
        jcxx_id = details.jcxx_id || jcxx_id
      }
    }

    // 从 hiddenParams 中获取参数（如果 selectionDetails 中没有）
    rlkz = rlkz === '0' ? (hiddenParams.rlkz || rlkz) : rlkz
    rlzlkz = rlzlkz === '1' ? (hiddenParams.rlzlkz || rlzlkz) : rlzlkz
    sxbj = sxbj === '1' ? (hiddenParams.sxbj || sxbj) : sxbj
    xxkbj = xxkbj === '0' ? (hiddenParams.xxkbj || xxkbj) : xxkbj
    cxbj = cxbj === '0' ? (hiddenParams.cxbj || cxbj) : cxbj
    xkxnm = xkxnm === '2025' ? (hiddenParams.xkxnm || xkxnm) : xkxnm
    xkxqm = xkxqm === '12' ? (hiddenParams.xkxqm || xkxqm) : xkxqm

    // 优先使用课程数据中保存的参数
    const rwlx = courseData._rwlx || '1'
    const xklc = courseData._xklc || '2'
    const kklxdm = courseData.kklxdm || '01'

    // 构建课程名称（格式: (kch_id)课程名）
    const kcmc = courseData.kcmc
      ? `(${courseData.kch_id})${courseData.kcmc}`
      : courseData.kch_id

    // 使用新的选课URL: zzxkyzbjk_xkBcZyZzxkYzb.html
    const courseSelectionUrl = `${currentSchool.protocol}://${currentSchool.domain}/jwglxt/xsxk/zzxkyzbjk_xkBcZyZzxkYzb.html?gnmkdm=N253512`

    // ⚠️ 安全检查：确保 do_jxb_id 是加密的长字符串（通常100+字符），不是短ID（32字符）
    if (do_jxb_id && do_jxb_id.length < 50) {
      console.error(`❌ 错误：jxb_ids 长度过短 (${do_jxb_id.length} 字符)，这可能是错误的短ID!`)
      console.error(`   短ID: ${do_jxb_id}`)
      console.error(`   应该使用从 cxJxbWithKchZzxkYzb.html API 返回的加密长ID`)
      console.warn(`⚠️ 强制继续，但选课可能失败...`)
    } else {
      console.log(`✅ jxb_ids 验证通过，长度: ${do_jxb_id?.length || 0} 字符`)
    }

    // 构建选课请求数据（根据实际 curl 命令，除 qz 外所有参数都动态获取）
    const formData = new URLSearchParams({
      'jxb_ids': do_jxb_id,
      'kch_id': courseData.kch_id,
      'kcmc': kcmc,
      'rwlx': rwlx,
      'rlkz': rlkz,
      'rlzlkz': rlzlkz,
      'sxbj': sxbj,
      'xxkbj': xxkbj,
      'qz': '0',  // qz 参数保持硬编码，不动态获取
      'cxbj': cxbj,
      'xkkz_id': xkkz_id || '',
      'njdm_id': njdm_id,
      'zyh_id': zyh_id,
      'kklxdm': kklxdm,
      'xklc': xklc,
      'xkxnm': xkxnm,
      'xkxqm': xkxqm,
      'jcxx_id': jcxx_id
    })

    console.log(`📤 执行选课 - POST请求到: ${courseSelectionUrl}`)
    console.log(`📋 选课表单数据:`, Object.fromEntries(formData))

    const response = await robustFetch(courseSelectionUrl, {
      ...config,
      body: formData.toString()
    })

    // 处理特殊状态码
    if (response.status === 901 || response.status === 910) {
      console.error(`状态码${response.status}：会话已过期，需要重新登录`)
      return {
        success: false,
        message: '会话已过期，请重新登录后再试',
        data: null,
        needRelogin: true
      }
    }

    if (!response.ok) {
      // 尝试获取错误信息
      let errorMessage = `选课请求失败，状态码: ${response.status}`
      try {
        const errorText = await response.text()
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.msg || errorJson.message || errorMessage
          } catch {
            // 如果不是JSON，使用原始文本
            if (errorText.length < 200) {
              errorMessage = errorText
            }
          }
        }
      } catch {
        // 忽略解析错误
      }
      throw new Error(errorMessage)
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
    _rwlx?: string  // 获取课程列表时使用的 rwlx 参数（优先使用）
    _xklc?: string  // 获取课程列表时使用的 xklc 参数（优先使用）
    _xkly?: string  // 获取课程列表时使用的 xkly 参数（优先使用）
    _xkkz_id?: string  // 获取课程列表时使用的 xkkz_id 参数（优先使用）
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

    // ⚠️ 关键修复：优先使用课程对象中保存的完整参数（来自 cxZzxkYzbDisplay.html）
    // 这些参数是获取课程列表时从 Display 页面提取的，包含 sfkxq、xkxskcgskg 等关键字段
    let courseParams: Record<string, any> = {}
    let hiddenParams: Record<string, any> = {}

    // ⚠️ 关键修复：混合参数获取策略
    // 1. 始终从服务器获取最新的环境参数（如 xqh_id, jg_id, zyh_id 等），这些参数与用户当前会话强相关
    // 2. 从 courseData 或缓存中获取课程特定的参数（如 sfkxq, xkxskcgskg），这些参数在 Display 页面中最准确

    // 1. 获取选课参数（传入schoolId）
    console.log('📋 获取选课参数（环境参数）...')
    courseParams = await getCourseSelectionParams(sessionId, tempCookie, schoolId)

    // 2. 获取页面隐藏数据（传入schoolId）
    console.log('🔍 获取页面隐藏数据（环境参数）...')
    hiddenParams = await getPageHiddenParams(cookie, schoolId)

    // 3. 合并课程特定参数
    let completeParams: Record<string, any> | undefined = courseData._completeParams

    if (!completeParams) {
      // 尝试从缓存获取
      const { getDisplayParamsFromCache } = require('./course-fetcher')
      completeParams = courseData._xkkz_id ? getDisplayParamsFromCache(courseData._xkkz_id) : undefined
    }

    if (completeParams) {
      console.log('✅ 从课程对象/缓存中合并关键参数 (sfkxq, xkxskcgskg)')
      // 只合并关键的课程特定参数，不覆盖环境参数
      if (completeParams.sfkxq) {
        hiddenParams.sfkxq = completeParams.sfkxq
        courseParams.sfkxq = completeParams.sfkxq
      }
      if (completeParams.xkxskcgskg) {
        hiddenParams.xkxskcgskg = completeParams.xkxskcgskg
        courseParams.xkxskcgskg = completeParams.xkxskcgskg
      }
      console.log(`🔍 [合并后] sfkxq="${hiddenParams.sfkxq}", xkxskcgskg="${hiddenParams.xkxskcgskg}"`)
    } else {
      console.warn('⚠️ 未找到课程特定参数 (sfkxq, xkxskcgskg)，将使用默认值或页面提取值')
    }

    // 3. 优先使用隐藏参数中的first*参数，然后使用courseData中的参数，最后使用默认值
    const kklxdm = hiddenParams.firstKklxdm || courseData.kklxdm || hiddenParams.kklxdm || '01'
    const xkkz_id = hiddenParams.firstXkkzId || courseData.xkkz_id || hiddenParams.xkkz_id || courseParams.xkkz_id || '3EC380169F7E8633E0636F1310AC7E15'
    const njdm_id = hiddenParams.firstNjdmId || hiddenParams.njdm_id || courseParams.njdm_id || '2024'
    const zyh_id = hiddenParams.firstZyhId || hiddenParams.zyh_id || courseParams.zyh_id || '088'

    console.log(`✅ 使用的关键参数: kklxdm=${kklxdm}, xkkz_id=${xkkz_id}, njdm_id=${njdm_id}, zyh_id=${zyh_id}`)

    // 优先使用课程数据中保存的参数（获取课程列表时使用的参数），确保选课时使用的参数与获取课程列表时使用的参数完全一致
    // 这些参数来自 buildFormDataPart1 构建的表单数据，是实际发送请求时使用的值
    // 注意：必须优先使用课程数据中的参数，因为这是获取该课程列表时实际使用的值
    let rwlx: string | null = null
    let xklc: string | null = null
    let xkly: string | null = null

    console.log(`🔍 参数来源检查（优先级：课程数据 > 页面隐藏参数 > 选课参数）:`)
    console.log(`  - 课程数据中的参数: _rwlx=${courseData._rwlx}, _xklc=${courseData._xklc}, _xkly=${courseData._xkly}`)
    console.log(`  - 页面隐藏参数: hiddenParams.rwlx=${hiddenParams.rwlx}, hiddenParams.xklc=${hiddenParams.xklc}, hiddenParams.xkly=${hiddenParams.xkly}`)
    console.log(`  - 选课参数: courseParams.rwlx=${courseParams.rwlx}, courseParams.xklc=${courseParams.xklc}, courseParams.xkly=${courseParams.xkly}`)

    // 首先检查课程数据中是否有保存的参数（这是最优先的，因为这是实际请求时使用的值）
    // 注意：即使值为空字符串，只要不是 undefined 或 null，也应该使用
    if (courseData._rwlx !== undefined && courseData._rwlx !== null) {
      rwlx = courseData._rwlx
      console.log(`✅ 使用课程数据中保存的rwlx=${rwlx}（来自获取课程列表时的请求参数）`)
    } else if (hiddenParams.rwlx !== undefined && hiddenParams.rwlx !== null && hiddenParams.rwlx !== '') {
      rwlx = hiddenParams.rwlx
      console.log(`✅ 使用页面隐藏参数的rwlx=${rwlx}`)
    } else if (courseParams.rwlx !== undefined && courseParams.rwlx !== null && courseParams.rwlx !== '') {
      rwlx = courseParams.rwlx
      console.log(`✅ 使用选课参数的rwlx=${rwlx}`)
    }

    if (courseData._xklc !== undefined && courseData._xklc !== null) {
      xklc = courseData._xklc
      console.log(`✅ 使用课程数据中保存的xklc=${xklc}（来自获取课程列表时的请求参数）`)
    } else if (hiddenParams.xklc !== undefined && hiddenParams.xklc !== null && hiddenParams.xklc !== '') {
      xklc = hiddenParams.xklc
      console.log(`✅ 使用页面隐藏参数的xklc=${xklc}`)
    } else if (courseParams.xklc !== undefined && courseParams.xklc !== null && courseParams.xklc !== '') {
      xklc = courseParams.xklc
      console.log(`✅ 使用选课参数的xklc=${xklc}`)
    }

    if (courseData._xkly !== undefined && courseData._xkly !== null) {
      xkly = courseData._xkly
      console.log(`✅ 使用课程数据中保存的xkly=${xkly}（来自获取课程列表时的请求参数）`)
    } else if (hiddenParams.xkly !== undefined && hiddenParams.xkly !== null && hiddenParams.xkly !== '') {
      xkly = hiddenParams.xkly
      console.log(`✅ 使用页面隐藏参数的xkly=${xkly}`)
    } else if (courseParams.xkly !== undefined && courseParams.xkly !== null && courseParams.xkly !== '') {
      xkly = courseParams.xkly
      console.log(`✅ 使用选课参数的xkly=${xkly}`)
    }

    // 如果所有来源都没有（undefined或null或空字符串），则根据kklxdm计算默认值
    if (rwlx === null || rwlx === undefined || rwlx === '') {
      console.log(`⚠️ 所有来源都没有rwlx，根据kklxdm=${kklxdm}计算默认值`)
      if (kklxdm === '01') {
        rwlx = '1'
      } else if (kklxdm === '10') {
        rwlx = '2'
      } else if (kklxdm === '05') {
        rwlx = '2'
      } else {
        rwlx = '1'
      }
    }

    if (xklc === null || xklc === undefined || xklc === '') {
      console.log(`⚠️ 所有来源都没有xklc，根据kklxdm=${kklxdm}计算默认值`)
      if (kklxdm === '01') {
        xklc = '2'
      } else if (kklxdm === '10') {
        xklc = '4'
      } else if (kklxdm === '05') {
        xklc = '3'
      } else {
        xklc = '2'
      }
    }

    if (xkly === null || xkly === undefined || xkly === '') {
      xkly = '0'
    }

    console.log(`✅ 最终使用的参数: rwlx=${rwlx}, xklc=${xklc}, xkly=${xkly}`)

    // ⚠️ 关键修复：教务系统的字段名可能带后缀（如 jg_id_1, xqh_id_1）
    // 创建智能字段查找函数
    const getParamValue = (baseName: string, ...sources: Record<string, any>[]): string => {
      for (const source of sources) {
        // 优先使用不带后缀的
        if (source[baseName] !== undefined && source[baseName] !== null && source[baseName] !== '') {
          return source[baseName]
        }
        // 查找带后缀的版本
        for (let i = 1; i <= 5; i++) {
          const withSuffix = `${baseName}_${i}`
          if (source[withSuffix] !== undefined && source[withSuffix] !== null && source[withSuffix] !== '') {
            console.log(`✅ 使用带后缀的字段: ${withSuffix} = ${source[withSuffix]} (映射为 ${baseName})`)
            return source[withSuffix]
          }
        }
      }
      return ''
    }

    // 4. 构建动态表单数据（使用智能字段查找）

    // ⚠️ 强制调试：检查参数来源
    console.log(`🔍 [DEBUG-BUILD] 开始构建formData`)
    console.log(`🔍 [DEBUG-BUILD] hiddenParams.sfkxq = "${hiddenParams.sfkxq}"`)
    console.log(`🔍 [DEBUG-BUILD] hiddenParams.xkxskcgskg = "${hiddenParams.xkxskcgskg}"`)
    console.log(`🔍 [DEBUG-BUILD] courseParams.sfkxq = "${courseParams.sfkxq}"`)
    console.log(`🔍 [DEBUG-BUILD] courseParams.xkxskcgskg = "${courseParams.xkxskcgskg}"`)
    console.log(`🔍 [DEBUG-BUILD] courseData._sfkxq = "${courseData._sfkxq}"`)
    console.log(`🔍 [DEBUG-BUILD] courseData._xkxskcgskg = "${courseData._xkxskcgskg}"`)

    const formData = new URLSearchParams({
      'rwlx': rwlx,
      'xkly': xkly,
      'bklx_id': (hiddenParams.bklx_id !== undefined && hiddenParams.bklx_id !== null)
        ? hiddenParams.bklx_id
        : ((courseParams.bklx_id !== undefined && courseParams.bklx_id !== null) ? courseParams.bklx_id : '0'),
      'sfkkjyxdxnxq': (hiddenParams.sfkkjyxdxnxq !== undefined && hiddenParams.sfkkjyxdxnxq !== null)
        ? hiddenParams.sfkkjyxdxnxq
        : ((courseParams.sfkkjyxdxnxq !== undefined && courseParams.sfkkjyxdxnxq !== null) ? courseParams.sfkkjyxdxnxq : '0'),
      'kzkcgs': (hiddenParams.kzkcgs !== undefined && hiddenParams.kzkcgs !== null)
        ? hiddenParams.kzkcgs
        : ((courseParams.kzkcgs !== undefined && courseParams.kzkcgs !== null) ? courseParams.kzkcgs : '0'),
      'xqh_id': getParamValue('xqh_id', hiddenParams, courseParams) || '01',
      'jg_id': getParamValue('jg_id', hiddenParams, courseParams) || '05',
      'zyh_id': zyh_id,
      'zyfx_id': getParamValue('zyfx_id', hiddenParams, courseParams) || 'wfx',
      'txbsfrl': getParamValue('txbsfrl', hiddenParams) || '0',
      'njdm_id': njdm_id,
      'bh_id': getParamValue('bh_id', hiddenParams, courseParams) || '',
      'xbm': getParamValue('xbm', hiddenParams, courseParams) || '1',
      'xslbdm': getParamValue('xslbdm', hiddenParams, courseParams) || 'wlb',
      'mzm': getParamValue('mzm', hiddenParams, courseParams) || '01',
      'xz': getParamValue('xz', hiddenParams, courseParams) || '4',
      'ccdm': getParamValue('ccdm', hiddenParams, courseParams) || '3',
      'xsbj': getParamValue('xsbj', hiddenParams, courseParams) || '0',
      'sfkknj': getParamValue('sfkknj', hiddenParams, courseParams) || '0',
      'gnjkxdnj': getParamValue('gnjkxdnj', hiddenParams, courseParams) || '0',
      'sfkkzy': getParamValue('sfkkzy', hiddenParams, courseParams) || '0',
      'kzybkxy': getParamValue('kzybkxy', hiddenParams, courseParams) || '0',
      'sfznkx': getParamValue('sfznkx', hiddenParams, courseParams) || '0',
      'zdkxms': getParamValue('zdkxms', hiddenParams, courseParams) || '0',
      'sfkxq': getParamValue('sfkxq', hiddenParams, courseParams) || courseData._sfkxq || '0',
      'sfkcfx': getParamValue('sfkcfx', hiddenParams, courseParams) || '0',
      'bbhzxjxb': getParamValue('bbhzxjxb', hiddenParams, courseParams) || '0',
      'kkbk': getParamValue('kkbk', hiddenParams, courseParams) || '0',
      'kkbkdj': getParamValue('kkbkdj', hiddenParams, courseParams) || '0',
      'bklbkcj': getParamValue('bklbkcj', hiddenParams, courseParams) || '0',
      'xkxnm': getParamValue('xkxnm', hiddenParams, courseParams) || '2025',
      'xkxqm': getParamValue('xkxqm', hiddenParams, courseParams) || '3',
      'xkxskcgskg': getParamValue('xkxskcgskg', hiddenParams) || courseData._xkxskcgskg || '0',
      'rlkz': getParamValue('rlkz', hiddenParams) || '0',
      'cdrlkz': getParamValue('cdrlkz', hiddenParams) || '0',
      'rlzlkz': getParamValue('rlzlkz', hiddenParams) || '1',
      'kklxdm': kklxdm,
      'kch_id': courseData.kch_id,
      'jxbzcxskg': getParamValue('jxbzcxskg', hiddenParams) || '0',
      'xklc': xklc,
      'xkkz_id': xkkz_id,
      'cxbj': getParamValue('cxbj', hiddenParams) || '0',
      'fxbj': getParamValue('fxbj', hiddenParams) || '0'
    })

    console.log(`📋 动态构建的抢课详细信息请求参数:`, Object.fromEntries(formData))

    // 选课时获取必要参数的URL: zzxkyzbjk_cxJxbWithKchZzxkYzb.html
    // 这个接口用于获取某门课程的选课必要参数（如jxb_id等），需要传入kch_id和xkkz_id
    const selectionDetailsUrl = `${currentSchool.protocol}://${currentSchool.domain}/jwglxt/xsxk/zzxkyzbjk_cxJxbWithKchZzxkYzb.html?gnmkdm=N253512`
    console.log(`📤 获取选课必要参数 - POST请求到: ${selectionDetailsUrl}`)

    const response = await fetch(selectionDetailsUrl, {
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
