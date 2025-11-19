# 🔧 静态导出问题修复说明

## 问题描述

在开发模式下，Next.js 报错：
```
Page with `dynamic = "error"` couldn't be rendered statically because it used `request.url`.
Page with `dynamic = "error"` couldn't be rendered statically because it used `headers`.
```

**原因：**
- `next.config.js` 中启用了 `output: 'export'`（静态导出模式）
- API 路由使用了 `request.url` 和 `headers`，这些在静态导出模式下不可用

## 解决方案

### 1. 修改 `next.config.js`

**开发模式**：禁用静态导出，支持 API 路由
**构建 APK 时**：启用静态导出（通过环境变量 `BUILD_APK=true` 控制）

```javascript
// 只在构建APK时启用静态导出
...(process.env.BUILD_APK === 'true' ? { output: 'export' } : {}),
```

### 2. 更新构建脚本

- `build-apk.bat`：在构建时设置 `BUILD_APK=true`
- `build-apk.sh`：在构建时设置 `BUILD_APK=true`
- `package.json`：`build:apk` 脚本已更新

### 3. 添加动态渲染标记

在所有使用 `request.url` 或 `headers` 的 API 路由中添加：

```typescript
export const dynamic = 'force-dynamic'
```

**已修复的文件：**
- ✅ `app/api/admin/schools/route.ts`
- ✅ `app/api/admin/announcements/route.ts`
- ✅ `app/api/admin/announcements/confirm/route.ts`
- ✅ `app/api/admin/activation-codes/route.ts`
- ✅ `app/api/admin/suggestions/route.ts`
- ✅ `app/api/admin/server-selection/config/route.ts`
- ✅ `app/api/admin/cos-files/route.ts`

## 使用方法

### 开发模式（正常使用）

```bash
npm run dev
```

API 路由正常工作，不会启用静态导出。

### 构建 APK

```bash
# Windows
.\build-apk.bat

# Linux/Mac
./build-apk.sh

# 或使用 npm 脚本
npm run build:apk
```

构建时会自动设置 `BUILD_APK=true`，启用静态导出。

## 验证修复

1. **开发模式**：运行 `npm run dev`，API 路由应该正常工作
2. **构建 APK**：运行 `npm run build:apk`，应该能成功构建静态文件

## 注意事项

- 开发时不要手动设置 `BUILD_APK=true`
- 静态导出模式下，API 路由不会被打包（这是预期的，APK 需要单独部署 API 服务器）
- 如果添加新的 API 路由并使用 `request.url` 或 `headers`，记得添加 `export const dynamic = 'force-dynamic'`

