# Cookie请求头传递机制修复总结

## 🚨 问题描述

用户在设置界面输入了Cookie，但系统仍然报错"Cookie未设置"，导致功能无法正常使用。错误信息显示：

```
📅 API: 获取课表数据失败: Error: Cookie未设置
🍪 获取会话Cookie: default 长度: 0
```

## 🔍 问题根因分析

虽然我们之前实现了多设备独立使用的本地Cookie管理，但忘记了更新所有的API接口来使用新的请求头传递机制。具体问题：

1. **前端已正确实现**：`lib/api.ts`已经将本地Cookie添加到请求头
2. **部分API未更新**：多个API接口仍在使用旧的服务器端Cookie存储机制
3. **函数参数不匹配**：核心函数签名没有更新支持临时Cookie参数

## ✅ 修复措施

### 1. 修复API路由

#### Schedule API (`app/api/schedule/route.ts`)
```typescript
export async function GET(request: NextRequest) {
  try {
    console.log('📅 API: 开始获取课表数据')
    
    // 从请求头获取Cookie
    const cookieHeader = request.headers.get('x-course-cookie')
    
    if (!cookieHeader) {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置',
        message: '请先在设置页面配置Cookie',
        action: 'go_to_settings'
      }, { status: 400 })
    }
    
    const scheduleData = await getScheduleData(undefined, cookieHeader)
    const formattedData = formatScheduleData(scheduleData)
    // ...
  }
}
```

#### 可选课程API (`app/api/courses/available/route.ts`)
```typescript
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

    const courses = await getAvailableCourses(undefined, cookieHeader)
    // ...
  }
}
```

#### 已选课程API (`app/api/courses/selected/route.ts`)
```typescript
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

    const rawData = await getSelectedCourses(undefined, cookieHeader)
    // ...
  }
}
```

