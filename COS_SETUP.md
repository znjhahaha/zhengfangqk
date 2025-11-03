# 腾讯云 COS 存储配置指南

## 📋 概述

本应用支持使用腾讯云对象存储（COS）来持久化保存管理员数据（学校列表、公告、建议等）。这对于 EdgeOne Pages 等文件系统只读的平台特别有用。

## 🚀 配置步骤

### 1. 获取腾讯云 COS 配置信息

1. **登录腾讯云控制台**
   - 访问：https://console.cloud.tencent.com/

2. **创建 COS 存储桶**
   - 进入「对象存储」> 「存储桶列表」
   - 点击「创建存储桶」
   - 选择地域（如：北京 ap-beijing、广州 ap-guangzhou）
   - 设置存储桶名称（如：`qiangke-data`）
   - 访问权限建议选择「私有读写」（数据安全）
   - 点击「确定」创建

3. **获取密钥信息**
   - 进入「访问管理」> 「API密钥管理」
   - 点击「新建密钥」或使用现有密钥
   - 记录 `SecretId` 和 `SecretKey`（⚠️ 请妥善保管，不要泄露）

### 2. 在 EdgeOne Pages 配置环境变量

在 EdgeOne Pages 项目设置中，添加以下环境变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `COS_SECRET_ID` | 腾讯云 SecretId | `AKIDxxxxxxxxxxxxx` |
| `COS_SECRET_KEY` | 腾讯云 SecretKey | `xxxxxxxxxxxxxxxxx` |
| `COS_REGION` | COS 存储桶地域 | `ap-beijing` 或 `ap-guangzhou` |
| `COS_BUCKET` | COS 存储桶名称 | `qiangke-data` |

**常见地域代码：**
- `ap-beijing` - 北京
- `ap-shanghai` - 上海
- `ap-guangzhou` - 广州
- `ap-chengdu` - 成都
- `ap-chongqing` - 重庆
- `ap-nanjing` - 南京
- `ap-singapore` - 新加坡

### 3. 配置存储桶权限（可选但推荐）

为了确保应用能正常访问 COS，建议配置存储桶权限：

1. **CORS 配置**（如果需要跨域访问）
   - 进入存储桶 > 「安全管理」> 「跨域访问CORS设置」
   - 添加规则，允许你的域名访问

2. **权限配置**
   - 确保使用的 SecretId/SecretKey 具有该存储桶的读写权限
   - 可在「存储桶配置」> 「权限管理」中设置

### 4. 重新部署应用

配置完环境变量后：
1. 保存环境变量设置
2. 重新部署应用（环境变量变更会在下次部署时生效）
3. 检查服务器日志，确认 COS 连接成功

## ✅ 验证配置

部署完成后，检查服务器日志：

```
✅ 使用 COS 存储
✅ 数据已保存到 COS: qiangke-data/announcements.json
✅ 从 COS 加载数据: qiangke-data/schools.json
```

如果看到这些日志，说明 COS 配置成功！

## 🔍 故障排除

### 问题1：数据仍然保存在本地文件系统

**可能原因：**
- 环境变量未正确设置
- 环境变量名称拼写错误
- 未重新部署应用

**解决方法：**
1. 检查环境变量是否正确设置
2. 确认变量名大小写正确
3. 重新部署应用

### 问题2：COS 连接失败

**可能原因：**
- SecretId 或 SecretKey 错误
- 存储桶名称或地域代码错误
- 网络连接问题

**解决方法：**
1. 检查 SecretId 和 SecretKey 是否正确
2. 确认存储桶名称和地域代码匹配
3. 查看服务器日志中的具体错误信息

### 问题3：权限不足

**错误信息：** `Access Denied` 或 `403 Forbidden`

**解决方法：**
1. 检查 SecretId/SecretKey 是否有存储桶的读写权限
2. 在腾讯云控制台确认密钥权限

## 📝 数据存储位置

启用 COS 后，所有数据将存储在 COS 存储桶的 `qiangke-data/` 目录下：

- `qiangke-data/announcements.json` - 公告列表
- `qiangke-data/suggestions.json` - 用户建议
- `qiangke-data/schools.json` - 学校列表
- `qiangke-data/url-configs.json` - URL配置
- `qiangke-data/announcement-confirmations.json` - 公告确认记录

## 🔄 回退机制

系统会自动处理存储方式：

1. **优先使用 COS**：如果环境变量已配置，优先使用 COS 存储
2. **自动回退**：如果 COS 不可用，自动回退到文件系统
3. **无缝切换**：数据可以在 COS 和文件系统之间无缝切换

## 💡 注意事项

1. **数据安全**：SecretKey 是敏感信息，请妥善保管，不要提交到代码仓库
2. **存储费用**：COS 存储和流量会产生费用，但通常非常低（每月几元）
3. **数据备份**：建议定期在腾讯云控制台备份重要数据
4. **地域选择**：选择距离用户较近的地域可以提高访问速度

## 📞 需要帮助？

如果遇到问题，请：
1. 查看服务器日志中的详细错误信息
2. 检查腾讯云控制台中的 COS 存储桶状态
3. 确认环境变量配置是否正确

