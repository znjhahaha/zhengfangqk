# Cookie参数传递修复

## 🚨 问题描述

在终端中发现了新的错误：
```
🍪 获取会话Cookie: default 长度: 0
请求失败，状态码: 901，第1次重试...
获取选课参数失败: Error: 获取选课参数失败，状态码: 901
```

## 🔍 问题根因

在`getAvailableCourses`函数中，调用`getAvailableCourseDetails`时没有传递`sessionId`和`tempCookie`参数，导致Cookie无法正确传递到子函数调用。

**问题代码**：
```typescript
// lib/course-api.ts:504 - 缺少参数传递
const courseDetails = await getAvailableCourseDetails(kch_id, xkkz_id)
```

## ✅ 修复方案

**修复后**：
```typescript
// lib/course-api.ts:504 - 正确传递参数
const courseDetails = await getAvailableCourseDetails(kch_id, xkkz_id, '', sessionId, tempCookie)
```

## 🔄 参数传递链

**修复后的完整调用链**：
```
前端API调用
  ↓ (携带Cookie请求头)
API路由 (courses/available)
  ↓ (提取Cookie从请求头)
getAvailableCourses(sessionId, tempCookie)
  ↓ (传递参数)
getCourseSelectionParams(sessionId, tempCookie)
  ↓ (传递参数)  
getAvailableCourseDetails(kch_id, xkkz_id, '', sessionId, tempCookie) ← 修复的地方
  ↓ (使用Cookie创建请求)
教务系统API调用
```

## 🎯 影响范围

这个修复确保了：
- ✅ Cookie正确传递到所有子函数调用
- ✅ 获取课程详细信息时有正确的认证
- ✅ 避免状态码901（未授权）错误
- ✅ 课程信息可以正常获取和显示

## 🚀 测试验证

修复后应该不再出现：
- ❌ `获取会话Cookie: default 长度: 0`
- ❌ `请求失败，状态码: 901`
- ❌ `获取选课参数失败`

修复完成！现在Cookie应该能正确传递到所有需要的函数调用中。