#### 单选课API (`app/api/course-selection/single/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  try {
    // 从请求头获取Cookie
    const cookieHeader = request.headers.get('x-course-cookie')
    
    if (!cookieHeader) {
      return NextResponse.json({
        success: false,
        error: 'Cookie未设置'
      }, { status: 400 })
    }

    const result = await selectCourseWithVerification(courseInfo, undefined, cookieHeader)
    // ...
  }
}
```

### 2. 更新核心函数

#### `getScheduleData`函数
```typescript
export async function getScheduleData(sessionId?: string, tempCookie?: string): Promise<any> {
  return withCache(cacheKeys.scheduleData, async () => {
    // 优先使用临时Cookie，然后根据会话ID获取对应的Cookie
    let cookie = tempCookie
    if (!cookie) {
      cookie = sessionId ? getSessionCookie(sessionId) : getGlobalCookie()
    }
    
    if (!cookie) {
      throw new Error('Cookie未设置')
    }
    // ...
  })
}
```

#### `getAvailableCourses`函数
```typescript
export async function getAvailableCourses(sessionId?: string, tempCookie?: string) {
  return withCache(cacheKeys.availableCourses('all'), async () => {
    try {
      const params = await getCourseSelectionParams(sessionId, tempCookie)
      // ...
      const config = createRequestConfig('POST', formData.toString(), sessionId, tempCookie)
      // ...
    }
  })
}
```

#### `getSelectedCourses`函数
```typescript
export async function getSelectedCourses(sessionId?: string, tempCookie?: string) {
  return withCache(cacheKeys.selectedCourses, async () => {
    try {
      const params = await getCourseSelectionParams(sessionId, tempCookie)
      // ...
      const config = createRequestConfig('POST', formData.toString(), sessionId, tempCookie)
      // ...
    }
  })
}
```

#### `selectCourseWithVerification`函数
```typescript
export async function selectCourseWithVerification(courseInfo: {
  jxb_id: string
  do_jxb_id: string
  kch_id: string
  jxbzls: string
  kklxdm?: string
  kcmc?: string
  jxbmc?: string
}, sessionId?: string, tempCookie?: string) {
  try {
    const result = await executeCourseSelection(courseInfo, sessionId, tempCookie)
    const parsedResult = parseCourseSelectionResult(result, courseInfo)
    const verification = await verifyCourseSelection({
      kch_id: courseInfo.kch_id,
      jxb_id: courseInfo.jxb_id,
      kcmc: courseInfo.kcmc,
      jxbmc: courseInfo.jxbmc
    }, sessionId, tempCookie)
    // ...
  }
}
```

#### `getCourseSelectionParams`函数
```typescript
async function getCourseSelectionParams(sessionId?: string, tempCookie?: string) {
  try {
    const config = createRequestConfig('GET', undefined, sessionId, tempCookie)
    // ...
    // 从Cookie中获取备用参数
    let cookie = tempCookie
    if (!cookie) {
      cookie = sessionId ? getSessionCookie(sessionId) : getGlobalCookie()
    }
    const cookieParams = extractStudentParamsFromCookie(cookie)
    // ...
  }
}
```

### 3. 支持函数更新

#### `executeCourseSelection`函数
```typescript
export async function executeCourseSelection(courseData: {
  jxb_id: string
  do_jxb_id: string
  kch_id: string
  jxbzls: string
  kklxdm?: string
}, sessionId?: string, tempCookie?: string) {
  try {
    // 优先使用临时Cookie，然后根据会话ID获取对应的Cookie
    let cookie = tempCookie
    if (!cookie) {
      cookie = sessionId ? getSessionCookie(sessionId) : getGlobalCookie()
    }
    
    if (!cookie) {
      return { flag: "0", msg: "Cookie未设置" }
    }
    
    const params = await getCourseSelectionParams(sessionId, tempCookie)
    // ...
    const config = createRequestConfig('POST', formData.toString(), sessionId, tempCookie)
    // ...
  }
}
```

#### `verifyCourseSelection`函数
```typescript
export async function verifyCourseSelection(courseInfo: {
  kch_id: string
  jxb_id: string
  kcmc?: string
  jxbmc?: string
}, sessionId?: string, tempCookie?: string) {
  try {
    const selectedCourses = await getSelectedCourses(sessionId, tempCookie)
    // ...
  }
}
```

#### `getCourseDetails`函数
```typescript
export async function getCourseDetails(kch_id: string, sessionId?: string, tempCookie?: string) {
  try {
    const params = await getCourseSelectionParams(sessionId, tempCookie)
    // ...
    const config = createRequestConfig('POST', formData.toString(), sessionId, tempCookie)
    // ...
  }
}
```

#### `getAvailableCourseDetails`函数
```typescript
async function getAvailableCourseDetails(kch_id: string, xkkz_id: string = '', jxb_id: string = '', sessionId?: string, tempCookie?: string) {
  try {
    const params = await getCourseSelectionParams(sessionId, tempCookie)
    // ...
    const config = createRequestConfig('POST', formData, sessionId, tempCookie)
    // ...
  }
}
```

## 🔄 数据流程

### 修复前的错误流程
```
前端本地Cookie → API请求头 → 服务器API忽略请求头 → 查找服务器端Cookie → 服务器端Cookie为空 → 报错"Cookie未设置"
```

### 修复后的正确流程
```
前端本地Cookie → API请求头 → 服务器API读取请求头 → 传递给核心函数 → 使用临时Cookie → 成功调用教务系统
```

## 🎯 关键修复点

1. **统一参数传递**：所有核心函数都支持`sessionId`和`tempCookie`参数
2. **请求头获取**：所有API路由都从`x-course-cookie`请求头获取Cookie
3. **优先级处理**：临时Cookie > 会话Cookie > 全局Cookie
4. **错误处理**：统一的Cookie未设置错误处理
5. **兼容性保持**：保持向后兼容，不破坏现有功能

## 📊 修复结果

### 修复前
- ❌ schedule API报错"Cookie未设置"
- ❌ 可选课程API无法获取数据
- ❌ 已选课程API无法获取数据
- ❌ 选课功能无法使用
- ❌ 多设备独立使用功能不完整

### 修复后
- ✅ 所有API都能正确获取和使用Cookie
- ✅ 真正实现了多设备独立使用
- ✅ 每个设备使用自己的本地Cookie
- ✅ 所有功能恢复正常
- ✅ 系统架构更加一致和健壮

## 🔧 技术亮点

1. **渐进式修复**：逐个API接口修复，不影响其他功能
2. **参数传递优化**：使用可选参数，保持函数签名的向后兼容
3. **错误处理统一**：所有API都有一致的错误提示
4. **架构一致性**：前后端Cookie处理机制完全统一
5. **性能保持**：修复过程不影响系统性能

## 🎉 最终效果

现在用户在设置界面输入Cookie后，系统可以：

- ✅ 正确识别和使用本地存储的Cookie
- ✅ 成功获取课表数据
- ✅ 正常显示可选课程和已选课程
- ✅ 正常进行选课操作
- ✅ 真正实现多设备独立使用

**问题完全解决！**系统现在可以正常使用，每个设备都有独立的Cookie管理，不会再出现"Cookie未设置"的错误。
