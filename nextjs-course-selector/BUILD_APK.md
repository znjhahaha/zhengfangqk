# 📱 打包Android APK指南

本指南将帮助您将Next.js应用打包成Android APK文件。

## 🎯 方案选择

### 方案1: Capacitor（推荐）⭐
- ✅ 性能最好
- ✅ 可访问原生功能（通知、文件系统等）
- ✅ 支持热更新
- ✅ 可发布到Google Play

### 方案2: PWA（简单）
- ✅ 无需打包，直接安装
- ✅ 更新方便
- ❌ 功能受限，无法访问某些原生API

## 📦 方案1: 使用Capacitor打包APK

### 前置要求

1. **安装Java JDK 17+**
   ```bash
   # 检查Java版本
   java -version
   ```

2. **安装Android Studio**
   - 下载: https://developer.android.com/studio
   - 安装Android SDK和Build Tools

3. **配置环境变量**
   ```bash
   # Windows (PowerShell)
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')
   [System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Java\jdk-17', 'User')
   
   # 添加到PATH
   $env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools;$env:JAVA_HOME\bin"
   ```

### 安装步骤

#### 1. 安装依赖

```bash
cd nextjs-course-selector
npm install @capacitor/core @capacitor/cli @capacitor/android
```

#### 2. 初始化Capacitor

```bash
npx cap init
```

按照提示填写：
- App name: `正方教务工具`
- App ID: `com.tyust.course.selector`
- Web Dir: `out`

#### 3. 配置Next.js静态导出

修改 `next.config.js`:

```javascript
const nextConfig = {
  output: 'export',  // 添加这行，启用静态导出
  images: {
    unoptimized: true,  // 静态导出需要禁用图片优化
  },
  // ... 其他配置
}
```

#### 4. 构建应用

```bash
# 构建Next.js应用
npm run build

# 添加Android平台
npx cap add android

# 同步文件到Android项目
npx cap sync android
```

#### 5. 生成APK

**方法A: 使用Android Studio（推荐）**

```bash
# 打开Android Studio
npx cap open android
```

在Android Studio中：
1. 等待项目同步完成
2. 点击 `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
3. APK文件将生成在 `android/app/build/outputs/apk/debug/`

**方法B: 使用命令行**

```bash
cd android
./gradlew assembleDebug
# APK文件在: android/app/build/outputs/apk/debug/app-debug.apk
```

#### 6. 生成签名APK（用于发布）

1. 生成密钥库:
```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

2. 配置签名:
编辑 `android/app/build.gradle`，添加签名配置：

```gradle
android {
    signingConfigs {
        release {
            storeFile file('path/to/my-release-key.jks')
            storePassword 'your-store-password'
            keyAlias 'my-key-alias'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

3. 构建Release APK:
```bash
cd android
./gradlew assembleRelease
```

## 📱 方案2: PWA方式（无需打包）

### 步骤

1. **构建应用**
   ```bash
   npm run build
   ```

2. **部署到服务器**
   - 将 `out` 目录上传到Web服务器
   - 确保HTTPS访问（PWA要求）

3. **在手机上安装**
   - 用手机浏览器访问应用
   - 浏览器会提示"添加到主屏幕"
   - 点击添加即可安装

## 🎨 创建应用图标

创建应用图标文件：

1. **准备图标**
   - 192x192 PNG
   - 512x512 PNG

2. **放置到public目录**
   ```
   public/
     ├── icon-192.png
     └── icon-512.png
   ```

3. **在线工具生成图标**
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator

## 🔧 常见问题

### 1. 构建失败：找不到Android SDK
```bash
# 设置ANDROID_HOME环境变量
export ANDROID_HOME=/path/to/android/sdk
```

### 2. 网络请求失败
在 `capacitor.config.json` 中添加：
```json
{
  "server": {
    "allowNavigation": ["*"]
  }
}
```

### 3. 白屏问题
- 检查 `webDir` 配置是否正确
- 确保构建输出在 `out` 目录
- 检查控制台错误信息

### 4. Cookie存储问题
Capacitor使用WebView，Cookie存储在WebView中，与浏览器隔离。

## 📝 更新应用

1. **修改代码并构建**
   ```bash
   npm run build
   ```

2. **同步到Android项目**
   ```bash
   npx cap sync android
   ```

3. **重新构建APK**

## 🚀 发布到Google Play

1. 准备应用图标、截图、描述
2. 生成签名APK（AAB格式）
3. 在Google Play Console上传应用
4. 填写应用信息并提交审核

## 📚 参考资源

- [Capacitor官方文档](https://capacitorjs.com/docs)
- [Next.js静态导出](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Android开发指南](https://developer.android.com/)

