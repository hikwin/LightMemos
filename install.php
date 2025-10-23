<?php
/**
 * 安装程序 - 完全避免重定向
 * 直接访问：http://localhost:8080/install.php
 */

// 禁用所有可能的输出缓冲和重定向
if (ob_get_level()) {
    ob_end_clean();
}

// 设置错误报告
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 检查是否已安装
$configFile = 'config.php';
$isInstalled = file_exists($configFile);

// 处理安装
$installSuccess = false;
$errorMessage = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['install'])) {
    try {
        // 获取表单数据
        $username = trim($_POST['username']);
        $password = $_POST['password'];
        $email = trim($_POST['email']);
        $siteName = trim($_POST['site_name']);
        
        // 验证输入
        if (empty($username) || empty($password)) {
            throw new Exception('用户名和密码不能为空');
        }
        
        if (strlen($password) < 6) {
            throw new Exception('密码长度至少6位');
        }
        
        if (empty($siteName)) {
            $siteName = 'Memos';
        }
        
        // 创建目录
        if (!is_dir('data')) {
            mkdir('data', 0755, true);
        }
        if (!is_dir('uploads')) {
            mkdir('uploads', 0755, true);
        }
        
        // 生成随机数据库文件名
        $dbName = 'memos_' . bin2hex(random_bytes(8)) . '.db';
        $dbPath = 'data/' . $dbName;
        
        // 创建数据库
        $db = new PDO('sqlite:' . $dbPath);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // 创建表
        $db->exec("
            CREATE TABLE memos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                pinned INTEGER DEFAULT 0,
                archived INTEGER DEFAULT 0,
                visibility TEXT DEFAULT 'private'
            );
            
            CREATE TABLE tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE memo_tags (
                memo_id INTEGER,
                tag_id INTEGER,
                FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (memo_id, tag_id)
            );
            
            CREATE TABLE attachments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                memo_id INTEGER,
                filename TEXT NOT NULL,
                original_name TEXT NOT NULL,
                file_type TEXT,
                file_size INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
            );
            
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
            
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            );
            
            CREATE TABLE shares (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE NOT NULL,
                memo_id INTEGER NOT NULL,
                encrypted INTEGER NOT NULL DEFAULT 0,
                passcode_hash TEXT,
                expires_at TEXT,
                max_visits INTEGER,
                visit_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
            );
            
            CREATE TABLE api_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                expires_at DATETIME,
                last_used_at DATETIME,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        ");
        
        // 插入默认设置
        $db->prepare("INSERT INTO settings (key, value) VALUES (?, ?)")->execute(['site_name', $siteName]);
        $db->prepare("INSERT INTO settings (key, value) VALUES (?, ?)")->execute(['version', '1.0.0']);
        
        // 创建管理员用户
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)");
        $stmt->execute([$username, $passwordHash, $email]);
        
        // 创建配置文件
        $config = "<?php\n";
        $config .= "define('DB_PATH', __DIR__ . '/{$dbPath}');\n";
        $config .= "define('UPLOAD_DIR', __DIR__ . '/uploads/');\n";
        $config .= "define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024);\n";
        $config .= "define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);\n";
        $config .= "date_default_timezone_set('Asia/Shanghai');\n";
        
        file_put_contents($configFile, $config);
        
        // 创建保护文件
        file_put_contents('data/.htaccess', "deny from all\n");
        file_put_contents('uploads/.htaccess', "Order Allow,Deny\nAllow from all\n");
        
        $installSuccess = true;
        
    } catch (Exception $e) {
        $errorMessage = '安装失败: ' . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memos 安装</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        .status {
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 1.1em;
        }
        .success {
            background: #d4edda;
            border: 2px solid #28a745;
            color: #155724;
        }
        .error {
            background: #f8d7da;
            border: 2px solid #dc3545;
            color: #721c24;
        }
        .info {
            background: #d1ecf1;
            border: 2px solid #17a2b8;
            color: #0c5460;
        }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 1.1em;
            font-weight: 600;
            margin: 10px;
            transition: all 0.3s;
            border: none;
            cursor: pointer;
        }
        .btn:hover {
            background: #5568d3;
            transform: translateY(-2px);
        }
        .btn-success {
            background: #28a745;
        }
        .btn-success:hover {
            background: #218838;
        }
        .features {
            text-align: left;
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .features h3 {
            margin-bottom: 15px;
            color: #333;
        }
        .features ul {
            list-style: none;
            padding: 0;
        }
        .features li {
            padding: 5px 0;
            color: #666;
        }
        .features li:before {
            content: "✓ ";
            color: #28a745;
            font-weight: bold;
        }
        .env-check {
            text-align: left;
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .env-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .env-item:last-child {
            border-bottom: none;
        }
        .ok { color: #28a745; font-weight: bold; }
        .fail { color: #dc3545; font-weight: bold; }
        .warning { color: #ffc107; font-weight: bold; }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📝 Memos</h1>
        <p class="subtitle">轻量级笔记管理系统</p>
        
        <?php if ($installSuccess): ?>
            <div class="status success">
                <h2>🎉 安装成功！</h2>
                <p>系统已成功安装，管理员账户已创建。</p>
                <p style="margin-top: 10px; font-size: 0.9em;">
                    现在可以使用管理员账户登录系统。
                </p>
            </div>
            
            <a href="login.php" class="btn btn-success">立即登录 →</a>
            
        <?php elseif ($isInstalled): ?>
            <div class="status info">
                <h2>ℹ️ 系统已安装</h2>
                <p>检测到配置文件已存在。</p>
            </div>
            
            <a href="login.php" class="btn">登录系统</a>
            
        <?php else: ?>
            <!-- 安装表单 -->
            <h2>🚀 安装 Memos</h2>
            <p class="subtitle">轻量级笔记管理系统</p>
            
            <?php if ($errorMessage): ?>
                <div class="status error">
                    <h3>❌ 安装失败</h3>
                    <p><?php echo htmlspecialchars($errorMessage); ?></p>
                </div>
            <?php endif; ?>
            
            <div class="features">
                <h3>✨ 功能特性</h3>
                <ul>
                    <li>Markdown 语法支持</li>
                    <li>代码语法高亮</li>
                    <li>标签管理系统</li>
                    <li>图片和附件上传</li>
                    <li>全文搜索</li>
                    <li>笔记置顶</li>
                    <li>统计分析</li>
                    <li>用户认证系统</li>
                    <li>响应式设计</li>
                </ul>
            </div>
            
            <div class="env-check">
                <h3>🔍 环境检查</h3>
                <div class="env-item">
                    <span>PHP 版本</span>
                    <span class="<?php echo version_compare(PHP_VERSION, '7.4.0', '>=') ? 'ok' : 'warning'; ?>">
                        <?php echo PHP_VERSION; ?>
                    </span>
                </div>
                <div class="env-item">
                    <span>PDO SQLite</span>
                    <span class="<?php echo extension_loaded('pdo_sqlite') ? 'ok' : 'fail'; ?>">
                        <?php echo extension_loaded('pdo_sqlite') ? '已启用' : '未启用'; ?>
                    </span>
                </div>
                <div class="env-item">
                    <span>文件上传</span>
                    <span class="<?php echo ini_get('file_uploads') ? 'ok' : 'fail'; ?>">
                        <?php echo ini_get('file_uploads') ? '已启用' : '未启用'; ?>
                    </span>
                </div>
                <div class="env-item">
                    <span>最大上传</span>
                    <span class="ok"><?php echo ini_get('upload_max_filesize'); ?></span>
                </div>
            </div>
            
            <?php if (extension_loaded('pdo_sqlite')): ?>
                <form method="POST" style="text-align: left; margin-top: 30px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">网站名称</label>
                        <input type="text" name="site_name" value="Memos" required 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">管理员用户名</label>
                        <input type="text" name="username" required 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">管理员密码</label>
                        <input type="password" name="password" required minlength="6"
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px;">
                        <small style="color: #666; font-size: 14px;">密码长度至少6位</small>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">邮箱地址（可选）</label>
                        <input type="email" name="email" 
                               style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px;">
                    </div>
                    
                    <button type="submit" name="install" class="btn" style="width: 100%;">
                        开始安装
                    </button>
                </form>
            <?php else: ?>
                <div class="status error">
                    <p>请先启用 PDO SQLite 扩展</p>
                </div>
            <?php endif; ?>
            
        <?php endif; ?>
        
    </div>
</body>
</html>
