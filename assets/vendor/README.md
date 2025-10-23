# Vendor 依赖说明

本目录包含所有前端第三方库的本地副本，避免依赖外部CDN。

## 📦 包含的库

### Vditor (v3.10.4)
- **功能**: Markdown所见即所得编辑器
- **文件**: 
  - `vditor/index.css` - 样式文件
  - `vditor/index.min.js` - JavaScript核心库
- **官网**: https://b3log.org/vditor/
- **许可**: MIT

### Marked.js (v11.0.0)
- **功能**: Markdown解析器
- **文件**: `marked/marked.min.js`
- **官网**: https://marked.js.org/
- **许可**: MIT

### Prism.js (v1.29.0)
- **功能**: 代码语法高亮
- **文件**:
  - `prism/themes/prism.min.css` - 主题样式
  - `prism/components/prism-core.min.js` - 核心库
  - `prism/plugins/autoloader/prism-autoloader.min.js` - 自动加载插件
- **官网**: https://prismjs.com/
- **许可**: MIT

## 🔄 更新依赖

如需更新这些库到新版本，可以：

### 方法1: 使用下载脚本（Windows）
运行项目根目录的 `download_vendors.bat`

### 方法2: 手动下载
1. **Vditor**
   - CSS: https://cdn.jsdelivr.net/npm/vditor@3.10.4/dist/index.css
   - JS: https://cdn.jsdelivr.net/npm/vditor@3.10.4/dist/index.min.js

2. **Marked.js**
   - JS: https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js

3. **Prism.js**
   - CSS: https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css
   - Core: https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js
   - Autoloader: https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js

### 方法3: 使用PowerShell（Windows）
```powershell
# Vditor
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/vditor@3.10.4/dist/index.css" -OutFile "vditor/index.css"
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/vditor@3.10.4/dist/index.min.js" -OutFile "vditor/index.min.js"

# Marked.js
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js" -OutFile "marked/marked.min.js"

# Prism.js
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" -OutFile "prism/themes/prism.min.css"
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js" -OutFile "prism/components/prism-core.min.js"
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js" -OutFile "prism/plugins/autoloader/prism-autoloader.min.js"
```

### 方法4: 使用curl（Linux/Mac）
```bash
# Vditor
curl -L "https://cdn.jsdelivr.net/npm/vditor@3.10.4/dist/index.css" -o "vditor/index.css"
curl -L "https://cdn.jsdelivr.net/npm/vditor@3.10.4/dist/index.min.js" -o "vditor/index.min.js"

# Marked.js
curl -L "https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js" -o "marked/marked.min.js"

# Prism.js
curl -L "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" -o "prism/themes/prism.min.css"
curl -L "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js" -o "prism/components/prism-core.min.js"
curl -L "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js" -o "prism/plugins/autoloader/prism-autoloader.min.js"
```

## 📝 版本说明

更新版本号时，需要同时更新：
1. 本README中的版本号
2. `download_vendors.bat` 中的下载链接
3. 实际下载的文件

## ⚠️ 注意事项

- 不要删除此目录，否则编辑器和代码高亮将无法工作
- 更新版本前建议先备份当前文件
- 某些新版本可能不兼容，测试后再部署到生产环境

