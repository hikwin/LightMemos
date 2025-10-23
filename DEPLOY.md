# LightMemos 部署指南

本文档介绍如何在不同的Web服务器环境中部署LightMemos。

## 📋 目录

- [Apache 服务器](#apache-服务器)
- [Nginx 服务器](#nginx-服务器)
- [共享主机部署](#共享主机部署)
- [故障排查](#故障排查)

## Apache 服务器

### 环境要求

- Apache 2.2 或 2.4
- PHP 7.4+ (推荐 8.0+)
- mod_rewrite 模块（可选）
- AllowOverride All（允许使用.htaccess）

### 部署步骤

1. **上传文件**
   ```bash
   # 将所有文件上传到网站根目录
   ```

2. **设置目录权限**
   ```bash
   chmod 755 data/ uploads/ backups/
   chmod 644 .htaccess
   chmod 644 *.php
   ```

3. **检查 .htaccess**
   - 已包含兼容 Apache 2.2 和 2.4 的配置
   - 如果遇到500错误，检查Apache配置是否允许 `AllowOverride All`

4. **PHP 配置**
   
   **如果是 Apache 模块模式**：
   - `.htaccess` 中的 `php_value` 指令会生效
   
   **如果是 CGI/FastCGI 模式**：
   - 使用项目根目录的 `.user.ini` 文件
   - 某些主机可能需要等待5分钟才能生效

5. **访问安装页面**
   ```
   http://your-domain.com/install.php
   ```

### Apache 配置检查

确保你的Apache虚拟主机配置中包含：

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/LightMemos
    
    <Directory /path/to/LightMemos>
        AllowOverride All
        Require all granted
        # 或对于 Apache 2.2:
        # Order allow,deny
        # Allow from all
    </Directory>
    
    # 错误日志
    ErrorLog ${APACHE_LOG_DIR}/lightmemos-error.log
    CustomLog ${APACHE_LOG_DIR}/lightmemos-access.log combined
</VirtualHost>
```

### 常见问题

**500 Internal Server Error**
- 检查 `.htaccess` 语法
- 查看 Apache 错误日志: `tail -f /var/log/apache2/error.log`
- 尝试禁用 `.htaccess`: `mv .htaccess .htaccess.disabled`

**文件上传失败**
- 检查 `uploads/` 目录权限: `chmod 777 uploads/`
- 修改 `php.ini` 或使用 `.user.ini` 增加上传限制

## Nginx 服务器

### 环境要求

- Nginx 1.18+
- PHP-FPM 7.4+ (推荐 8.0+)
- PDO SQLite 扩展

### 部署步骤

1. **上传文件**
   ```bash
   # 上传到网站目录，例如
   /var/www/lightmemos
   ```

2. **设置目录权限**
   ```bash
   # 设置所有者为 www-data（或你的 PHP-FPM 用户）
   chown -R www-data:www-data /var/www/lightmemos
   
   # 设置权限
   find /var/www/lightmemos -type d -exec chmod 755 {} \;
   find /var/www/lightmemos -type f -exec chmod 644 {} \;
   
   # data、uploads、backups 目录需要可写
   chmod 777 /var/www/lightmemos/data
   chmod 777 /var/www/lightmemos/uploads
   chmod 777 /var/www/lightmemos/backups
   ```

3. **配置 Nginx**
   
   编辑 Nginx 配置文件（通常在 `/etc/nginx/sites-available/` 下）：
   
   ```bash
   sudo nano /etc/nginx/sites-available/lightmemos
   ```
   
   复制 `nginx.conf.example` 的内容并修改：
   - 将 `your-domain.com` 改为你的域名
   - 将 `/path/to/LightMemos` 改为实际路径
   - 根据你的PHP版本调整 `fastcgi_pass`

4. **启用网站**
   ```bash
   sudo ln -s /etc/nginx/sites-available/lightmemos /etc/nginx/sites-enabled/
   sudo nginx -t  # 测试配置
   sudo systemctl reload nginx
   ```

5. **配置 PHP-FPM**
   
   编辑 PHP-FPM 池配置（例如 `/etc/php/7.4/fpm/pool.d/www.conf`）：
   
   ```ini
   ; 确保以下设置足够大
   php_admin_value[upload_max_filesize] = 10M
   php_admin_value[post_max_size] = 10M
   php_admin_value[memory_limit] = 128M
   php_admin_value[max_execution_time] = 30
   ```
   
   重启 PHP-FPM:
   ```bash
   sudo systemctl restart php7.4-fpm
   ```

6. **访问安装页面**
   ```
   http://your-domain.com/install.php
   ```

### Nginx 关键配置说明

```nginx
# 保护敏感文件
location ~ ^/(config\.php|\.htaccess|\.git) {
    deny all;
    return 404;
}

# 保护数据目录
location ^~ /data/ {
    deny all;
    return 404;
}

# PHP 处理
location ~ \.php$ {
    try_files $uri =404;
    fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

## 共享主机部署

大多数共享主机使用 Apache + CGI/FastCGI 模式。

### 部署步骤

1. **上传文件**
   - 通过 FTP/SFTP 上传所有文件到 `public_html` 或网站根目录

2. **检查 PHP 版本**
   - 在主机控制面板中确认 PHP >= 7.4
   - 启用 PDO SQLite 扩展

3. **文件权限**
   - 大多数共享主机会自动设置正确的权限
   - 确保 `data/`、`uploads/`、`backups/` 可写

4. **PHP 配置**
   - `.user.ini` 文件会自动生效（可能需要5分钟）
   - 或在主机控制面板中配置 PHP 设置

5. **访问安装**
   ```
   http://your-domain.com/install.php
   ```

### cPanel 用户

1. 通过 **文件管理器** 上传文件
2. 在 **MultiPHP INI编辑器** 中调整：
   - upload_max_filesize: 10M
   - post_max_size: 10M
   - max_execution_time: 30
3. 确保 **PHP版本** >= 7.4

## 故障排查

### Apache 500 错误

**问题1：`php_value` 指令导致500错误**

如果你的服务器使用 CGI/FastCGI 模式：

1. 编辑 `.htaccess`，注释掉 PHP 设置部分：
   ```apache
   # <IfModule mod_php7.c>
   #     php_value upload_max_filesize 10M
   #     ...
   # </IfModule>
   ```

2. 使用 `.user.ini` 文件（已创建）

**问题2：`<Directory>` 指令导致500错误**

`.htaccess` 文件中不应该包含 `<Directory>` 指令（已修复）。

**问题3：`Options` 指令被禁止**

如果主机不允许修改 Options：

1. 编辑 `.htaccess`，注释掉：
   ```apache
   # Options +FollowSymLinks
   # Options -Indexes
   ```

**查看错误日志**
```bash
# Linux
tail -f /var/log/apache2/error.log

# cPanel
在控制面板的"错误日志"中查看
```

### Nginx 常见问题

**问题1：404 Not Found**

检查 `try_files` 配置：
```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

**问题2：文件上传失败**

增加 Nginx 上传限制：
```nginx
client_max_body_size 10M;
```

同时检查 PHP-FPM 配置：
```ini
upload_max_filesize = 10M
post_max_size = 10M
```

**问题3：502 Bad Gateway**

检查 PHP-FPM 是否运行：
```bash
sudo systemctl status php7.4-fpm
sudo systemctl restart php7.4-fpm
```

检查 `fastcgi_pass` 路径是否正确。

### 文件权限问题

**数据库无法创建/写入**
```bash
chmod 777 data/
chmod 666 data/*.db  # 如果数据库文件已存在
```

**附件上传失败**
```bash
chmod 777 uploads/
```

**备份失败**
```bash
chmod 777 backups/
```

### PHP 扩展检查

**检查 PDO SQLite 是否启用**
```bash
php -m | grep pdo_sqlite
```

如果没有输出，需要启用扩展：
```bash
# Ubuntu/Debian
sudo apt-get install php-sqlite3

# CentOS/RHEL
sudo yum install php-pdo

# 重启服务
sudo systemctl restart apache2  # 或 php-fpm
```

## 性能优化

### Apache + mod_php

启用 OPcache:
```apache
<IfModule mod_php7.c>
    php_value opcache.enable 1
    php_value opcache.memory_consumption 128
</IfModule>
```

### Nginx + PHP-FPM

优化 PHP-FPM 池配置 (`/etc/php/7.4/fpm/pool.d/www.conf`):
```ini
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
```

### 启用 Gzip 压缩

**Apache** (`.htaccess`):
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

**Nginx** (nginx.conf):
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

## 安全加固

### 1. 使用 HTTPS

**Let's Encrypt 免费证书**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. 限制访问

**仅允许特定IP访问管理功能** (Nginx):
```nginx
location ~ ^/(install\.php|backup) {
    allow 192.168.1.100;  # 你的IP
    deny all;
}
```

### 3. 隐藏 PHP 版本

**Apache**:
```apache
ServerTokens Prod
ServerSignature Off
```

**Nginx**:
```nginx
server_tokens off;
```

### 4. 定期备份

设置 cron 任务自动备份：
```bash
# 每天凌晨2点备份
0 2 * * * cd /var/www/lightmemos && php -r "require 'api.php'; handleBackup(\$db, 'GET');"
```

## 测试部署

### 1. 访问首页
```
http://your-domain.com/
```
应该显示安装页面或登录页面。

### 2. 测试文件上传
- 创建笔记
- 上传图片附件
- 检查 `uploads/` 目录中是否有文件

### 3. 测试数据库
- 创建几条笔记
- 检查 `data/` 目录中的数据库文件

### 4. 测试备份
- 在设置中创建备份
- 检查 `backups/` 目录

## 生产环境建议

### ✅ 必须做的

1. **修改默认密码** - 安装后立即修改
2. **启用 HTTPS** - 保护数据传输
3. **定期备份** - 每天自动备份数据库
4. **更新 PHP** - 保持最新的安全补丁

### 🔒 推荐做的

1. **限制安装页面访问** - 安装后删除或重命名 `install.php`
2. **配置防火墙** - 只开放必要的端口
3. **监控日志** - 定期检查错误日志
4. **文件权限最小化** - 不要给777权限

### ⚡ 性能优化

1. **启用 OPcache** - 提升PHP性能
2. **使用 CDN** - 加速静态资源
3. **启用 Gzip** - 压缩传输内容
4. **浏览器缓存** - 设置静态资源缓存

## 更新升级

### 备份数据
```bash
# 备份数据库
cp data/*.db backup-$(date +%Y%m%d).db

# 备份配置文件
cp config.php config.php.backup
```

### 更新文件
```bash
# 上传新版本文件，保留：
# - config.php
# - data/
# - uploads/
# - backups/
```

### 清除缓存
```bash
# 重启 PHP-FPM (Nginx)
sudo systemctl restart php-fpm

# 重启 Apache
sudo systemctl restart apache2
```

## 卸载程序

如果需要完全删除 LightMemos：

```bash
# 1. 备份数据（如果需要）
tar -czf lightmemos-backup.tar.gz data/ uploads/ backups/

# 2. 删除所有文件
rm -rf /path/to/LightMemos

# 3. 删除 Nginx 配置
sudo rm /etc/nginx/sites-enabled/lightmemos
sudo systemctl reload nginx

# 4. 删除 Apache 虚拟主机
sudo a2dissite lightmemos
sudo systemctl reload apache2
```

## 联系支持

如果遇到部署问题：

1. 查看 [故障排查](#故障排查) 部分
2. 检查服务器错误日志
3. 提交 Issue 到 GitHub，包含：
   - 服务器类型（Apache/Nginx）
   - PHP 版本
   - 错误信息
   - 错误日志内容

---

**祝你部署顺利！** 🚀

