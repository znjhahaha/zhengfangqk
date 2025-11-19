@echo off
echo ====================================
echo   Capacitor Android APK 构建脚本
echo ====================================
echo.

echo [1/5] 检查依赖...
call npm list @capacitor/cli >nul 2>&1
if errorlevel 1 (
    echo 错误: 未安装 Capacitor，正在安装...
    call npm install @capacitor/core @capacitor/cli @capacitor/android --save-dev
)

echo [2/5] 构建 Next.js 应用（启用静态导出）...
set BUILD_APK=true
call npm run build
set BUILD_APK=
if errorlevel 1 (
    echo 错误: 构建失败！
    pause
    exit /b 1
)

echo [3/5] 检查 Capacitor 配置...
if not exist "capacitor.config.json" (
    echo 初始化 Capacitor...
    call npx cap init "正方教务工具" "com.tyust.course.selector" --web-dir=out
)

echo [4/5] 添加 Android 平台...
if not exist "android" (
    call npx cap add android
)

echo [5/5] 同步文件到 Android 项目...
call npx cap sync android

echo.
echo ====================================
echo   构建完成！
echo ====================================
echo.
echo 下一步：
echo 1. 运行: npm run cap:open
echo 2. 在 Android Studio 中点击 Build ^> Build APK(s)
echo.
pause

