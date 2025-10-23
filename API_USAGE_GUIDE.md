# API 使用指南

## 🎯 快速开始

本程序的API完全兼容 [Memos](https://github.com/usememos/memos) 的API格式，可以与支持Memos的第三方软件无缝对接。

## 📝 API 路径

### 标准路径（与memos兼容）
```
POST /api.php?action=/api/v1/memos
GET  /api.php?action=/api/v1/memos
```

## 🔑 获取 API Token

1. 登录系统
2. 进入 **设置** → **API 管理** → **API Tokens 管理**
3. 点击 **创建新 Token**
4. 填写 Token 信息：
   - **名称**: 为Token起个名字（例如：iOS客户端）
   - **描述**: 说明用途（可选）
   - **过期时间**: 选择7天/30天/90天/1年/永不过期
5. 点击 **创建** 后立即复制Token（只显示一次）

## 📱 兼容的客户端

理论上所有支持 Memos API 的客户端都可以使用，包括但不限于：

- **iOS**: Moe Memos、Memos Widget
- **Android**: Memos、MoeMemosAndroid
- **macOS/Windows**: 各类桌面客户端
- **浏览器扩展**: Memos Browser Extension
- **命令行工具**: memos-cli

## ⚙️ 配置示例

### Moe Memos (iOS)

1. 打开 Moe Memos
2. 进入 **设置** → **服务器设置**
3. 配置以下信息：
   - **服务器地址**: `https://your-domain.com`
   - **API 路径**: `/api.php?action=/api/v1/memos`
   - **Token**: 粘贴您的API Token

### Memos (Android)

1. 打开 Memos
2. 进入 **设置** → **服务器**
3. 输入：
   - **Host**: `https://your-domain.com/api.php?action=/api/v1/memos`
   - **Access Token**: 您的API Token

### 浏览器扩展

在扩展设置中配置：
```
Server URL: https://your-domain.com/api.php?action=/api/v1/memos
Access Token: your_token_here
```

## 🧪 测试 API

### 使用 cURL 测试

```bash
# 创建一条笔记
curl -X POST https://your-domain.com/api.php?action=/api/v1/memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "content": "测试笔记",
    "visibility": "VISIBILITY_UNSPECIFIED",
    "tags": ["test"]
  }'

# 获取笔记列表
curl -X GET https://your-domain.com/api.php?action=/api/v1/memos \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 使用 Postman 测试

1. 新建请求
2. 方法：`POST`
3. URL：`https://your-domain.com/api.php?action=/api/v1/memos`
4. Headers：
   - `Content-Type`: `application/json`
   - `Authorization`: `Bearer YOUR_TOKEN_HERE`
5. Body (raw, JSON)：
   ```json
   {
     "content": "测试笔记",
     "visibility": "VISIBILITY_UNSPECIFIED",
     "tags": ["test"]
   }
   ```

## 📊 响应格式

### 成功响应
```json
{
  "code": 0,
  "message": "OK",
  "memo": {
    "id": 123,
    "row_status": "NORMAL",
    "creator_id": 1,
    "content": "测试笔记",
    "visibility": "VISIBILITY_UNSPECIFIED",
    "resource_ids": [],
    "tags": ["test"],
    "create_time": "2025-10-21T12:00:00Z",
    "update_time": "2025-10-21T12:00:00Z"
  }
}
```

### 错误响应
```json
{
  "code": 16,
  "message": "无效的认证令牌"
}
```

## 🔧 常见问题

### Q: 为什么第三方客户端连接失败？

**A**: 检查以下几点：
1. 确认服务器地址正确（包含 `/api.php?action=/api/v1/memos`）
2. 确认Token没有过期
3. 如果使用HTTPS，确保SSL证书有效
4. 检查服务器防火墙设置

### Q: Token 过期了怎么办？

**A**: 在Web界面重新创建一个新Token，然后在客户端更新。

### Q: 可以用多个客户端吗？

**A**: 可以。建议为每个客户端创建独立的Token，方便管理。

### Q: 如何撤销某个客户端的访问权限？

**A**: 在Web界面的Token列表中删除对应的Token即可。

### Q: API支持上传图片吗？

**A**: 当前版本暂不支持图片上传API，请在Web界面操作。

## 🔒 安全建议

1. **使用HTTPS**: 生产环境务必启用HTTPS
2. **Token保密**: 不要在公开场合分享Token
3. **定期更换**: 建议定期更换Token
4. **独立Token**: 为不同设备/应用创建独立Token
5. **监控使用**: 定期检查Token的最后使用时间

## 📈 限制说明

- **内容大小**: 单个笔记最大10MB
- **请求频率**: 无硬性限制，请合理使用
- **并发连接**: 无限制
- **列表分页**: 每页最多100条

## 🌐 完整API文档

详细的API文档请参阅 [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

## 💡 提示

- 创建Token时请立即复制保存，关闭窗口后将无法再次查看
- 建议为Token设置合理的过期时间
- 定期检查Token列表，删除不用的Token
- 如有任何问题，请查看服务器日志

---

**版本**: 1.0.0  
**最后更新**: 2025-10-21  
**兼容性**: 与 Memos API v1 兼容

