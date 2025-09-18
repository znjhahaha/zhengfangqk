# Docker部署指南

## 🚀 快速开始

### 1. 安装Docker Desktop

**下载地址**: https://www.docker.com/products/docker-desktop/

**安装要求**:
- Windows 10 64位 (版本1903或更高)
- 启用WSL 2功能
- 启用Hyper-V功能

**安装步骤**:
1. 下载Docker Desktop安装程序
2. 运行安装程序，按照向导完成安装
3. 重启电脑
4. 启动Docker Desktop

### 2. 验证安装

打开命令行，运行以下命令验证Docker是否安装成功：

```bash
docker --version
docker-compose --version
```

如果显示版本信息，说明安装成功。

### 3. 部署项目

在项目目录下运行以下命令：

```bash
# 方法1: 使用部署脚本（推荐）
.\deploy.bat

# 方法2: 手动部署
docker-compose up -d
```

### 4. 访问应用

部署成功后，您可以通过以下地址访问：

- **本地访问**: http://localhost:3000
- **HTTPS访问**: https://localhost (需要配置SSL证书)

## 🔧 手动部署步骤

如果自动部署脚本有问题，可以手动执行以下步骤：

### 1. 创建必要目录

```bash
mkdir logs
mkdir logs\nginx
mkdir ssl
mkdir backup
```

### 2. 生成SSL证书（可选）

```bash
# 如果有OpenSSL，可以生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl\key.pem -out ssl\cert.pem -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
```

### 3. 构建并启动服务

```bash
# 构建Docker镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 🌐 让项目在互联网上可访问

### 方案一：使用内网穿透工具

#### 1. 使用ngrok（推荐）

**安装ngrok**:
1. 访问 https://ngrok.com/
2. 注册账号并下载ngrok
3. 解压到任意目录

**使用ngrok**:
```bash
# 在ngrok目录下运行
ngrok http 3000
```

ngrok会提供一个公网地址，如：`https://abc123.ngrok.io`

#### 2. 使用frp

**下载frp**:
- 访问：https://github.com/fatedier/frp/releases
- 下载Windows版本

**配置frp**:
```ini
# frpc.ini
[common]
server_addr = your-server-ip
server_port = 7000

[web]
type = http
local_port = 3000
custom_domains = your-domain.com
```

### 方案二：使用云服务器

#### 1. 购买云服务器

推荐服务商：
- **阿里云ECS** - 国内访问快
- **腾讯云CVM** - 性价比高
- **华为云ECS** - 稳定性好

#### 2. 上传项目到服务器

```bash
# 使用Git
git clone <your-repo-url>
cd tyust-course-selector

# 或使用SCP上传
scp -r ./nextjs-course-selector root@your-server-ip:/root/
```

#### 3. 在服务器上部署

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 部署项目
cd /root/tyust-course-selector
docker-compose up -d
```

## 📊 管理命令

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f tyust-course-selector
docker-compose logs -f nginx
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart tyust-course-selector
```

### 停止服务
```bash
docker-compose down
```

### 更新部署
```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose down
docker-compose build
docker-compose up -d
```

## 🔍 故障排除

### 常见问题

#### 1. Docker未启动
```
错误: Cannot connect to the Docker daemon
解决: 启动Docker Desktop
```

#### 2. 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :80

# 杀死占用进程
taskkill /PID <进程ID> /F
```

#### 3. 权限问题
```bash
# 以管理员身份运行命令行
# 或检查Docker Desktop是否以管理员身份运行
```

#### 4. 内存不足
```bash
# 检查Docker Desktop内存设置
# 在Docker Desktop设置中增加内存分配
```

### 日志分析

```bash
# 查看详细日志
docker-compose logs --tail=100

# 查看错误日志
docker-compose logs | findstr ERROR
```

## 🎯 部署检查清单

- [ ] Docker Desktop已安装并启动
- [ ] 项目文件完整
- [ ] 端口3000和80未被占用
- [ ] 防火墙允许相应端口
- [ ] 服务正常启动
- [ ] 可以访问http://localhost:3000
- [ ] 健康检查通过

## 📞 技术支持

如果遇到问题：

1. **查看日志**: `docker-compose logs -f`
2. **检查状态**: `docker-compose ps`
3. **重启服务**: `docker-compose restart`
4. **重新部署**: `.\deploy.bat`

完成以上步骤后，您的TYUST选课工具就可以在本地运行，并通过内网穿透工具在互联网上访问了！
