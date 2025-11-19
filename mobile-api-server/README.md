# 手机版APK后端API服务器

这是专门为手机APK版本创建的后端API服务器，与网页版完全独立。

## 目录结构

```
mobile-api-server/
├── app/
│   └── api/          # API路由
├── lib/              # 共享库文件
├── data/             # 数据文件
├── package.json
├── next.config.js
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm run dev
```

服务器将在 `http://localhost:5000` 启动

### 3. 生产模式

```bash
npm run build
npm start
```

## 部署

### EdgeOne Pages 部署

1. 连接GitHub仓库
2. 构建命令：`npm install && npm run build`
3. 启动命令：`npm start`
4. 端口：`5000`

### 环境变量

创建 `.env.local`:

```bash
# 管理员密钥（与网页版保持一致）
ADMIN_SECRET_TOKEN=Znj00751_admin_2024

# COS存储配置（可选）
COS_SECRET_ID=your_secret_id
COS_SECRET_KEY=your_secret_key
COS_REGION=ap-beijing
COS_BUCKET=your_bucket_name
```

## API端点

所有API端点位于 `/api/*`，与网页版API路由保持一致。

## 注意事项

- 此服务器仅用于手机APK版本
- 网页版仍然使用Next.js内置的API路由
- 确保CORS配置正确，允许APK访问

