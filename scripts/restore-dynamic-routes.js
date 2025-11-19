const fs = require('fs');
const path = require('path');

// 恢复动态路由文件夹名称
const dynamicRoutes = [
  'app/api/course-selection/status/_threadId',
  'app/api/course-selection/smart/stop/_threadId',
];

console.log('🔄 恢复动态路由名称...');

dynamicRoutes.forEach(route => {
  const oldPath = path.join(__dirname, '..', route);
  const newPath = oldPath.replace('_threadId', '[threadId]');
  
  if (fs.existsSync(oldPath)) {
    try {
      // 如果目标路径已存在，先删除
      if (fs.existsSync(newPath)) {
        fs.rmSync(newPath, { recursive: true, force: true });
      }
      
      fs.renameSync(oldPath, newPath);
      console.log(`✅ 恢复: ${path.basename(oldPath)} -> ${path.basename(newPath)}`);
    } catch (error) {
      console.error(`❌ 恢复失败 ${route}:`, error.message);
    }
  }
});

console.log('✅ 恢复完成！');

