# 手机版APK后端API配置说明

## 概述

手机版APK使用独立的API服务器，与网页版完全分离。网页版不受影响，继续使用Next.js内置的API路由。

## 配置步骤

### 1. 部署后端API服务器

按照 `mobile-api-server/README.md` 和 `mobile-api-server/DEPLOY.md` 的说明部署API服务器。

获取API服务器地址，例如：`https://your-api-server.com`

### 2. 配置APK环境变量

在构建APK之前，创建 `.env.local` 文件（或在构建时设置环境变量）：

```bash
# 手机版API服务器地址（仅APK使用）
NEXT_PUBLIC_MOBILE_API_URL=https://your-api-server.com
# 或者使用通用变量名
NEXT_PUBLIC_API_BASE_URL=https://your-api-server.com
```

### 3. 构建APK

```bash
npm run build:apk
```

构建时会自动：
- 检测APK环境
- 使用配置的API服务器地址
- 网页版不受影响

## 工作原理

### APK环境检测

`lib/apk-config.ts` 会自动检测APK环境：
- 检测 Capacitor 环境
- 检测环境变量 `NEXT_PUBLIC_IS_APK`
- 检测 User-Agent

### API URL动态切换

- **APK环境**：使用 `NEXT_PUBLIC_MOBILE_API_URL` 或 `NEXT_PUBLIC_API_BASE_URL` 配置的服务器地址
- **网页版**：使用相对路径 `/api`（Next.js内置API路由）

### 代码修改

所有API调用已更新为使用 `getApiUrl()` 函数：
- `lib/api.ts` - 所有通过 `courseAPI` 的调用
- `components/pages/CourseSelectionPage.tsx` - 服务器端抢课相关API
- `components/pages/ModernSchedulePage.tsx` - 课表API

## 注意事项

1. **网页版不受影响**：所有修改都只在APK环境中生效
2. **环境变量**：只在构建APK时需要设置，开发时不需要
3. **HTTPS要求**：APK需要使用HTTPS访问API服务器
4. **CORS配置**：确保API服务器配置了正确的CORS头

## 测试

### 开发环境测试

```bash
# 设置环境变量
export NEXT_PUBLIC_IS_APK=true
export NEXT_PUBLIC_MOBILE_API_URL=http://localhost:5000

# 启动开发服务器
npm run dev
```

### 生产环境测试

1. 部署API服务器
2. 设置环境变量
3. 构建APK
4. 安装到手机测试

## 故障排查

### APK无法连接API

1. 检查环境变量是否正确设置
2. 检查API服务器是否可访问
3. 检查CORS配置
4. 检查网络权限（AndroidManifest.xml）

### 网页版受影响

如果网页版也使用了API服务器地址，检查：
- 环境变量是否在网页版构建时被设置
- `isApkEnvironment()` 函数是否正确检测环境

