# 正方选课工具（zhengfangqk）

简短介绍
- 一个面向高校的现代化选课工具（Web + Android APK），支持多学校配置、智能选课/抢课、激活码、公告与建议反馈等。
- 已使用 Next.js 全栈架构实现，支持将前端打包为 Android APK（通过 Capacitor）。线上演示：https://zhengfangqk.vercel.app

主要特性
- 智能选课与自动重试策略
- 多学校与多用户数据隔离
- 激活码与公告/反馈系统
- 响应式 UI 与动画交互（Tailwind CSS + Framer Motion）
- 可打包为 Android APK（Capacitor）

技术栈
- Next.js 14 + React + TypeScript
- Tailwind CSS、Framer Motion
- Capacitor（Android 打包）
- 状态管理：Zustand

快速开始（开发）
1. 克隆并安装依赖
   ```bash
   git clone https://github.com/znjhahaha/zhengfangqk.git
   cd zhengfangqk
   npm install
   ```

2. 本地开发（启动 dev 服务器）
   ```bash
   npm run dev
   # 访问 http://127.0.0.1:3000
   ```

构建与打包
- 常规构建（生产）
  ```bash
  npm run build
  npm run start
  ```

- 构建 Android APK（需要已安装 Android Studio 与 Capacitor 环境）
  ```bash
  npm run build:apk       # 会执行构建并同步到 Capacitor 的 android 项目
  npm run cap:open        # 在 Android Studio 中打开项目进一步构建与签名
  ```

其他常用命令
- 清理构建产物：npm run clean
- Capacitor 操作：
  - 同步：npm run cap:sync
  - 添加平台：npm run cap:add

环境与注意事项
- 请参考仓库根目录的 env.example 来配置必要的环境变量。
- 打包 APK 前请确保已正确配置 Android SDK、Java、签名等（详见仓库内的 APK 构建文档）。
- 自动抢课功能请在合规范围内使用，避免违反学校或第三方服务条款。

许可
- Apache License 2.0

