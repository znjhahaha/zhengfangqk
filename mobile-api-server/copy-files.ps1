# 复制手机API服务器所需文件

$sourceDir = "nextjs-course-selector"
$destDir = "mobile-api-server"

# 复制 lib 目录
Write-Host "复制 lib 目录..."
if (Test-Path "$sourceDir\lib") {
    Copy-Item -Path "$sourceDir\lib\*" -Destination "$destDir\lib\" -Recurse -Force
    Write-Host "✅ lib 目录已复制"
} else {
    Write-Host "⚠️ 源目录不存在: $sourceDir\lib"
}

# 复制 API 路由
Write-Host "复制 API 路由..."
if (Test-Path "$sourceDir\app\api") {
    Copy-Item -Path "$sourceDir\app\api\*" -Destination "$destDir\app\api\" -Recurse -Force
    Write-Host "✅ API 路由已复制"
} else {
    Write-Host "⚠️ 源目录不存在: $sourceDir\app\api"
}

# 复制 data 目录（如果存在）
Write-Host "复制 data 目录..."
if (Test-Path "$sourceDir\data") {
    Copy-Item -Path "$sourceDir\data\*" -Destination "$destDir\data\" -Recurse -Force
    Write-Host "✅ data 目录已复制"
} else {
    Write-Host "⚠️ data 目录不存在，将在首次运行时创建"
}

Write-Host "`n✅ 文件复制完成！"

