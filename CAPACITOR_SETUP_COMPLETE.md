# 📱 Capacitor Android APK 配置完成

## ✅ 已完成的配置

1. ✅ **安装Capacitor依赖**
   - @capacitor/core
   - @capacitor/cli  
   - @capacitor/android

2. ✅ **启用静态导出**
   - `next.config.js` 已配置 `output: 'export'`
   - 图片优化已禁用（静态导出要求）

3. ✅ **Capacitor配置**
   - `capacitor.config.json` 已创建
   - 应用ID: `com.tyust.course.selector`
   - Web目录: `out`

4. ✅ **构建脚本**
   - `build-apk.bat` (Windows)
   - `build-apk.sh` (Linux/Mac)

5. ✅ **PWA支持**
   - `manifest.json` 已创建
   - 主题色和图标配置完成

## 🚀 快速开始

### Windows用户
```bash
cd nextjs-course-selector
.\build-apk.bat
```

### Linux/Mac用户
```bash
cd nextjs-course-selector
chmod +x build-apk.sh
./build-apk.sh
```

### 手动步骤
```bash
# 1. 构建Next.js应用
npm run build

# 2. 初始化Capacitor（首次运行）
npx cap init "正方教务工具" "com.tyust.course.selector" --web-dir=out

# 3. 添加Android平台
npx cap add android

# 4. 同步文件
npx cap sync android

# 5. 打开Android Studio
npx cap open android
```

## ⚠️ 重要提示

### API路由问题

静态导出模式下，Next.js API路由（`/api/*`）不会工作。您需要：

1. **选项A：分离部署**
   - 前端：打包成APK
   - 后端：单独部署API服务器
   - 配置API请求指向实际服务器

2. **选项B：使用代理**
   - 配置Capacitor代理
   - 将API请求转发到实际服务器

详见 `STATIC_EXPORT_NOTES.md`

### 环境要求

- ✅ Node.js 18+
- ✅ Java JDK 17+
- ✅ Android Studio
- ✅ Android SDK（通过Android Studio安装）

### 环境变量配置

如果使用分离部署，创建 `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=https://your-api-server.com
```

## 📋 下一步操作

1. **确保已安装Android Studio**
   - 下载: https://developer.android.com/studio

2. **配置环境变量**
   ```bash
   # Windows PowerShell
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')
   ```

3. **运行构建脚本**
   ```bash
   npm run build:apk
   # 或
   .\build-apk.bat
   ```

4. **在Android Studio中构建**
   - 点击 `Build` → `Build APK(s)`
   - APK位置: `android/app/build/outputs/apk/debug/app-debug.apk`

## 🎨 应用图标

需要创建应用图标：
- `public/icon-192.png` (192x192)
- `public/icon-512.png` (512x512)

可以使用在线工具生成：
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

## 📚 参考文档

- [APK_BUILD_GUIDE.md](./APK_BUILD_GUIDE.md) - 快速构建指南
- [BUILD_APK.md](./BUILD_APK.md) - 完整构建文档
- [STATIC_EXPORT_NOTES.md](./STATIC_EXPORT_NOTES.md) - API路由说明

