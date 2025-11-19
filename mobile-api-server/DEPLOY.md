# 手机版API服务器部署说明

## 快速开始

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   复制 `.env.example` 为 `.env.local` 并填入配置

3. **开发模式**
   ```bash
   npm run dev
   ```
   服务器将在 `http://localhost:5000` 启动

4. **生产模式**
   ```bash
   npm run build
   npm start
   ```

## 文件复制

运行以下命令复制所需文件：

```powershell
# Windows PowerShell
cd mobile-api-server
powershell -ExecutionPolicy Bypass -File copy-files.ps1
```

或者手动复制：
- `nextjs-course-selector/lib/*` → `mobile-api-server/lib/`
- `nextjs-course-selector/app/api/*` → `mobile-api-server/app/api/`
- `nextjs-course-selector/data/*` → `mobile-api-server/data/` (可选)

## EdgeOne Pages 部署

1. 连接 GitHub 仓库
2. 构建命令：`npm install && npm run build`
3. 启动命令：`npm start`
4. 端口：`5000`
5. 环境变量：在平台设置中添加 `.env.local` 中的变量

## API 端点

所有 API 端点与网页版保持一致，位于 `/api/*`

## 注意事项

- 确保 CORS 配置正确
- 使用 HTTPS 部署（APK 需要）
- 确保环境变量正确设置

