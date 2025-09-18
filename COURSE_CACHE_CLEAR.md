# 课程信息页面清理缓存功能

## 🆕 新增功能

为课程信息页面添加了清理缓存功能，与课表页面保持一致。

## 🎯 功能描述

在课程信息页面的操作按钮区域添加了"清理缓存"按钮，点击后可以：

- ✅ **清理全局状态缓存**：清除已加载的可选课程和已选课程数据
- ✅ **清理本地存储缓存**：删除localStorage中的课程相关缓存数据
- ✅ **强制重新获取**：下次查询时会重新从服务器获取最新数据
- ✅ **用户友好提示**：显示成功清理的Toast提示

## 🔧 实现细节

### 清理缓存函数
```typescript
const clearAllCache = useCallback(() => {
  // 清理全局状态缓存
  clearAvailableCourses()
  clearSelectedCourses()
  
  // 清理API层缓存（如果有的话）
  if (typeof window !== 'undefined') {
    // 清理本地存储中的课程相关缓存
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('course') || key.includes('available') || key.includes('selected'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
  
  toast.success('缓存已清理，下次查询将重新获取数据')
  console.log('🗑️ 已清理所有课程缓存数据')
}, [clearAvailableCourses, clearSelectedCourses])
```

### UI界面
```typescript
<Button
  onClick={clearAllCache}
  variant="outline"
  className="btn-hover"
>
  <AlertCircle className="h-4 w-4 mr-2" />
  清理缓存
</Button>
```

## 📍 按钮位置

清理缓存按钮位于课程信息页面的操作区域：

```
[分类显示] [展开全部/收起全部] [刷新] [清理缓存]
```

## 🎯 使用场景

### 何时使用清理缓存
1. **数据不一致**：当显示的课程信息与实际不符时
2. **更新后查看**：在其他地方修改了选课后，需要查看最新状态
3. **性能优化**：清理过多的缓存数据，释放存储空间
4. **故障排除**：当页面显示异常时，清理缓存重新加载

### 与刷新功能的区别
- **刷新**：只刷新当前标签页（可选课程或已选课程）
- **清理缓存**：清理所有课程相关的缓存数据

## 🔄 工作流程

1. **用户点击"清理缓存"按钮**
2. **清理全局状态**：重置可选课程和已选课程的状态
3. **清理本地存储**：删除localStorage中的课程缓存
4. **显示成功提示**：Toast提示缓存已清理
5. **下次查询**：会重新从服务器获取最新数据

## 🎨 视觉设计

- **图标**：使用`AlertCircle`图标，表示清理操作
- **样式**：与其他按钮保持一致的`outline`风格
- **动画**：具有`btn-hover`效果
- **颜色**：使用主题默认的次要按钮颜色

## 🚀 使用方法

1. **打开课程信息页面**
2. **查看页面顶部的操作按钮区域**
3. **点击"清理缓存"按钮**
4. **等待提示"缓存已清理，下次查询将重新获取数据"**
5. **重新查询课程信息**：切换标签页或点击刷新

## 📊 清理范围

### 全局状态清理
- 可选课程列表数据
- 已选课程列表数据
- 数据加载状态标记

### 本地存储清理
- 包含"course"关键字的缓存项
- 包含"available"关键字的缓存项  
- 包含"selected"关键字的缓存项

## 🎉 特性优势

- ✅ **操作简单**：一键清理所有课程缓存
- ✅ **反馈及时**：立即显示操作结果
- ✅ **范围全面**：清理所有相关缓存数据
- ✅ **界面一致**：与其他功能保持统一的设计风格
- ✅ **性能友好**：使用useCallback优化性能

现在课程信息页面具备了完整的缓存管理功能，用户可以根据需要选择刷新特定数据或清理全部缓存！
