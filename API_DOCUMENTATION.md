# API 文档

## 概述

本程序提供类似 Memos 的 RESTful API，支持通过 HTTP 请求创建和管理笔记。

## 认证

API 使用 Bearer Token 认证方式。

### 获取 API Token

1. 登录系统
2. 进入 `设置` -> `API 管理` -> `API Tokens 管理`
3. 点击 `创建新 Token`
4. 填写 Token 名称、描述和过期时间
5. 复制生成的 Token（只显示一次）

### 认证方式

在请求头中添加：
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

## API 端点

### 1. 创建 Memo

**端点**: `POST /api.php?action=/api/v1/memos`

**请求头**:
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**请求体**:
```json
{
  "content": "# 我的文章标题\n\n这是 Markdown 格式的完整文章正文。",
  "visibility": "VISIBILITY_UNSPECIFIED",
  "tags": ["api", "tutorial"]
}
```

**参数说明**:
- `content` (必填): Memo 内容，支持 Markdown 格式
- `visibility` (可选): 可见性，可选值：
  - `VISIBILITY_UNSPECIFIED`: 默认（私有）
  - `PUBLIC`: 公开
  - `PRIVATE`: 私有
- `tags` (可选): 标签数组

**成功响应** (200 OK):
```json
{
  "code": 0,
  "message": "OK",
  "memo": {
    "id": 123,
    "row_status": "NORMAL",
    "creator_id": 1,
    "content": "# 我的文章标题\n\n这是 Markdown 格式的完整文章正文。",
    "visibility": "VISIBILITY_UNSPECIFIED",
    "resource_ids": [],
    "tags": ["api", "tutorial"],
    "create_time": "2025-10-21T12:00:00Z",
    "update_time": "2025-10-21T12:00:00Z"
  }
}
```

**错误响应**:
```json
{
  "code": 3,
  "message": "无效参数：content 不能为空"
}
```

### 2. 获取 Memos 列表

**端点**: `GET /api.php?action=/api/v1/memos`

**请求头**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20，最大 100

**成功响应** (200 OK):
```json
{
  "code": 0,
  "message": "OK",
  "memos": [
    {
      "id": 123,
      "row_status": "NORMAL",
      "creator_id": 1,
      "content": "# 笔记内容",
      "visibility": "VISIBILITY_UNSPECIFIED",
      "resource_ids": [],
      "tags": ["tag1", "tag2"],
      "create_time": "2025-10-21T12:00:00Z",
      "update_time": "2025-10-21T12:00:00Z"
    }
  ]
}
```

## 错误代码

| 代码 | 说明 |
|------|------|
| 0 | 成功 |
| 3 | 无效参数 |
| 12 | 不支持的请求方法 |
| 13 | 内部错误 |
| 16 | 认证失败 |

## 使用示例

### cURL 示例

```bash
curl -X POST http://your-domain.com/api.php?action=/api/v1/memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "content": "# 我的笔记\n\n这是通过 API 创建的笔记内容",
    "visibility": "VISIBILITY_UNSPECIFIED",
    "tags": ["api", "test"]
  }'
```

### JavaScript 示例

```javascript
const token = 'YOUR_ACCESS_TOKEN_HERE';
const apiUrl = 'http://your-domain.com/api.php?action=/api/v1/memos';

async function createMemo() {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      content: '# 我的笔记\n\n这是通过 API 创建的笔记',
      visibility: 'VISIBILITY_UNSPECIFIED',
      tags: ['api', 'javascript']
    })
  });
  
  const result = await response.json();
  console.log(result);
}

createMemo();
```

### Python 示例

```python
import requests
import json

token = 'YOUR_ACCESS_TOKEN_HERE'
api_url = 'http://your-domain.com/api.php?action=/api/v1/memos'

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}'
}

data = {
    'content': '# 我的笔记\n\n这是通过 API 创建的笔记',
    'visibility': 'VISIBILITY_UNSPECIFIED',
    'tags': ['api', 'python']
}

response = requests.post(api_url, headers=headers, data=json.dumps(data))
result = response.json()
print(result)
```

## 安全建议

1. **保护 Token**: 不要在公开代码中硬编码 Token
2. **使用 HTTPS**: 生产环境务必使用 HTTPS
3. **定期更换**: 定期更换 API Token
4. **最小权限**: 为不同应用创建不同的 Token
5. **监控使用**: 定期检查 Token 的最后使用时间

## Token 管理

### 查看 Token

在 `设置` -> `API 管理` -> `API Tokens 管理` 中可以查看：
- Token 名称和描述
- 创建时间
- 过期时间
- 最后使用时间
- 状态（活跃/已过期/已禁用）

### 删除 Token

在 Token 列表中点击 `删除` 按钮即可删除 Token。删除后该 Token 立即失效。

## 限制

- 单次请求内容大小：10MB
- 每页最多返回：100 条记录
- Token 过期后需要重新创建

## 常见问题

### Q: Token 在哪里查看？
A: Token 只在创建时显示一次，请立即复制保存。如果丢失，需要创建新的 Token。

### Q: 如何测试 API？
A: 可以使用 cURL、Postman 或浏览器开发者工具测试 API。

### Q: 支持更新和删除 Memo 吗？
A: 当前版本暂不支持，可在 Web 界面中操作。

### Q: 可以上传图片吗？
A: 当前版本 API 暂不支持文件上传，可在 Web 界面中操作。

---

**版本**: 1.0.0  
**最后更新**: 2025-10-21

