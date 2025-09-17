// 简单的测试脚本
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'healthy',
    message: 'TYUST选课工具API服务正常运行',
    timestamp: new Date().toISOString()
  }));
});

server.listen(3001, () => {
  console.log('✅ 测试服务器运行在 http://localhost:3001');
  console.log('🌐 测试地址: http://localhost:3001');
});
