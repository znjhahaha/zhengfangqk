# 📱 快速打包APK指南

## ⚡ 快速开始（3步）

### 1. 安装Capacitor

```bash
cd nextjs-course-selector
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2. 修改配置启用静态导出

编辑 `next.config.js`，取消注释以下行：

```javascript
output: 'export',
images: {
  unoptimized: true,
},
```

### 3. 构建并打包

```bash
# 构建Next.js应用
npm run build

# 初始化Capacitor（首次运行）
npx cap init

# 添加Android平台
npx cap add android

# 同步文件
npx cap sync android

# 打开Android Studio
npx cap open android
```

在Android Studio中点击 `Build` → `Build APK(s)` 即可生成APK！

## 📋 详细步骤

### 前置准备

1. **安装Java JDK 17+**
   ```bash
   java -version  # 应该显示17或更高版本
   ```

2. **安装Android Studio**
   - 下载: https://developer.android.com/studio
   - 安装时选择Android SDK

3. **设置环境变量（Windows）**
   ```powershell
   # 设置ANDROID_HOME
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')
   
   # 添加到PATH
   $env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
   ```

### 完整流程

```bash
# 1. 安装依赖
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. 修改next.config.js（见上面）

# 3. 构建应用
npm run build

# 4. 初始化Capacitor（首次）
npx cap init "正方教务工具" "com.tyust.course.selector"

# 5. 添加Android平台
npx cap add android

# 6. 同步文件
npx cap sync android

# 7. 打开Android Studio
npx cap open android
```

### 在Android Studio中构建

1. 等待项目同步完成（右下角）
2. 点击菜单 `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
3. 等待构建完成
4. 点击通知中的 `locate`，找到APK文件
5. APK位置: `android/app/build/outputs/apk/debug/app-debug.apk`

## 🎨 添加应用图标

在 `public/` 目录下创建：
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

## 📦 生成签名APK（用于发布）

1. **生成密钥库**
   ```bash
   keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
   ```

2. **配置签名**
   编辑 `android/app/build.gradle`，在 `android` 块中添加：
   ```gradle
   signingConfigs {
       release {
           storeFile file('path/to/my-release-key.jks')
           storePassword 'your-password'
           keyAlias 'my-key-alias'
           keyPassword 'your-password'
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
       }
   }
   ```

3. **构建Release APK**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## 🔧 常见问题

### 问题1: 找不到Android SDK
```bash
# 检查环境变量
echo $ANDROID_HOME  # Linux/Mac
echo %ANDROID_HOME%  # Windows CMD
$env:ANDROID_HOME   # PowerShell
```

### 问题2: 构建失败 - Gradle错误
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### 问题3: 网络请求失败
在 `capacitor.config.json` 中添加：
```json
{
  "server": {
    "allowNavigation": ["*"]
  }
}
```

### 问题4: 白屏问题
- 检查 `webDir` 是否为 `out`
- 确保 `npm run build` 成功
- 检查浏览器控制台错误

## 📱 安装APK到手机

1. **通过USB**
   ```bash
   adb install app-debug.apk
   ```

2. **通过文件传输**
   - 将APK复制到手机
   - 在手机上打开文件管理器
   - 点击APK文件安装
   - 允许"未知来源"安装

## 🚀 更新应用

```bash
# 1. 修改代码
# 2. 重新构建
npm run build

# 3. 同步到Android
npx cap sync android

# 4. 在Android Studio中重新构建APK
```

## 📚 更多资源

- [完整构建指南](./BUILD_APK.md)
- [Capacitor文档](https://capacitorjs.com/docs)
- [Next.js静态导出](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

