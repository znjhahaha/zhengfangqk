@echo off
chcp 65001 >nul
echo 🚀 启动TYUST选课工具 - Next.js全栈应用
echo.

echo 📋 检查环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到Node.js，请先安装Node.js
    echo 📥 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ 环境检查通过

echo.
echo 📦 安装依赖...
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 🚀 启动Next.js开发服务器...
echo 🌐 应用地址: http://localhost:3000
echo 📚 API文档: http://localhost:3000/api/health
echo.
echo 按 Ctrl+C 停止服务器
echo.

npm run dev
