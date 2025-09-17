// Next.js API路由调用
const API_BASE_URL = '/api'

// 通用请求函数
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
  
  // 配置管理
  getConfig: () => request('/config'),
  setConfig: (data: { cookie: string }) => 
    request('/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 学生信息
  getStudentInfo: () => request('/student-info'),
  
  // 课程信息
  getAvailableCourses: () => request('/courses/available'),
  getSelectedCourses: () => request('/courses/selected'),
  
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
