# LightMemos - 轻量级笔记管理系统

一个基于 PHP + SQLite 的开源笔记管理系统，无需数据库配置，开箱即用。

## ✨ 功能特性

### 📝 核心功能
- **Markdown 编辑器** - 基于 Vditor，支持即时渲染、所见即所得和分屏预览
- **待办事项** - 支持 Markdown 待办事项，可点击复选框直接切换状态
- **标签系统** - 灵活的标签管理，支持标签筛选和统计
- **笔记置顶** - 重要笔记置顶显示
- **日历视图** - 按日期浏览笔记，可视化笔记分布

### 📎 附件与分享
- **附件管理** - 支持图片、文档、压缩包等多种文件类型
- **加密分享** - 支持提取码保护，可设置过期时间和访问限制
- **分享管理** - 查看、编辑、删除已创建的分享

### 🔍 搜索与统计
- **全文搜索** - 快速查找笔记内容
- **内容筛选** - 按类型筛选笔记（置顶、链接、待办、代码）
- **统计分析** - 使用天数、记录统计、写作热图、热门标签

### 🎨 界面与体验
- **响应式设计** - 完美适配桌面端和移动端
- **明暗主题** - 支持亮色和暗色主题切换
- **无限滚动** - 自动加载更多笔记

### 🔌 API 与安全
- **Memos 兼容** - 完全兼容 Memos API，支持第三方客户端
- **数据备份** - 支持手动备份和恢复数据库
- **安全特性** - SQL 注入防护、XSS 防护、文件上传安全

## 📋 系统要求

- PHP 7.4 或更高版本
- PDO SQLite 扩展
- 可写的文件系统权限
- 现代浏览器（Chrome, Firefox, Safari, Edge）

> 📦 **依赖本地化**: 所有前端依赖（Vditor、Marked.js、Prism.js等）已完全本地化，包含103个文件（~11.4MB），无需外部CDN，可完全离线使用。

## ⚠️ Apache 500 错误快速修复

如果在 Apache 服务器上遇到 **500 Internal Server Error**：

1. **快速方案**：替换 `.htaccess` 文件
   ```bash
   # 使用最小化配置
   cp .htaccess.minimal .htaccess
   ```

2. **完整方案**：查看 [部署指南](DEPLOY.md) 中的故障排查部分

3. **常见原因**：
   - PHP运行在CGI模式下不支持某些指令
   - Apache版本不兼容某些配置
   - 服务器禁用了某些选项

## 🚀 快速开始

### 方法 1: 使用内置服务器（推荐用于开发）

1. **启动服务器**
   ```bash
   # Windows
   双击 run.bat
   
   # Mac/Linux
   php -S localhost:8080
   ```

2. **访问安装页面**
   ```
   http://localhost:8080/install.php
   ```

3. **完成安装**
   - 点击"开始安装"按钮
   - 等待安装完成
   - 点击"进入 Memos"按钮

4. **开始使用**
   ```
   http://localhost:8080/
   ```

### 方法 2: 使用 Web 服务器

1. 将所有文件上传到 Web 服务器目录
2. 访问 `http://your-domain.com/install.php` 进行安装
3. 安装完成后访问 `http://your-domain.com/` 开始使用

## 📖 使用指南

### 基本操作
- **创建笔记** - 在顶部编辑器中输入内容，支持完整 Markdown 语法
- **添加标签** - 支持空格或回车分隔多个标签
- **待办事项** - 使用 `- [ ]` 创建待办，`- [x]` 标记完成
- **附件上传** - 点击工具栏图标或拖拽上传文件

### 笔记管理
- **置顶笔记** - 重要笔记可置顶显示
- **编辑删除** - 支持原地编辑和删除操作
- **分享功能** - 创建分享链接，支持加密和过期设置

### 搜索筛选
- **全文搜索** - 快速查找笔记内容
- **标签筛选** - 点击左侧标签快速筛选
- **内容筛选** - 按类型筛选（置顶、链接、待办、代码）
- **日期筛选** - 使用日历选择特定日期

### 统计分析
- **使用统计** - 查看使用天数、记录统计、写作热图
- **热门标签** - 显示使用最多的标签
- **附件管理** - 按类型筛选和管理上传文件

### API 使用

#### 获取 API Token
1. 登录系统后进入 **设置** → **API 管理**
2. 点击 **创建新 Token**，填写信息并设置过期时间
3. 创建后立即复制保存（只显示一次）

#### 支持的客户端
- **iOS**: Moe Memos、Memos Widget
- **Android**: Memos、MoeMemosAndroid  
- **桌面端**: 各类桌面客户端
- **浏览器扩展**: Memos Browser Extension

#### 配置示例
**服务器地址**: `https://your-domain.com/api.php?action=/api/v1/memos`  
**认证方式**: `Authorization: Bearer YOUR_TOKEN_HERE`

## 📁 目录结构

