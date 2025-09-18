# 📅 课表获取性能优化总结

## 🎯 优化目标

用户要求优化课表获取速度，模仿Python版本来实现动态表单参数获取。

## 🔍 分析Python版本

通过分析Python版本的课表获取实现（`gui.py`），发现其逻辑：

1. **获取课表页面**：先获取页面HTML
2. **解析参数**：从HTML中提取学年(xnm)、学期(xqm)、csrftoken
3. **获取课表数据**：使用解析的参数请求课表数据

## ❌ 原始Next.js版本的问题

### 1. **重复解析页面**
- 每次获取课表都要解析整个HTML页面
- 没有缓存解析结果
- 造成不必要的网络请求和解析开销

### 2. **缓存时间过短**
- 课表数据缓存只有5分钟
- 频繁重新获取相同数据

### 3. **没有请求去重**
- 没有防止重复请求的机制

## ✅ 优化方案实施

### 1. **添加课表参数缓存**

**新增功能**：
```typescript
// 课表参数缓存 - 避免重复解析页面
const scheduleParamsCache = new Map<string, { xnm: string, xqm: string, csrftoken: string, timestamp: number }>()
const SCHEDULE_PARAMS_CACHE_TIME = 30 * 60 * 1000 // 30分钟缓存

// 获取课表参数（带缓存）
async function getScheduleParams(cookie: string): Promise<{ xnm: string, xqm: string, csrftoken: string }> {
  const cacheKey = `schedule_params_${cookie.substring(0, 20)}`
  
  // 检查缓存
  const cached = scheduleParamsCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < SCHEDULE_PARAMS_CACHE_TIME) {
    console.log('📦 使用缓存的课表参数')
    return { xnm: cached.xnm, xqm: cached.xqm, csrftoken: cached.csrftoken }
  }
  
  // 解析页面并缓存结果
  // ...
}
```

**效果**：
- ✅ **避免重复解析**：30分钟内重复请求直接使用缓存参数
- ✅ **减少网络请求**：避免重复获取页面HTML
- ✅ **提升解析速度**：跳过HTML解析步骤

### 2. **添加请求去重**

**优化实现**：
```typescript
export async function getScheduleData(sessionId?: string, tempCookie?: string): Promise<any> {
  const cacheKey = cacheKeys.scheduleData
  const requestKey = `${cacheKey}_${sessionId || 'default'}_${tempCookie ? 'temp' : 'session'}`
  
  return deduplicatedRequest(requestKey, () => 
    withCache(cacheKey, async () => {
      // 课表获取逻辑
    })
  )
}
```

**效果**：
- ✅ **防止重复请求**：相同请求共享结果
- ✅ **节省资源**：避免并发重复请求

### 3. **延长缓存时间**

**优化前**：
```typescript
}, 5 * 60 * 1000) // 课表数据缓存5分钟
```

**优化后**：
```typescript
}, 10 * 60 * 1000) // 课表数据缓存10分钟，与Python版本一致
```

**效果**：
- ✅ **减少重复请求**：缓存时间翻倍
- ✅ **与Python版本一致**：保持相同的缓存策略

### 4. **添加性能监控**

**新增功能**：
```typescript
const startTime = Date.now()
console.log('📅 开始获取课表数据...')

// ... 获取逻辑 ...

const duration = Date.now() - startTime
console.log(`⚡ 课表获取完成! 用时: ${duration}ms`)
```

**效果**：
- ✅ **性能可见**：实时显示获取时间
- ✅ **便于调试**：了解性能瓶颈

## 📊 性能提升效果

### 缓存优化对比

| 项目 | 优化前 | 优化后 | 提升效果 |
|------|--------|--------|----------|
| 参数解析 | 每次都解析 | 30分钟缓存 | **避免重复解析** |
| 课表数据缓存 | 5分钟 | 10分钟 | **减少50%重复请求** |
| 请求去重 | 无 | 有 | **避免并发重复** |
| 性能监控 | 无 | 有 | **实时性能反馈** |

### 预期性能提升

- ✅ **首次获取**：与Python版本相同的速度
- ✅ **重复获取**：大幅提升（使用缓存参数）
- ✅ **并发请求**：避免重复，节省资源
- ✅ **整体体验**：更快的响应速度

## 🔧 技术实现细节

### 1. 智能参数缓存
```typescript
// 使用cookie前20位作为缓存键，避免敏感信息
const cacheKey = `schedule_params_${cookie.substring(0, 20)}`

// 30分钟缓存时间，平衡性能和数据新鲜度
const SCHEDULE_PARAMS_CACHE_TIME = 30 * 60 * 1000
```

### 2. 完整的错误处理
```typescript
// 检查登录状态
if (pageHtml.includes('登录') || pageHtml.toLowerCase().includes('login')) {
  throw new Error('Cookie可能无效或已过期，请检查Cookie设置')
}

// 验证必要参数
if (!xnm || !xqm) {
  throw new Error('无法获取学年或学期信息')
}
```

### 3. 与Python版本一致的逻辑
```typescript
// 完全按照Python版本的流程：
// 1. 获取页面HTML
// 2. 解析学年、学期、csrftoken
// 3. 使用参数请求课表数据
const { xnm, xqm, csrftoken } = await getScheduleParams(cookie)
```

## 🎯 优化策略

### 1. **分层缓存**
- **参数缓存**：30分钟，避免重复解析页面
- **数据缓存**：10分钟，避免重复获取课表数据

### 2. **智能去重**
- **请求去重**：防止并发重复请求
- **参数复用**：相同用户共享解析结果

### 3. **性能监控**
- **实时反馈**：显示获取时间
- **详细日志**：便于调试和优化

## 🚀 预期效果

### 首次获取
- **速度**：与Python版本相同
- **准确性**：动态获取正确的学年学期参数
- **稳定性**：完整的错误处理

### 重复获取
- **速度**：大幅提升（使用缓存参数）
- **效率**：避免重复解析和网络请求
- **体验**：更快的响应时间

### 并发场景
- **去重**：避免重复请求
- **共享**：相同请求共享结果
- **稳定**：更好的并发处理

## 🎉 总结

通过模仿Python版本的课表获取逻辑，并添加智能缓存和去重机制，实现了：

1. **⚡ 性能提升**：
   - 参数缓存避免重复解析
   - 数据缓存减少重复请求
   - 请求去重避免并发重复

2. **🎯 逻辑一致**：
   - 完全按照Python版本的流程
   - 动态获取学年学期参数
   - 相同的错误处理机制

3. **🛡️ 稳定性增强**：
   - 完整的错误处理
   - 智能缓存失效
   - 并发请求保护

4. **📊 可观测性**：
   - 实时性能监控
   - 详细的日志输出
   - 便于调试和优化

现在课表获取应该比之前快很多，特别是在重复获取时会有显著的性能提升！🚀
