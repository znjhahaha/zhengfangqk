# 正方选课工具 - Next.js全栈应用 🎓

专为多学校设计的现代化选课工具，采用Next.js全栈架构，提供美观易用的Web界面和移动端APK，支持多用户同时使用，数据完全隔离。

## ✨ 功能特点

### 🎯 核心功能
- **🎓 学生信息管理** - 查看和刷新学生基本信息
- **📚 课程信息浏览** - 查看可选课程和已选课程，支持搜索和筛选
- **🎯 智能选课系统** - 多种选课模式，自动抢课
- **📅 课表查询** - 查看个人课程表，支持导出
- **📊 成绩查询** - 查询学期成绩和总体成绩
- **⚙️ 系统配置管理** - Cookie配置和个性化设置
- **🏫 多学校支持** - 支持多个学校配置，可在后台添加新学校
- **📢 公告系统** - 管理员可发布公告，用户可查看和确认
- **💬 建议反馈** - 用户可提交建议和反馈，管理员可查看
- **🔐 激活码系统** - 服务器端抢课功能需要激活码
- **📱 移动端支持** - 支持打包为Android APK

### 🚀 技术特色
- **Next.js全栈** - 前后端一体化，无需额外后端服务
- **多用户支持** - 完全的用户数据隔离，支持多用户同时使用
- **数据持久化** - 所有数据（学校、公告、建议、激活码）永久保存
- **本地存储** - 用户数据存储在浏览器本地（localStorage），确保隐私
- **服务器无状态** - 服务器端不存储用户状态，所有状态在客户端
- **现代化UI** - 基于Next.js 14 + Tailwind CSS
- **响应式设计** - 支持各种屏幕尺寸
- **动画效果** - 流畅的页面切换和交互动画
- **实时状态** - 选课进度实时显示
- **智能重试** - 自动重试机制，提高成功率
- **Capacitor支持** - 可打包为原生移动应用

## 📦 项目结构

```
.
├── nextjs-course-selector/     # Next.js应用（网页版和手机版）
│   ├── app/                    # Next.js App Router
│   ├── components/             # React组件
│   ├── lib/                    # 工具函数和业务逻辑
│   ├── public/                 # 静态资源
│   ├── android/                # Android项目（用于打包APK）
│   ├── package.json           # 依赖配置
│   └── README.md              # 详细文档
└── README.md                   # 本文件
```

## 🚀 快速开始

### 网页版

1. **安装依赖**
   ```bash
   cd nextjs-course-selector
   npm install
   ```

2. **启动开发服务器**
```bash
   npm run dev
   ```

3. **访问应用**
   打开浏览器访问: http://127.0.0.1:3000

### 手机版（Android APK）

详细步骤请参考：
- [SETUP_COMPLETE.md](./nextjs-course-selector/SETUP_COMPLETE.md) - 配置完成指南
- [APK_BUILD_GUIDE.md](./nextjs-course-selector/APK_BUILD_GUIDE.md) - 快速构建指南
- [BUILD_APK.md](./nextjs-course-selector/BUILD_APK.md) - 完整构建文档

**快速构建：**
```bash
cd nextjs-course-selector
npm run build:apk
npm run cap:open
```

然后在Android Studio中构建APK。

## 📚 详细文档

所有详细文档都在 `nextjs-course-selector/` 目录下：

- **README.md** - 完整的功能说明和技术文档
- **SETUP_COMPLETE.md** - Capacitor配置完成指南
- **APK_BUILD_GUIDE.md** - APK快速构建指南
- **BUILD_APK.md** - 详细的APK构建文档
- **STATIC_EXPORT_NOTES.md** - 静态导出和API路由说明
- **API_ROUTES_HANDLING.md** - API路由处理说明
- **COS_SETUP.md** - 腾讯云COS存储配置（可选）

## ⚠️ 重要提示

### API路由说明

静态导出模式下（用于打包APK），Next.js API路由不会打包。需要：

1. **前端（APK）**：静态文件，只包含UI
2. **后端（服务器）**：单独部署API服务
3. **配置**：前端通过环境变量指向API服务器

详见 `nextjs-course-selector/STATIC_EXPORT_NOTES.md`

## 🛠️ 技术栈

- **Next.js 14** - React全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Capacitor** - 移动应用框架
- **Framer Motion** - 动画库

## 📝 更新日志

### v3.0.0（当前版本）
- ✅ 移除Python GUI版本，专注于Web和移动端
- ✅ 支持Capacitor打包为Android APK
- ✅ 完整的激活码系统
- ✅ 服务器端抢课功能
- ✅ 多学校支持
- ✅ 公告和建议系统

## 📄 许可证

本项目仅供学习交流使用。

## 🙏 致谢

感谢所有贡献者和使用者的支持！
