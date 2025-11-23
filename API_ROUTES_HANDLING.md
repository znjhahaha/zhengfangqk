# ⚠️ API路由在静态导出时的处理

## 问题

Next.js静态导出（`output: 'export'`）不支持：
- ❌ API路由（`app/api/*`）
- ❌ 动态路由参数（`[threadId]`等）

## 解决方案

### 临时方案：重命名或移动动态API路由

在构建APK之前，需要处理动态API路由文件：

1. **重命名动态路由文件夹**
   ```bash
   # 将 [threadId] 重命名为 _threadId
   mv app/api/course-selection/status/[threadId] app/api/course-selection/status/_threadId
   ```

2. **或者创建一个构建脚本**
   在构建前自动重命名这些文件夹

### 推荐方案：分离部署

由于应用有大量API路由，建议：

1. **前端（APK）**：静态导出，只包含UI
2. **后端（服务器）**：部署API服务到EdgeOne Pages或其他平台
3. **前端配置**：使用环境变量指向API服务器

### 临时处理脚本

创建 `scripts/prepare-static-export.js`:

```javascript
const fs = require('fs');
const path = require('path');

// 重命名动态路由文件夹
const dynamicRoutes = [
  'app/api/course-selection/status/[threadId]',
  'app/api/course-selection/smart/stop/[threadId]',
];

dynamicRoutes.forEach(route => {
  const oldPath = path.join(__dirname, '..', route);
  const newPath = oldPath.replace('[', '_').replace(']', '');
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`重命名: ${route} -> ${newPath}`);
  }
});
```

## 下一步

1. 运行临时脚本处理动态路由
2. 或者采用分离部署方案
3. 或者将这些API调用改为客户端直接调用后端服务器

