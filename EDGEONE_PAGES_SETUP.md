# EdgeOne Pages 部署配置指南

## 问题说明

EdgeOne Pages 的边缘函数运行在 V8 Isolate 沙箱环境中，不支持多文件 ESM 动态解析。如果入口文件中有 `import './handler.js'` 这样的相对路径导入，会报错：

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/user/handler.js' imported from /var/user/index.mjs
```

## 解决方案

使用 `esbuild` 将所有文件打包成单文件 bundle，消除所有相对路径 import。

## 步骤

### 1. 安装依赖

```bash
npm install
```

（esbuild 已在 devDependencies 中）

### 2. 创建 Functions 入口文件

如果还没有 `functions` 目录，创建它并添加入口文件：

```bash
mkdir -p functions
```

在 `functions/index.js` 中编写你的边缘函数代码。

### 3. 构建单文件 Bundle

```bash
npm run build:edge
```

这会：
- 读取 `functions/index.js`
- 将所有依赖（包括 `handler.js` 等）打包成单文件
- 输出到 `functions-dist/index.js`

### 4. 配置 EdgeOne Pages

有两种方式：

#### 方式 A：使用 `_worker.js`（推荐）

在项目根目录创建 `_worker.js`：

```js
// _worker.js
export * from './functions-dist/index.js'
```

#### 方式 B：在控制台配置

1. 进入 EdgeOne Pages 控制台
2. 项目设置 → Functions 目录
3. 填写 `functions-dist`
4. 重新部署

### 5. 部署

提交代码并推送到 Git 仓库，EdgeOne Pages 会自动构建和部署。

## 构建脚本说明

`package.json` 中的 `build:edge` 脚本：

```json
"build:edge": "esbuild functions/index.js --bundle --format=esm --outfile=functions-dist/index.js --platform=neutral --external:node:*"
```

参数说明：
- `--bundle`: 将所有依赖打包成单文件
- `--format=esm`: 输出 ES 模块格式
- `--platform=neutral`: 不注入 Node.js polyfill，体积最小
- `--external:node:*`: 排除 Node.js 内置模块（边缘环境不支持）

## 常见问题

### Q1: 为什么 zip 上传了 handler.js 还是找不到？

A: Edge-Runtime 没有文件系统，任何磁盘路径都会解析失败。必须使用单文件 bundle。

### Q2: 可以用 webpack/rollup 吗？

A: 可以，只要最终输出是单文件 ESM，不再出现相对路径 import 即可。

### Q3: 需要上传 node_modules 吗？

A: 不需要，esbuild 已把依赖全部 inline。如果使用了 `--external` 的模块，确保平台 Runtime 自带。

## 验证

构建完成后，打开 `functions-dist/index.js`，确认：
- ✅ 没有 `import './handler.js'` 这样的相对路径
- ✅ 所有代码都在一个文件中
- ✅ 格式为 ES 模块（`export` 语句）

## 参考

- [EdgeOne Pages Functions 文档](https://cloud.tencent.com/document/product/1552/81928)
- [esbuild 文档](https://esbuild.github.io/)

