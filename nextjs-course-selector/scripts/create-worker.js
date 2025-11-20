#!/usr/bin/env node

/**
 * 创建 _worker.js 文件，用于 EdgeOne Pages 部署
 * 该文件会导出 functions-dist/index.js 的内容
 */

const fs = require('fs')
const path = require('path')

const functionsDistPath = path.join(process.cwd(), 'functions-dist', 'index.js')
const workerPath = path.join(process.cwd(), '_worker.js')

// 检查 functions-dist/index.js 是否存在
if (!fs.existsSync(functionsDistPath)) {
  console.log('⚠️  警告: functions-dist/index.js 不存在')
  console.log('   跳过 _worker.js 创建（可能 functions/index.js 不存在）')
  process.exit(0) // 退出码 0 表示成功，只是跳过创建
}

// 创建 _worker.js 文件
const workerContent = `// EdgeOne Pages Worker
// 此文件由 scripts/create-worker.js 自动生成
// 请勿手动编辑，运行 npm run build:edgeone 会自动更新

export * from './functions-dist/index.js'
`

fs.writeFileSync(workerPath, workerContent, 'utf-8')
console.log('✅ _worker.js 已创建')
console.log(`   路径: ${workerPath}`)
console.log('   现在可以部署到 EdgeOne Pages 了')

