const fs = require('fs');
const path = require('path');

// 动态路由文件夹列表（需要临时重命名以避免静态导出错误）
const dynamicRoutes = [
  'app/api/course-selection/status/[threadId]',
  'app/api/course-selection/smart/stop/[threadId]',
];

console.log('🔧 准备静态导出：处理动态路由...');

dynamicRoutes.forEach(route => {
  const oldPath = path.join(__dirname, '..', route);
  const newPath = oldPath.replace('[', '_').replace(']', '');
  
  if (fs.existsSync(oldPath)) {
    try {
      // 如果新路径已存在，先删除
      if (fs.existsSync(newPath)) {
        fs.rmSync(newPath, { recursive: true, force: true });
      }
      
      fs.renameSync(oldPath, newPath);
      console.log(`✅ 重命名: ${path.basename(oldPath)} -> ${path.basename(newPath)}`);
    } catch (error) {
      console.error(`❌ 重命名失败 ${route}:`, error.message);
    }
  } else {
    console.log(`⚠️  路径不存在: ${route}`);
  }
});

console.log('✅ 动态路由处理完成！');

