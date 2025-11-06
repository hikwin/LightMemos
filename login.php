<?php
/**
 * 登录页面
 */

session_start();

// 检查是否已登录
if (isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

// 检查是否已安装
$configFile = 'config.php';
if (!file_exists($configFile)) {
    header('Location: install.php');
    exit;
}

require_once $configFile;
require_once 'includes/functions.php';

$errorMessage = '';

// 处理登录
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    try {
        $username = trim($_POST['username']);
        $password = $_POST['password'];
        
        if (empty($username) || empty($password)) {
            throw new Exception('用户名和密码不能为空');
        }
        
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            // 登录成功
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['email'] = $user['email'];
            
            // 更新最后登录时间
            $stmt = $db->prepare("UPDATE users SET last_login = datetime('now', 'localtime') WHERE id = ?");
            $stmt->execute([$user['id']]);
            
            header('Location: index.php');
            exit;
        } else {
            throw new Exception('用户名或密码错误');
        }
        
    } catch (Exception $e) {
        $errorMessage = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - Memos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 400px;
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
        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #333;
        }
        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="text"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #5568d3;
        }
        .error {
            background: #f8d7da;
            border: 1px solid #dc3545;
            color: #721c24;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .links {
            margin-top: 20px;
            font-size: 14px;
            color: #666;
        }
        .links a {
            color: #667eea;
            text-decoration: none;
        }
        .links a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📝 Memos</h1>
        <p class="subtitle">轻量级笔记管理系统</p>
        
        <?php if ($errorMessage): ?>
            <div class="error">
                <?php echo htmlspecialchars($errorMessage); ?>
            </div>
        <?php endif; ?>
        
        <form method="POST">
            <div class="form-group">
                <label for="username">用户名</label>
                <input type="text" id="username" name="username" required 
                       value="<?php echo isset($_POST['username']) ? htmlspecialchars($_POST['username']) : ''; ?>">
            </div>
            
            <div class="form-group">
                <label for="password">密码</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit" name="login" class="btn">
                登录
            </button>
        </form>
        
        <div class="links">
            <a href="install.php">重新安装</a>
        </div>
    </div>
</body>
</html>
