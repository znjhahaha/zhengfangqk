@echo off
setlocal enabledelayedexpansion

REM TYUST选课工具Windows部署脚本
REM 使用方法: deploy.bat [选项]

echo ==========================================
echo     TYUST选课工具部署脚本 (Windows)
echo ==========================================
echo.

REM 检查Docker是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker未安装，请先安装Docker Desktop
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose未安装，请先安装Docker Compose
    pause
    exit /b 1
)

echo [INFO] Docker环境检查通过

REM 检查必要的文件
if not exist "Dockerfile" (
    echo [ERROR] 缺少必要文件: Dockerfile
    pause
    exit /b 1
)

if not exist "docker-compose.yml" (
    echo [ERROR] 缺少必要文件: docker-compose.yml
    pause
    exit /b 1
)

if not exist "nginx.conf" (
    echo [ERROR] 缺少必要文件: nginx.conf
    pause
    exit /b 1
)

if not exist "package.json" (
    echo [ERROR] 缺少必要文件: package.json
    pause
    exit /b 1
)

echo [SUCCESS] 所有必要文件检查通过

REM 创建必要的目录
echo [INFO] 创建必要的目录...
if not exist "logs" mkdir logs
if not exist "logs\nginx" mkdir logs\nginx
if not exist "ssl" mkdir ssl
if not exist "backup" mkdir backup

echo [SUCCESS] 目录创建完成

REM 生成自签名SSL证书（仅用于测试）
if not exist "ssl\cert.pem" (
    echo [WARNING] 未找到SSL证书，生成自签名证书（仅用于测试）
    
    REM 检查OpenSSL是否可用
    openssl version >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] OpenSSL未安装，跳过SSL证书生成
        echo [WARNING] 生产环境请手动配置SSL证书
    ) else (
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl\key.pem -out ssl\cert.pem -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
        echo [SUCCESS] 自签名SSL证书生成完成
        echo [WARNING] 生产环境请使用正式的SSL证书
    )
) else (
    echo [SUCCESS] SSL证书已存在
)

REM 停止现有服务
echo [INFO] 停止现有服务...
docker-compose down
echo [SUCCESS] 服务停止完成

REM 构建Docker镜像
echo [INFO] 构建Docker镜像...
docker-compose build --no-cache
if errorlevel 1 (
    echo [ERROR] Docker镜像构建失败
    pause
    exit /b 1
)
echo [SUCCESS] Docker镜像构建完成

REM 启动服务
echo [INFO] 启动服务...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] 服务启动失败
    pause
    exit /b 1
)
echo [SUCCESS] 服务启动完成

REM 等待服务就绪
echo [INFO] 等待服务就绪...
set /a attempt=1
set /a max_attempts=30

:wait_loop
if %attempt% gtr %max_attempts% (
    echo [ERROR] 服务启动超时
    pause
    exit /b 1
)

REM 检查服务是否就绪
curl -f http://localhost:3000/api/health >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] 服务已就绪
    goto :show_status
)

echo [INFO] 等待服务启动... (!attempt!/!max_attempts!)
timeout /t 2 /nobreak >nul
set /a attempt+=1
goto :wait_loop

:show_status
echo.
echo [INFO] 服务状态:
docker-compose ps

echo.
echo [INFO] 服务日志:
docker-compose logs --tail=20

echo.
echo [SUCCESS] 部署完成！
echo.
echo 访问地址:
echo   HTTP:  http://localhost
echo   HTTPS: https://localhost
echo   健康检查: http://localhost:3000/api/health
echo.
echo 管理命令:
echo   查看日志: docker-compose logs -f
echo   重启服务: docker-compose restart
echo   停止服务: docker-compose down
echo   更新部署: deploy.bat
echo.

pause
