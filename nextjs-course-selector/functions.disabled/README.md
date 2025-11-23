# EdgeOne Pages Functions

此目录用于存放 EdgeOne Pages 的边缘函数代码。

## 目录结构

```
functions/
  ├── index.js      # 入口文件
  └── handler.js    # 处理函数（可选，会被打包进 index.js）
```

## 使用说明

1. 在 `functions/index.js` 中编写你的边缘函数代码
2. 如果代码需要拆分，可以创建 `handler.js` 等文件
3. 运行 `npm run build:edge` 将所有文件打包成单文件
4. 打包产物在 `functions-dist/index.js`

## 示例

### functions/index.js

```js
import { handler } from './handler.js'

export default {
  async fetch(request) {
    return handler(request)
  }
}
```

### functions/handler.js

```js
export function handler(request) {
  return new Response('Hello from EdgeOne Pages!', {
    headers: { 'content-type': 'text/plain' }
  })
}
```

构建后，`functions-dist/index.js` 将包含所有代码，不再有 `import './handler.js'`。

