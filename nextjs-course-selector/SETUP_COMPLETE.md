# ✅ Capacitor Android APK 配置完成！

## 🎉 已完成的配置

1. ✅ **Capacitor依赖已安装**
   - @capacitor/core
   - @capacitor/cli
   - @capacitor/android

2. ✅ **Next.js静态导出已配置**
   - `output: 'export'` 已启用
   - 图片优化已禁用
   - 动态路由处理脚本已创建

3. ✅ **Capacitor配置已完成**
   - `capacitor.config.json` 已创建
   - 应用ID: `com.tyust.course.selector`
   - Web目录: `out`

4. ✅ **构建脚本已创建**
   - `build-apk.bat` (Windows)
   - `build-apk.sh` (Linux/Mac)
   - 自动处理动态路由

5. ✅ **PWA支持已配置**
   - `manifest.json` 已创建
   - 主题色配置完成

## 🚀 开始打包APK

### 方法1: 使用构建脚本（推荐）

**Windows:**
```bash
cd nextjs-course-selector
.\build-apk.bat
```

**Linux/Mac:**
```bash
cd nextjs-course-selector
chmod +x build-apk.sh
./build-apk.sh
```

### 方法2: 手动执行

```bash
cd nextjs-course-selector

# 1. 构建Next.js应用（会自动处理动态路由）
npm run build

# 2. 初始化Capacitor（首次运行）
npm run cap:init

# 3. 添加Android平台（首次运行）
npm run cap:add

# 4. 同步文件到Android项目
npm run cap:sync

# 5. 打开Android Studio
npm run cap:open
```

## 📱 在Android Studio中构建APK

1. **等待项目同步完成**（右下角提示）
2. **点击菜单**: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
3. **等待构建完成**
4. **点击通知**: `locate` 查看APK位置
5. **APK位置**: `android/app/build/outputs/apk/debug/app-debug.apk`

## ⚠️ 重要提示

### API路由说明

静态导出模式下，Next.js API路由（`/api/*`）不会打包到APK中。

**解决方案：**
1. **分离部署**（推荐）
   - 前端：APK（静态文件）
   - 后端：单独部署API服务器
   - 配置API请求指向服务器地址

2. **使用环境变量**
   创建 `.env.local`:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=https://your-api-server.com
   ```

详见 `STATIC_EXPORT_NOTES.md` 和 `API_ROUTES_HANDLING.md`

### 环境要求

- ✅ Node.js 18+
- ✅ Java JDK 17+
- ✅ Android Studio
- ✅ Android SDK

### 环境变量配置（Windows PowerShell）

```powershell
# 设置ANDROID_HOME
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')

# 添加到PATH
$env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

## 🎨 应用图标

需要创建应用图标文件（可选）：
- `public/icon-192.png` (192x192)
- `public/icon-512.png` (512x512)

可以使用在线工具生成：
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

## 📚 相关文档

- [APK_BUILD_GUIDE.md](./APK_BUILD_GUIDE.md) - 快速构建指南
- [BUILD_APK.md](./BUILD_APK.md) - 完整构建文档
- [STATIC_EXPORT_NOTES.md](./STATIC_EXPORT_NOTES.md) - API路由说明
- [API_ROUTES_HANDLING.md](./API_ROUTES_HANDLING.md) - 动态路由处理

## 🎯 下一步

1. **安装Android Studio**（如果还没有）
   - 下载: https://developer.android.com/studio

2. **配置环境变量**（见上面）

3. **运行构建脚本**
   ```bash
   npm run build:apk
   ```

4. **在Android Studio中构建APK**

5. **安装到手机测试**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

## ✨ 完成！

配置已完成，可以开始打包APK了！如有问题，请查看相关文档或联系支持。

