# Vercel部署指南

## 🚀 快速部署到Vercel

### 第一步：准备项目

✅ **html2canvas问题已修复**
- 已安装 `html2canvas` 依赖
- 已安装 `@types/html2canvas` 类型定义
- 已修复配置选项兼容性问题

### 第二步：部署到Vercel

#### 方法一：通过Vercel网站部署（推荐）

1. **访问Vercel**
   - 打开 https://vercel.com/
   - 使用GitHub账号登录

2. **导入项目**
   - 点击 "New Project"
   - 选择您的GitHub仓库
   - 选择 `nextjs-course-selector` 文件夹

3. **配置项目**
   - **Framework Preset**: Next.js
   - **Root Directory**: `./nextjs-course-selector`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. **环境变量**（可选）
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://your-domain.vercel.app/api
   ```

5. **部署**
   - 点击 "Deploy"
   - 等待部署完成

#### 方法二：使用Vercel CLI

1. **安装Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   cd nextjs-course-selector
   vercel
   ```

4. **生产部署**
   ```bash
   vercel --prod
   ```

### 第三步：配置自定义域名（可选）

1. **在Vercel Dashboard中**
   - 进入项目设置
   - 点击 "Domains"
   - 添加您的域名

2. **配置DNS**
   - 添加CNAME记录指向Vercel
   - 或添加A记录指向Vercel IP

## 🔧 项目配置

### Next.js配置优化

项目已包含以下优化配置：

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  images: {
    domains: ['localhost']
  }
}
```

### 环境变量

创建 `.env.local` 文件（本地开发）：

```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 构建优化

项目已配置以下构建优化：

- ✅ **代码分割**: 自动代码分割
- ✅ **图片优化**: Next.js图片优化
- ✅ **CSS优化**: 自动CSS优化
- ✅ **包优化**: 优化包导入
- ✅ **控制台清理**: 生产环境移除console

## 📊 部署状态检查

### 构建成功指标

- ✅ **TypeScript编译**: 通过
- ✅ **ESLint检查**: 通过
- ✅ **页面生成**: 成功
- ✅ **静态资源**: 优化完成

### 已知警告（不影响部署）

- ⚠️ **Metadata viewport**: 建议移动到viewport export
- ⚠️ **Critters模块**: 错误页面预渲染问题（不影响功能）

## 🌐 访问地址

部署成功后，您将获得：

- **Vercel域名**: `https://your-project.vercel.app`
- **自定义域名**: `https://your-domain.com`（如果配置）

## 🔄 自动部署

### GitHub集成

1. **推送代码**
   ```bash
   git add .
   git commit -m "Update project"
   git push origin main
   ```

2. **自动部署**
   - Vercel会自动检测代码变更
   - 自动触发新的部署
   - 部署完成后更新网站

### 分支部署

- **main分支**: 生产环境
- **其他分支**: 预览环境

## 📈 性能监控

### Vercel Analytics

1. **启用Analytics**
   - 在Vercel Dashboard中启用
   - 查看访问统计和性能数据

2. **性能指标**
   - Core Web Vitals
   - 页面加载时间
   - 用户交互数据

## 🛠️ 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 检查构建日志
vercel logs

# 本地测试构建
npm run build
```

#### 2. 环境变量问题
```bash
# 在Vercel Dashboard中设置环境变量
# 或使用CLI
vercel env add VARIABLE_NAME
```

#### 3. 依赖问题
```bash
# 清理依赖
rm -rf node_modules package-lock.json
npm install
```

### 调试命令

```bash
# 查看部署日志
vercel logs

# 本地预览
vercel dev

# 检查项目状态
vercel ls
```

## 🎯 部署检查清单

- [ ] 项目构建成功
- [ ] html2canvas依赖已安装
- [ ] TypeScript编译通过
- [ ] 代码已推送到GitHub
- [ ] Vercel项目已创建
- [ ] 域名已配置（可选）
- [ ] 环境变量已设置（可选）
- [ ] 网站可正常访问

## 📞 技术支持

如果遇到问题：

1. **查看Vercel Dashboard日志**
2. **检查GitHub Actions状态**
3. **本地测试构建**: `npm run build`
4. **联系Vercel支持**

## 🎉 部署完成

恭喜！您的TYUST选课工具已成功部署到Vercel，现在可以在互联网上访问了！

**访问地址**: `https://your-project.vercel.app`

**主要功能**:
- ✅ 课程信息查看
- ✅ 课表显示和导出
- ✅ 智能选课
- ✅ 系统设置
- ✅ 自动登录
- ✅ 响应式设计
