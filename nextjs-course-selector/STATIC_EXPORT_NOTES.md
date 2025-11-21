# ⚠️ 重要：静态导出与API路由

## 问题说明

Next.js静态导出（`output: 'export'`）不支持服务器端API路由。这意味着：
- ❌ `/api/*` 路由在静态导出后不会工作
- ✅ 前端代码可以正常工作
- ✅ 需要配置API请求指向实际服务器

## 解决方案

### 方案1: 使用环境变量配置API服务器（推荐）

1. **创建环境变量文件**
   在 `nextjs-course-selector` 目录创建 `.env.local`:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=https://your-server-domain.com
   ```

2. **修改API调用**
   所有API调用需要指向实际服务器地址。

### 方案2: 使用代理服务器

在Capacitor配置中设置代理，将API请求转发到实际服务器。

### 方案3: 分离前端和后端

- 前端：静态导出，打包成APK
- 后端：单独部署，提供API服务

## 当前配置

Capacitor配置（`capacitor.config.json`）已设置：
```json
{
  "server": {
    "androidScheme": "https",
    "allowNavigation": ["*"]
  }
}
```

这允许应用访问外部API服务器。

## 建议

对于您的应用，建议：

1. **开发环境**：使用Next.js开发服务器（包含API路由）
2. **生产环境**：
   - 前端：打包成APK（静态导出）
   - 后端：部署到服务器（EdgeOne Pages或其他平台）
   - API请求：配置指向实际服务器地址

## 下一步

如果选择方案3（分离部署），需要：
1. 修改前端代码，使用环境变量配置API地址
2. 后端单独部署API服务
3. 前端APK通过HTTPS访问后端API

