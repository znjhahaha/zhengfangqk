@echo off
chcp 65001 >nul
echo 🚀 启动TYUST选课工具 - Next.js现代化界面
echo.

echo 📋 检查环境...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到Node.js，请先安装Node.js
    echo 📥 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到Python，请先安装Python
    echo 📥 下载地址: https://www.python.org/
    pause
    exit /b 1
)

echo ✅ 环境检查通过

echo.
echo 📦 安装前端依赖...
if not exist node_modules (
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 前端依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 🐍 安装后端依赖...
cd backend
if not exist venv (
    echo 创建Python虚拟环境...
    python -m venv venv
)

echo 激活虚拟环境...
call venv\Scripts\activate.bat

echo 安装Python依赖...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ 后端依赖安装失败
    pause
    exit /b 1
)

cd ..

echo.
echo 🚀 启动服务...

echo 启动后端API服务器...
start "后端API服务器" cmd /k "cd backend && call venv\Scripts\activate.bat && python start_server.py"

echo 等待后端服务器启动...
timeout /t 3 /nobreak >nul

echo 启动前端开发服务器...
start "前端开发服务器" cmd /k "npm run dev"

echo.
echo ✅ 服务启动完成！
echo 🌐 前端地址: http://localhost:3000
echo 🔧 后端API: http://localhost:5000
echo.
echo 按任意键退出...
pause >nul
