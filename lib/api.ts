// Next.js API路由调用
import LocalCookieManager from './local-cookie-manager'

const API_BASE_URL = '/api'

// 通用请求函数
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  // 从本地存储获取Cookie并添加到请求头
  const localCookie = LocalCookieManager.getCookie()
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }
  
  // 如果有本地Cookie，添加到请求头
  if (localCookie) {
    headers['x-course-cookie'] = localCookie
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers,
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// API接口定义
export const courseAPI = {
  // 健康检查
  healthCheck: () => request('/health'),
  
  // 会话管理
  createSession: (data: { cookie: string }) =>
    request('/session', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSession: (sessionId: string) =>
    request(`/session?sessionId=${sessionId}`),
  deleteSession: (sessionId: string) =>
    request(`/session?sessionId=${sessionId}`, {
      method: 'DELETE',
    }),
  
  // 配置管理
  getConfig: () => request('/config'),
  setConfig: (data: { cookie: string }) => 
    request('/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 学生信息
  getStudentInfo: (sessionId?: string) => 
    request(`/student-info${sessionId ? `?sessionId=${sessionId}` : ''}`),
  
  // 课程信息
  getAvailableCourses: () => request('/courses/available'),
  getSelectedCourses: () => request('/courses/selected'),
  getScheduleData: () => request('/schedule'),
  
  // 选课功能
  executeSingleCourseSelection: (courseData: {
    jxb_id: string
    do_jxb_id: string
    kch_id: string
    jxbzls?: string
    kklxdm?: string
    kcmc?: string
    jxbmc?: string
  }) => 
    request('/course-selection/single', {
      method: 'POST',
      body: JSON.stringify(courseData),
    }),
  
  // 批量抢课
  executeBatchCourseSelection: (data: {
    courses: Array<{
      jxb_id: string
      do_jxb_id: string
      kch_id: string
      jxbzls?: string
      kklxdm?: string
      kcmc?: string
      jxbmc?: string
    }>
    batchSize?: number
    delay?: number
  }) => 
    request('/course-selection/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 智能选课
  startSmartCourseSelection: (data: {
    courses: any[]
    max_attempts?: number
    interval?: number
  }) => 
    request('/course-selection/smart/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  stopSmartCourseSelection: (threadId: string) => 
    request(`/course-selection/smart/stop/${threadId}`, {
      method: 'POST',
    }),
  
  getCourseSelectionStatus: (threadId: string) => 
    request(`/course-selection/status/${threadId}`),
  
  getCourseSelectionThreads: () => 
    Promise.resolve({
      success: true,
      data: {}
    }),
}
