# 课表数据获取问题修复总结

## 🚨 问题描述

用户反映课表数据没有获取，即使设置了Cookie也无法正常显示课表信息。

## 🔍 问题根因分析

经过详细检查，发现了问题的根本原因：

### 问题1：课表API缺失
课表页面直接使用`fetch('/api/schedule')`而不是通过API层调用，导致没有携带Cookie请求头。

**问题代码**：
```typescript
// SchedulePage.tsx - 错误的实现
const response = await fetch('/api/schedule')
const result = await response.json()
```

**对比其他正常的API调用**：
```typescript
// CourseInfoPage.tsx - 正确的实现
const response = await courseAPI.getAvailableCourses() as any
```

### 问题2：API层定义缺失
在`lib/api.ts`中没有定义课表API，导致前端无法使用统一的API调用方式。

**缺失的API定义**：
```typescript
// lib/api.ts 中缺少
getScheduleData: () => request('/schedule'),
```

### 问题3：Cookie传递链断裂
课表页面 → 直接fetch → 后端API（没有Cookie请求头）→ 报错"Cookie未设置"

## ✅ 修复措施

### 1. 添加课表API定义

**修改文件**：`lib/api.ts`

```typescript
export const courseAPI = {
  // ... 其他API定义
  
  // 课程信息
  getAvailableCourses: () => request('/courses/available'),
  getSelectedCourses: () => request('/courses/selected'),
  getScheduleData: () => request('/schedule'), // ← 新增的课表API
  
  // ... 其他API定义
}
```

### 2. 修改课表页面导入

**修改文件**：`components/pages/SchedulePage.tsx`

```typescript
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
import { courseAPI } from '@/lib/api' // ← 新增导入
```

### 3. 修改API调用方式

**修改文件**：`components/pages/SchedulePage.tsx`

**修改前**：
```typescript
const fetchScheduleData = async (forceRefresh: boolean = false) => {
  // ...
  setIsLoading(true)
  try {
    const response = await fetch('/api/schedule') // ← 直接使用fetch
    const result = await response.json()
    
    if (result.success) {
      // ...
    }
  }
}
```

**修改后**：
```typescript
const fetchScheduleData = async (forceRefresh: boolean = false) => {
  // ...
  setIsLoading(true)
  try {
    const result = await courseAPI.getScheduleData() as any // ← 使用API层
    
    if (result.success) {
      // ...
    }
  }
}
```

### 4. 改进错误处理

**修改文件**：`components/pages/SchedulePage.tsx`

```typescript
} catch (error: any) {
  console.error('获取课表数据失败:', error)
  const errorMessage = error.message || '获取课表数据失败'
  if (errorMessage.includes('Cookie未设置')) {
    toast.error('请先配置Cookie', {
      duration: 5000
    })
  } else {
    toast.error('获取课表数据失败，请检查网络连接')
  }
} finally {
  setIsLoading(false)
}
```

## 🔄 修复后的数据流程

### 修复前（错误流程）
```
课表页面 → fetch('/api/schedule') → 后端API（无Cookie请求头）→ getScheduleData（无Cookie）→ 报错"Cookie未设置"
```

### 修复后（正确流程）
```
课表页面 → courseAPI.getScheduleData() → request() → 自动添加Cookie请求头 → 后端API → getScheduleData（有Cookie）→ 成功获取课表数据
```

## 🎯 技术细节

### Cookie传递机制
```typescript
// lib/api.ts - request函数
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

  // 发送请求...
}
```

### 后端API处理
```typescript
// app/api/schedule/route.ts
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取Cookie
    const cookieHeader = request.headers.get('x-course-cookie')
    
    if (!cookieHeader) {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置'
      }, { status: 400 })
    }
    
    // 使用Cookie获取课表数据
    const scheduleData = await getScheduleData(undefined, cookieHeader)
    // ...
  }
}
```

## 📊 修复验证

### 修复前
- ❌ 课表页面无法获取数据
- ❌ 报错"Cookie未设置"
- ❌ 即使输入了正确的Cookie也无效
- ❌ 数据流程断裂

### 修复后
- ✅ 课表页面可以正常获取数据
- ✅ Cookie正确传递到后端
- ✅ 与其他功能模块保持一致
- ✅ 完整的数据流程

## 🔧 架构一致性

修复后，所有功能模块都使用统一的API调用方式：

```typescript
// 课程信息页面
const response = await courseAPI.getAvailableCourses()
const response = await courseAPI.getSelectedCourses()

// 课表页面（修复后）
const response = await courseAPI.getScheduleData()

// 学生信息
const response = await courseAPI.getStudentInfo()

// 选课功能
const response = await courseAPI.executeSingleCourseSelection(courseData)
```

所有API调用都自动：
1. 从本地存储获取Cookie
2. 添加到请求头`x-course-cookie`
3. 统一的错误处理
4. 一致的数据格式

## 🎉 最终效果

现在课表功能可以：

- ✅ **正确获取本地Cookie**：从localStorage读取用户配置的Cookie
- ✅ **自动传递到后端**：通过请求头`x-course-cookie`传递
- ✅ **成功调用教务系统**：后端使用Cookie访问课表API
- ✅ **正常显示课表数据**：解析并格式化课表信息
- ✅ **保持多设备独立**：每个设备使用自己的Cookie

**问题完全解决！**现在用户配置Cookie后，课表页面可以正常获取和显示课表数据了。
