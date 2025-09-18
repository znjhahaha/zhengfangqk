# 课表查询缓存优化指南

## 🐛 问题描述

用户反映在每次点击查询课表时，右上角都会跳出好几个"查询成功"提示，影响用户体验。这是因为每次点击都会触发API请求，没有缓存机制。

## 🔍 问题分析

### 根本原因
1. **缺乏缓存机制**：每次点击查询都会重新请求API
2. **重复toast提示**：每次请求成功都会显示toast
3. **用户体验差**：频繁的提示信息干扰用户操作

### 影响范围
- 用户体验不佳
- 不必要的网络请求
- 重复的成功提示
- 性能浪费

## ✅ 解决方案

### 1. 添加智能缓存机制

**缓存策略**：
- 使用localStorage持久化缓存
- 5分钟缓存有效期
- 自动过期清理
- 支持强制刷新

**缓存键**：
```typescript
const CACHE_KEY = 'schedule_data_cache'
const CACHE_TIMESTAMP_KEY = 'schedule_data_timestamp'
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟
```

### 2. 优化toast显示逻辑

**显示规则**：
- 只在第一次加载时显示成功提示
- 强制刷新时显示成功提示
- 使用缓存时不显示提示
- 错误时始终显示错误提示

**实现逻辑**：
```typescript
// 只在第一次加载或强制刷新时显示成功提示
if (!hasLoadedOnce || forceRefresh) {
  toast.success(`成功获取课表，共 ${result.data.length} 门课程`)
}
```

### 3. 缓存管理函数

**获取缓存**：
```typescript
const getCachedData = (): ScheduleCourse[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    if (cached && timestamp) {
      const now = Date.now()
      const cacheTime = parseInt(timestamp)
      
      // 检查缓存是否过期
      if (now - cacheTime < CACHE_DURATION) {
        console.log('📦 从缓存加载课表数据')
        return JSON.parse(cached)
      } else {
        console.log('⏰ 缓存已过期，清理缓存')
        clearCache()
      }
    }
  } catch (error) {
    console.error('读取缓存失败:', error)
    clearCache()
  }
  return null
}
```

**保存缓存**：
```typescript
const setCachedData = (data: ScheduleCourse[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    console.log('💾 课表数据已缓存')
  } catch (error) {
    console.error('保存缓存失败:', error)
  }
}
```

**清理缓存**：
```typescript
const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_TIMESTAMP_KEY)
    console.log('🗑️ 课表缓存已清理')
  } catch (error) {
    console.error('清理缓存失败:', error)
  }
}
```

### 4. 优化查询逻辑

**智能查询**：
```typescript
const fetchScheduleData = async (forceRefresh: boolean = false) => {
  // 如果不是强制刷新，先尝试从缓存加载
  if (!forceRefresh) {
    const cachedData = getCachedData()
    if (cachedData && cachedData.length > 0) {
      setScheduleData(cachedData)
      setHasLoadedOnce(true)
      console.log('📦 使用缓存的课表数据')
      return
    }
  }

  // 如果已经有数据且不是强制刷新，直接返回
  if (scheduleData.length > 0 && !forceRefresh) {
    console.log('📦 课表数据已存在，跳过请求')
    return
  }

  // 执行API请求...
}
```

### 5. 初始化优化

**启动时缓存检查**：
```typescript
useEffect(() => {
  // 先尝试从缓存加载，如果没有缓存再请求API
  const cachedData = getCachedData()
  if (cachedData && cachedData.length > 0) {
    setScheduleData(cachedData)
    setHasLoadedOnce(true)
    console.log('📦 初始化时使用缓存的课表数据')
  } else {
    fetchScheduleData()
  }
}, [])
```

### 6. 用户界面优化

**添加清理缓存按钮**：
```typescript
<Button
  onClick={() => {
    clearCache()
    setScheduleData([])
    setHasLoadedOnce(false)
    toast.success('缓存已清理，下次查询将重新获取数据')
  }}
  variant="outline"
  className="btn-hover"
>
  <AlertCircle className="h-4 w-4 mr-2" />
  清理缓存
</Button>
```

## 🎯 修复效果

### 修复前
- ❌ 每次点击都显示"查询成功"
- ❌ 重复的API请求
- ❌ 用户体验差
- ❌ 性能浪费

### 修复后
- ✅ 只在必要时显示提示
- ✅ 智能缓存减少请求
- ✅ 流畅的用户体验
- ✅ 性能优化

## 🚀 使用说明

### 正常使用流程
1. 用户首次进入课表页面
2. 系统自动从缓存加载（如果有）
3. 没有缓存时请求API并缓存结果
4. 后续查询直接使用缓存

### 强制刷新流程
1. 用户点击"刷新课表"按钮
2. 系统强制请求API
3. 更新缓存数据
4. 显示成功提示

### 清理缓存流程
1. 用户点击"清理缓存"按钮
2. 系统清理所有缓存数据
3. 重置状态
4. 下次查询重新获取数据

## 🔧 技术特性

### 缓存机制
- **持久化存储**：使用localStorage保存数据
- **时间戳验证**：检查缓存是否过期
- **自动清理**：过期缓存自动删除
- **错误处理**：缓存异常时自动清理

### 性能优化
- **减少网络请求**：缓存有效期内不重复请求
- **快速响应**：缓存数据即时显示
- **内存管理**：过期数据自动清理
- **用户体验**：减少不必要的提示

### 用户控制
- **强制刷新**：支持手动刷新数据
- **缓存清理**：支持手动清理缓存
- **状态重置**：清理后重置所有状态
- **友好提示**：清晰的操作反馈

## 📝 注意事项

1. **缓存有效期**：默认5分钟，可根据需要调整
2. **存储限制**：localStorage有大小限制
3. **数据一致性**：缓存可能与服务器数据不同步
4. **清理机制**：定期清理过期缓存

## 🎉 总结

通过实现智能缓存机制和优化toast显示逻辑，成功解决了课表查询的重复提示问题：

- ✅ 减少重复的API请求
- ✅ 优化用户体验
- ✅ 提升系统性能
- ✅ 提供用户控制选项

现在用户在使用课表功能时，不会再看到重复的"查询成功"提示，系统会智能地使用缓存数据，只在必要时才显示提示信息。