```
LightMemos/
├── index.php              # 主入口文件
├── install.php            # 安装程序
├── login.php              # 登录页面
├── share.php              # 分享页面
├── api.php                # API 接口
├── config.php             # 配置文件（安装后生成）
├── run.bat                # Windows 启动脚本
├── includes/
│   └── functions.php      # 函数库
├── assets/
│   ├── css/
│   │   └── style.css      # 样式文件
│   ├── js/
│   │   └── app.js         # JavaScript 文件
│   └── vendor/            # 第三方库本地副本
│       ├── vditor/        # Vditor编辑器
│       ├── marked/        # Markdown解析器
│       └── prism/         # 代码高亮
├── data/                  # 数据库目录（自动生成）
│   ├── index.html         # 防止目录浏览
│   └── memos_*.db         # SQLite 数据库
├── backups/               # 备份目录（自动生成）
│   └── backup_*.db        # 数据库备份文件
└── uploads/               # 上传文件目录（自动生成）
    ├── index.html         # 防止目录浏览
    └── *.*                # 上传的文件
```

## 🔒 安全特性

- **数据库保护** - 数据库文件使用随机命名，并通过 index.html 防止直接访问
- **文件上传安全** - 危险文件类型自动添加安全后缀（.1）
- **文件大小限制** - 默认 10MB，可配置
- **SQL 注入防护** - 使用 PDO 预处理语句
- **XSS 防护** - HTML 内容过滤和转义
- **加密分享** - 分享链接支持提取码保护
- **访问控制** - 支持分享过期时间和访问次数限制

## 🎨 自定义

### 修改主题颜色

编辑 `assets/css/style.css` 文件中的 CSS 变量：

```css
:root {
    --primary-color: #667eea;
    --primary-hover: #5568d3;
    --secondary-color: #764ba2;
    --background: #f8f9fa;
    --sidebar-bg: #ffffff;
    --text-primary: #333333;
    --text-secondary: #666666;
    --text-muted: #999999;
    --border-color: #e1e4e8;
}
```

### 修改上传限制

编辑 `config.php` 文件：

```php
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
```

### 调整每页显示数量

在设置页面中可以直接调整每页显示的笔记数量（10/20/30/50条）。

## 🛠️ 技术栈

- **后端**: PHP 7.4+ + SQLite 3
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **编辑器**: Vditor (Markdown 编辑器)
- **解析**: Marked.js (Markdown 解析) + Prism.js (代码高亮)

> 📦 所有前端依赖已本地化，无需外部CDN，可离线使用

## 📸 功能截图

### 主界面
- 简洁的笔记列表
- 侧边栏标签管理
- 日历视图

### 编辑器
- 支持 Markdown 即时渲染
- 工具栏快捷操作
- 附件上传

### 统计分析
- 写作热图
- 多维度统计数据
- 热门标签

### 分享管理
- 分享列表
- 搜索和筛选
- 批量操作

## 🎯 亮点功能

- **智能编辑器** - 基于 Vditor，支持即时渲染模式，类似 Typora 体验
- **交互式待办** - 浏览模式下直接点击复选框切换状态，自动保存
- **内容筛选** - 按类型筛选（置顶、链接、待办、代码），实时统计
- **加密分享** - 支持提取码保护，可设置过期时间和访问限制
- **统计分析** - 使用天数、记录统计、写作热图、热门标签
- **附件管理** - 按类型筛选，删除前检查引用，图片灯箱预览
- **数据安全** - 手动备份恢复，备份文件管理，数据导出

## 📱 响应式设计

完美适配各种设备：
- 💻 **桌面端** - 完整功能体验
- 📱 **移动端** - 优化的触摸操作
- 🖥️ **平板** - 自适应布局

## 🚀 安装说明

### 环境要求
- PHP 7.4 或更高版本
- PDO SQLite 扩展
- 文件系统可写权限

> 💡 **重要提示**: 程序已包含所有依赖文件，下载后即可直接使用，无需额外安装任何依赖。

### 快速安装

1. **启动服务器**
   ```bash
   # Windows
   双击 run.bat
   
   # Mac/Linux
   php -S localhost:8080
   ```

   ##### 推荐：直接用PHP虚拟机，网上便宜的价格大概10元一年；或者NAS等设备部署

2. **访问安装页面**
   ```
   http://localhost:8080/install.php
   ```

3. **完成安装**
   - 设置管理员用户名和密码
   - 点击"开始安装"
   - 等待安装完成
   - 点击"进入 LightMemos"

4. **开始使用**
   ```
   http://localhost:8080/
   ```

## 🔐 安全建议

- **修改默认密码** - 安装后立即修改管理员密码
- **配置 HTTPS** - 使用 SSL 证书保护数据传输
- **定期备份** - 建议定期备份数据库
- **更新 PHP** - 保持 PHP 版本更新，修复安全漏洞

## 🎯 设计理念

- **轻量级** - 无需复杂的数据库配置，开箱即用
- **简洁** - 专注于笔记本身，去除冗余功能
- **高效** - 快速响应，流畅体验
- **安全** - 数据本地存储，完全掌控
- **美观** - 现代化设计，赏心悦目

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 贡献流程

1. Fork 本仓库
2. 创建新分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 开源许可

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 灵感来源：[Memos](https://github.com/usememos/memos)
- Markdown 编辑器：[Vditor](https://b3log.org/vditor/)
- Markdown 解析：[Marked.js](https://marked.js.org/)
- 代码高亮：[Prism.js](https://prismjs.com/)

## 💬 反馈与支持

如有问题、建议或功能请求，请提交 Issue。

## 🌟 Star History

如果这个项目对你有帮助，欢迎 Star ⭐️

---

**LightMemos** - 轻量、简洁、高效的笔记管理系统

Made with ❤️ by Hik
