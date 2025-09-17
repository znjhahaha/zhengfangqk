// 测试课表功能的简单脚本
const fetch = require('node-fetch');

async function testSchedule() {
  try {
    console.log('🧪 测试课表API...');
    
    const response = await fetch('http://127.0.0.1:3000/api/schedule');
    const result = await response.json();
    
    console.log('📊 响应状态:', response.status);
    console.log('📊 响应数据:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ 课表功能测试成功！');
      console.log(`📅 获取到 ${result.data.length} 门课程`);
    } else {
      console.log('❌ 课表功能测试失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

// 等待服务器启动
setTimeout(testSchedule, 3000);
