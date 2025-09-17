# TYUST选课工具部署指南

## 部署方案概览

本项目提供多种部署方案，您可以根据服务器环境和需求选择最适合的方案：

1. **Docker部署** (推荐) - 简单、可靠、易维护
2. **传统部署** - 直接在服务器上运行
3. **云平台部署** - Vercel、Netlify等
4. **自建服务器部署** - 完全控制

## 方案一：Docker部署 (推荐)

### 1. 创建Dockerfile

```dockerfile
# 使用官方Node.js镜像
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 构建应用
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产环境
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. 创建docker-compose.yml

```yaml
version: '3.8'

services:
  tyust-course-selector:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    networks:
      - tyust-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - tyust-course-selector
    restart: unless-stopped
    networks:
      - tyust-network

networks:
  tyust-network:
    driver: bridge
```

### 3. 创建Nginx配置

```nginx
events {
    worker_connections 1024;
}

http {
    upstream nextjs {
        server tyust-course-selector:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        
        # 重定向到HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # 安全头
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location / {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 4. 部署命令

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 方案二：传统服务器部署

### 1. 服务器要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**: 18.x 或更高版本
- **内存**: 最少2GB，推荐4GB+
- **存储**: 最少10GB可用空间
- **网络**: 公网IP和域名

### 2. 安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2

# 安装Nginx
sudo apt install nginx -y
```

### 3. 部署应用

```bash
# 克隆项目
git clone <your-repo-url> /var/www/tyust-course-selector
cd /var/www/tyust-course-selector

# 安装依赖
npm install

# 构建项目
npm run build

# 使用PM2启动
pm2 start npm --name "tyust-course-selector" -- start
pm2 save
pm2 startup
```

### 4. 配置Nginx

```bash
# 创建Nginx配置
sudo nano /etc/nginx/sites-available/tyust-course-selector
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/tyust-course-selector /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 方案三：云平台部署

### Vercel部署

1. 将代码推送到GitHub
2. 在Vercel中导入项目
3. 配置环境变量
4. 自动部署

### Netlify部署

1. 构建项目: `npm run build`
2. 上传`.next`文件夹到Netlify
3. 配置重定向规则

## 方案四：SSL证书配置

### 使用Let's Encrypt (免费)

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 环境变量配置

创建`.env.production`文件：

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 监控和日志

### PM2监控

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs tyust-course-selector

# 重启应用
pm2 restart tyust-course-selector
```

### 系统监控

```bash
# 安装htop
sudo apt install htop

# 监控系统资源
htop

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 安全配置

### 防火墙设置

```bash
# 配置UFW防火墙
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 系统安全

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置自动安全更新
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 备份策略

### 自动备份脚本

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/tyust-course-selector"
APP_DIR="/var/www/tyust-course-selector"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份应用文件
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR .

# 备份数据库（如果有）
# mysqldump -u username -p database_name > $BACKUP_DIR/db_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
# 设置定时备份
sudo crontab -e
# 添加: 0 2 * * * /path/to/backup.sh
```

## 性能优化

### 1. 启用Gzip压缩

在Nginx配置中添加：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### 2. 配置缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 数据库优化（如果使用）

```sql
-- 创建索引
CREATE INDEX idx_course_name ON courses(course_name);
CREATE INDEX idx_student_id ON students(student_id);
```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   sudo netstat -tulpn | grep :3000
   sudo kill -9 <PID>
   ```

2. **权限问题**
   ```bash
   sudo chown -R www-data:www-data /var/www/tyust-course-selector
   ```

3. **内存不足**
   ```bash
   # 增加交换空间
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### 日志分析

```bash
# 查看应用日志
pm2 logs tyust-course-selector --lines 100

# 查看系统日志
sudo journalctl -u nginx -f

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

## 更新部署

### 1. 代码更新

```bash
# 拉取最新代码
cd /var/www/tyust-course-selector
git pull origin main

# 安装新依赖
npm install

# 重新构建
npm run build

# 重启应用
pm2 restart tyust-course-selector
```

### 2. Docker更新

```bash
# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d
```

## 监控告警

### 设置监控

```bash
# 安装监控工具
sudo apt install htop iotop nethogs -y

# 配置邮件告警
sudo apt install mailutils -y
```

### 健康检查

创建健康检查脚本：

```bash
#!/bin/bash
# health-check.sh

URL="https://your-domain.com"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -ne 200 ]; then
    echo "Health check failed: $RESPONSE" | mail -s "TYUST选课工具告警" admin@your-domain.com
    pm2 restart tyust-course-selector
fi
```

## 总结

推荐使用Docker部署方案，因为它：

1. **环境一致性** - 开发和生产环境完全一致
2. **易于维护** - 一键启动、停止、更新
3. **资源隔离** - 不影响系统其他服务
4. **扩展性好** - 可以轻松扩展到多台服务器

选择适合您环境的部署方案，按照步骤操作即可成功部署到互联网上。
