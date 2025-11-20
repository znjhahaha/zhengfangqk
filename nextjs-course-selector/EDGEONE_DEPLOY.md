# EdgeOne Pages 部署指南

## 快速开始

### 一键部署（推荐）

```bash
# 1. 构建 Next.js 应用
npm run build

# 2. 构建 EdgeOne Functions（打包成单文件）
npm run build:edgeone

# 3. 提交并推送
git add .
git commit -m "Deploy to EdgeOne Pages"
git push
```

## 详细说明

### 问题背景

EdgeOne Pages 的边缘函数运行在 V8 Isolate 沙箱环境中，**不支持多文件 ESM 动态解析**。

如果 `functions/index.js` 中有 `import './handler.js'` 这样的相对路径导入，会报错：

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/user/handler.js' imported from /var/user/index.mjs
```

### 解决方案

使用 `esbuild` 将所有文件打包成**单文件 bundle**，消除所有相对路径 import。

### 构建流程

#### 1. 安装依赖

```bash
npm install
```

（`esbuild` 已在 `devDependencies` 中）

#### 2. 编写 Functions 代码

在 `functions/index.js` 中编写边缘函数代码：

```js
// functions/index.js
import { handler } from './handler.js'

export default {
  async fetch(request) {
    return handler(request)
  }
}
```

```js
// functions/handler.js
export function handler(request) {
  return new Response('Hello from EdgeOne Pages!', {
    headers: { 'content-type': 'text/plain' }
  })
}
```

#### 3. 构建单文件 Bundle

运行构建命令：

```bash
npm run build:edgeone
```

这会：
1. 执行 `build:edge`：使用 esbuild 打包 `functions/index.js` → `functions-dist/index.js`
2. 执行 `create-worker.js`：创建 `_worker.js` 文件

**构建后的 `functions-dist/index.js`：**
- ✅ 所有代码都在一个文件中
- ✅ 没有 `import './handler.js'` 这样的相对路径
- ✅ 格式为 ES 模块（`export` 语句）

#### 4. 验证构建结果

打开 `functions-dist/index.js`，确认：
- ✅ 没有相对路径 import
- ✅ 所有代码都在一个文件中
- ✅ 格式为 ES 模块

#### 5. 配置 EdgeOne Pages 自动构建

由于项目通过 GitHub 仓库自动部署，需要在 EdgeOne Pages 控制台配置构建命令：

**步骤：**

1. 登录 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)
2. 进入你的项目设置
3. 找到「构建设置」或「Build Settings」
4. 配置以下内容：

   **构建命令：**
   ```bash
   npm install && npm run build:edgeone
   ```
   
   **说明：** `build:edgeone` 脚本会自动设置 `EDGEONE=true` 环境变量，启用 Next.js 静态导出，生成 `out` 目录，并打包 Functions。
   
   **或者分步执行：**
   ```bash
   npm install
   EDGEONE=true npm run build
   npm run build:edge
   node scripts/create-worker.js
   ```

   **输出目录：**
   ```
   out
   ```
   （Next.js 静态导出目录）

   **Node.js 版本：**
   ```
   18.x 或 20.x
   ```

5. 保存设置

**构建流程说明：**

EdgeOne Pages 会自动：
1. 从 GitHub 拉取最新代码
2. 执行 `npm install` 安装依赖
3. 执行 `npm run build` 构建 Next.js 应用
4. 执行 `npm run build:edgeone` 打包 Functions 并创建 `_worker.js`
5. 部署 `out` 目录和 `_worker.js` 文件

**注意：**
- `functions-dist/` 和 `_worker.js` 在 `.gitignore` 中，不会被提交到 GitHub
- 这些文件会在 EdgeOne Pages 的构建过程中自动生成
- 确保 `functions/index.js` 文件已提交到 GitHub 仓库

## 构建脚本说明

### package.json 中的脚本

```json
{
  "scripts": {
    "build:edge": "mkdir -p functions-dist && esbuild functions/index.js --bundle --format=esm --outfile=functions-dist/index.js --platform=neutral --external:node:*",
    "build:edgeone": "npm run build:edge && node scripts/create-worker.js"
  }
}
```

**参数说明：**
- `--bundle`: 将所有依赖打包成单文件
- `--format=esm`: 输出 ES 模块格式
- `--platform=neutral`: 不注入 Node.js polyfill，体积最小
- `--external:node:*`: 排除 Node.js 内置模块（边缘环境不支持）

## 常见问题

### Q1: 为什么 zip 上传了 handler.js 还是找不到？

**A:** Edge-Runtime 没有文件系统，任何磁盘路径都会解析失败。必须使用单文件 bundle。

### Q2: 可以用 webpack/rollup 吗？

**A:** 可以，只要最终输出是单文件 ESM，不再出现相对路径 import 即可。

### Q3: 需要上传 node_modules 吗？

**A:** 不需要，esbuild 已把依赖全部 inline。如果使用了 `--external` 的模块，确保平台 Runtime 自带。

### Q4: 本地测试正常，为什么 EdgeOne 报错？

**A:** 
- 本地有真实磁盘，Node 能解析相对路径
- Vercel 默认走 Node Runtime，整包文件系统都在
- EdgeOne Pages 的边缘函数属于 Edge-Runtime，没有文件系统，所以必须打包成单文件

### Q5: 如何验证构建是否正确？

**A:** 打开 `functions-dist/index.js`，搜索 `import './handler.js'`，如果找不到，说明打包成功。

## 文件结构

```
nextjs-course-selector/
├── functions/              # 源代码目录
│   ├── index.js           # 入口文件
│   └── handler.js         # 处理函数（可选）
├── functions-dist/        # 构建产物目录（.gitignore）
│   └── index.js           # 打包后的单文件
├── _worker.js             # EdgeOne Pages Worker（.gitignore）
├── scripts/
│   └── create-worker.js   # 自动创建 _worker.js 的脚本
└── package.json
```

## 参考

- [EdgeOne Pages Functions 文档](https://cloud.tencent.com/document/product/1552/81928)
- [esbuild 文档](https://esbuild.github.io/)

