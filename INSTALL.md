# Memos 安装指南

## 环境要求

- PHP 7.4 或更高版本
- PDO SQLite 扩展
- Apache 或 Nginx 服务器
- 推荐使用 XAMPP、WAMP 或 PhpStudy

## 安装步骤

### 1. 检查 PHP 环境

确保你的服务器已安装 PHP 并启用了 SQLite 扩展。你可以创建一个 `phpinfo.php` 文件来检查：

```php
<?php phpinfo(); ?>
```

查找 `PDO` 和 `pdo_sqlite` 扩展是否已启用。

### 2. 上传文件

将所有文件上传到你的 Web 服务器目录。例如：

- **本地环境**: `C:\xampp\htdocs\memos\`
- **服务器**: `/var/www/html/memos/` 或 `/home/username/public_html/`

### 3. 设置文件权限（仅限 Linux）

如果你使用 Linux 服务器，需要设置正确的文件权限：

```bash
cd /path/to/memos
chmod 755 .
chmod 644 *.php
chmod 755 includes
chmod 644 includes/*.php
chmod 755 assets assets/css assets/js
chmod 644 assets/css/* assets/js/*
chmod 777 data
chmod 777 uploads
```

### 4. 访问安装向导

在浏览器中访问：

```
http://localhost/memos/
```

或

```
http://your-domain.com/
```

### 5. 跟随安装向导

系统会自动检测是否已安装，如果未安装，会跳转到安装向导。

安装向导将会：

1. 显示功能特性和系统要求
2. 创建必要的目录结构
3. 生成随机命名的 SQLite 数据库文件
4. 初始化数据库表结构
5. 创建配置文件 `config.php`
6. 设置安全保护（.htaccess）

### 6. 完成安装

安装完成后，系统会自动跳转到主界面，你就可以开始使用了！

## 常见问题

### Q: 安装后显示空白页面

**A**: 检查以下几点：
- 确保 PHP 错误日志，查看是否有错误
- 检查 `config.php` 文件是否已生成
- 确保 `data/` 和 `uploads/` 目录有写权限

### Q: 无法上传文件

**A**: 
- 检查 `uploads/` 目录的写权限（Linux: `chmod 777 uploads`）
- 检查 PHP 配置中的 `upload_max_filesize` 和 `post_max_size`
- 查看 PHP 错误日志

### Q: 数据库文件在哪里？

**A**: 
- 数据库文件位于 `data/` 目录
- 文件名格式为 `memos_[随机字符].db`
- 该目录受 `.htaccess` 保护，无法直接访问

### Q: 如何备份数据？

**A**: 
只需备份以下内容：
- `data/` 目录（包含数据库）
- `uploads/` 目录（包含上传的文件）
- `config.php` 文件（包含配置信息）

### Q: 如何迁移到新服务器？

**A**: 
1. 备份上述文件和目录
2. 在新服务器上上传所有文件
3. 确保 `data/` 和 `uploads/` 目录有正确的权限
4. 访问网站，应该可以直接使用

### Q: 忘记了怎么访问安装页面？

**A**: 
删除 `config.php` 文件，然后再次访问网站，会自动跳转到安装向导。

注意：这会清除配置，但不会删除数据库。如果你想要重新安装，需要同时删除 `data/` 目录。

## Apache 配置

如果你使用 Apache，`.htaccess` 文件应该会自动工作。如果不行，检查：

1. 确保 Apache 已启用 `mod_rewrite` 模块
2. 确保目录的 `AllowOverride` 设置为 `All`

在 Apache 配置文件中：

```apache
<Directory "/path/to/memos">
    AllowOverride All
    Require all granted
</Directory>
```

## Nginx 配置

如果你使用 Nginx，需要手动配置。在你的站点配置中添加：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/memos;
    index index.php;

    # 保护敏感文件
    location ~ /(config\.php|data/.*) {
        deny all;
        return 403;
    }

    # PHP 处理
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|webp|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 安全建议

1. **定期备份数据库和上传文件**
2. **使用 HTTPS 连接**（推荐使用 Let's Encrypt 免费证书）
3. **不要在生产环境中显示 PHP 错误**
4. **定期更新 PHP 版本**
5. **限制 `uploads/` 目录的可执行权限**

## 性能优化

1. **启用 PHP OPcache**
2. **使用 Gzip 压缩**（已在 .htaccess 中配置）
3. **启用浏览器缓存**（已在 .htaccess 中配置）
4. **定期优化 SQLite 数据库**：
   ```php
   // 在 PHP 中执行
   $db->exec('VACUUM');
   ```

## 故障排除

### 启用 PHP 错误显示（仅用于调试）

在 `index.php` 的开头添加：

```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

**警告**：调试完成后请删除这些代码！

### 检查文件权限

```bash
ls -la data/
ls -la uploads/
```

确保 Web 服务器用户（通常是 `www-data` 或 `apache`）有读写权限。

### 重新安装

1. 备份 `data/` 和 `uploads/` 目录
2. 删除 `config.php`
3. 访问网站重新安装
4. 将备份的目录恢复回来

## 获取帮助

如果遇到问题：

1. 查看 PHP 错误日志
2. 查看 Apache/Nginx 错误日志
3. 确认环境符合要求
4. 检查文件权限
5. 提交 Issue 到项目仓库

---

祝你使用愉快！🎉

