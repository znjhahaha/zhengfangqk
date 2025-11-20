#!/bin/bash

echo "===================================="
echo "  Capacitor Android APK 构建脚本"
echo "===================================="
echo ""

echo "[1/5] 检查依赖..."
if ! npm list @capacitor/cli > /dev/null 2>&1; then
    echo "错误: 未安装 Capacitor，正在安装..."
    npm install @capacitor/core @capacitor/cli @capacitor/android --save-dev
fi

echo "[2/5] 构建 Next.js 应用（启用静态导出）..."
BUILD_APK=true npm run build
if [ $? -ne 0 ]; then
    echo "错误: 构建失败！"
    exit 1
fi

echo "[3/5] 检查 Capacitor 配置..."
if [ ! -f "capacitor.config.json" ]; then
    echo "初始化 Capacitor..."
    npx cap init "正方教务工具" "com.tyust.course.selector" --web-dir=out
fi

echo "[4/5] 添加 Android 平台..."
if [ ! -d "android" ]; then
    npx cap add android
fi

echo "[5/5] 同步文件到 Android 项目..."
npx cap sync android

echo ""
echo "===================================="
echo "  构建完成！"
echo "===================================="
echo ""
echo "下一步："
echo "1. 运行: npm run cap:open"
echo "2. 在 Android Studio 中点击 Build > Build APK(s)"
echo ""

